"""Convertit un modèle KataGo .bin.gz (réseau résiduel classique, versions 8-10) en ONNX.
Entrées : bin_input [N,C,H,W], global_input [N,G]. Sorties : policy [N,P,H*W], policy_pass [N,P],
value [N,3], score_value [N,S], ownership [N,1,H,W] (bruts, avant post-traitement)."""
import gzip, sys, struct, numpy as np, onnx
from onnx import helper, TensorProto, numpy_helper

class Reader:
    def __init__(self, data): self.d = data; self.i = 0
    def tok(self):
        d = self.d; n = len(d)
        while self.i < n and d[self.i] in b" \t\r\n": self.i += 1
        s = self.i
        while self.i < n and d[self.i] not in b" \t\r\n": self.i += 1
        return d[s:self.i].decode()
    def int(self): return int(self.tok())
    def float(self): return float(self.tok())
    def floats(self, n):
        k = 0
        while self.d[self.i:self.i + 1] != b"@":
            self.i += 1; k += 1
            assert k < 100, "pas de bloc binaire"
        assert self.d[self.i:self.i + 5] == b"@BIN@", self.d[self.i:self.i + 10]
        self.i += 5
        a = np.frombuffer(self.d, dtype="<f4", count=n, offset=self.i).copy(); self.i += 4 * n
        a[np.abs(a) < 1.2e-38] = 0
        return a

def conv(r):
    name = r.tok(); ky = r.int(); kx = r.int(); ic = r.int(); oc = r.int(); dy = r.int(); dx = r.int()
    assert dy == 1 and dx == 1
    w = r.floats(ky * kx * ic * oc).reshape(ky, kx, ic, oc).transpose(3, 2, 0, 1)
    return dict(kind="conv", name=name, w=np.ascontiguousarray(w), k=ky, ic=ic, oc=oc)
def bn(r):
    name = r.tok(); c = r.int(); eps = r.float(); hs = r.int(); hb = r.int()
    mean = r.floats(c); var = r.floats(c)
    scale = r.floats(c) if hs else np.ones(c, "f4"); bias = r.floats(c) if hb else np.zeros(c, "f4")
    ms = scale / np.sqrt(var + eps)
    return dict(kind="bn", name=name, scale=ms.astype("f4"), bias=(bias - mean * ms).astype("f4"), c=c)
def act(r, ver):
    name = r.tok(); kind = "ACTIVATION_RELU"
    if ver >= 11: kind = r.tok()
    return kind
def matmul(r):
    name = r.tok(); ic = r.int(); oc = r.int()
    return dict(name=name, w=r.floats(ic * oc).reshape(ic, oc), ic=ic, oc=oc)
def matbias(r):
    name = r.tok(); c = r.int()
    return dict(name=name, b=r.floats(c))

def parse(path):
    data = gzip.open(path).read()
    r = Reader(data)
    m = {}
    m["name"] = r.tok(); ver = m["version"] = r.int()
    assert 8 <= ver <= 11, ver
    m["nin"] = r.int(); m["nglob"] = r.int()
    # tronc
    r.tok(); nb = r.int(); tc = r.int(); mc = r.int(); rc = r.int(); dc = r.int(); gc = r.int()
    m["initConv"] = conv(r); m["initMatMul"] = matmul(r)
    blocks = []
    for _ in range(nb):
        kind = r.tok()
        if kind == "ordinary_block":
            r.tok()
            b = dict(kind="ord", preBN=bn(r), preAct=act(r, ver), conv1=conv(r), midBN=bn(r), midAct=act(r, ver), conv2=conv(r))
        elif kind == "gpool_block":
            r.tok()
            b = dict(kind="gpool", preBN=bn(r), preAct=act(r, ver), conv1=conv(r), gconv=conv(r), gBN=bn(r), gAct=act(r, ver),
                     gmul=matmul(r), midBN=bn(r), midAct=act(r, ver), conv2=conv(r))
        else:
            raise ValueError(kind)
        blocks.append(b)
    m["blocks"] = blocks
    m["tipBN"] = bn(r); m["tipAct"] = act(r, ver)
    # tête de politique
    r.tok()
    m["p1"] = conv(r); m["g1"] = conv(r); m["g1BN"] = bn(r); m["g1Act"] = act(r, ver); m["gpoolToBias"] = matmul(r)
    m["p1BN"] = bn(r); m["p1Act"] = act(r, ver); m["p2"] = conv(r); m["passMul"] = matmul(r)
    # tête de valeur
    r.tok()
    m["v1"] = conv(r); m["v1BN"] = bn(r); m["v1Act"] = act(r, ver); m["v2"] = matmul(r); m["v2b"] = matbias(r); m["v2Act"] = act(r, ver)
    m["v3"] = matmul(r); m["v3b"] = matbias(r); m["sv3"] = matmul(r); m["sv3b"] = matbias(r); m["own"] = conv(r)
    rest = data[r.i:].strip()
    assert len(rest) == 0, ("octets restants", len(rest), rest[:80])
    return m

class G:
    def __init__(self, fp16):
        self.nodes = []; self.inits = []; self.n = 0; self.fp16 = fp16
    def nm(self, p): self.n += 1; return f"{p}_{self.n}"
    def const(self, arr, p="w"):
        name = self.nm(p); arr = np.asarray(arr, "f4")
        if self.fp16 and arr.size > 64:
            self.inits.append(numpy_helper.from_array(arr.astype(np.float16), name + "_h"))
            self.nodes.append(helper.make_node("Cast", [name + "_h"], [name], to=TensorProto.FLOAT))
        else:
            self.inits.append(numpy_helper.from_array(arr, name))
        return name
    def ci64(self, vals):
        name = self.nm("c"); self.inits.append(numpy_helper.from_array(np.array(vals, "i8"), name)); return name
    def op(self, t, ins, **kw):
        out = self.nm(t.lower()); self.nodes.append(helper.make_node(t, ins, [out], **kw)); return out
    def conv(self, x, c):
        p = c["k"] // 2
        return self.op("Conv", [x, self.const(c["w"])], pads=[p, p, p, p], kernel_shape=[c["k"], c["k"]])
    def bnact(self, x, b, act=True):
        s = self.const(b["scale"].reshape(1, -1, 1, 1), "s"); bb = self.const(b["bias"].reshape(1, -1, 1, 1), "b")
        y = self.op("Add", [self.op("Mul", [x, s]), bb])
        return self.op("Relu", [y]) if act else y
    def gpool(self, x, sqrtArea, value=False):
        mean = self.op("ReduceMean", [x, self.ci64([2, 3])], keepdims=0)  # [N,C]
        f = self.op("Mul", [self.op("Sub", [sqrtArea, self.const(np.array([14.0], "f4"))]), self.const(np.array([0.1], "f4"))])  # [1]
        m2 = self.op("Mul", [mean, f])
        if value:
            f3 = self.op("Sub", [self.op("Mul", [f, f]), self.const(np.array([0.1], "f4"))])
            third = self.op("Mul", [mean, f3])
        else:
            third = self.op("ReduceMax", [x, self.ci64([2, 3])], keepdims=0)
        return self.op("Concat", [mean, m2, third], axis=1)
    def matmul(self, x, mm): return self.op("MatMul", [x, self.const(mm["w"])])
    def addbias(self, x, v):  # v: [N,C] -> broadcast sur [N,C,H,W]
        return self.op("Add", [x, self.op("Unsqueeze", [v, self.ci64([2, 3])])])

def build(m, fp16=False):
    g = G(fp16)
    X = "bin_input"; GI = "global_input"
    shp = g.op("Shape", [X])
    hw = g.op("Slice", [shp, g.ci64([2]), g.ci64([4])])
    area = g.op("Cast", [g.op("ReduceProd", [hw], keepdims=1)], to=TensorProto.FLOAT)
    sqrtArea = g.op("Sqrt", [area])
    t = g.conv(X, m["initConv"])
    t = g.addbias(t, g.matmul(GI, m["initMatMul"]))
    for b in m["blocks"]:
        a = g.bnact(t, b["preBN"])
        r = g.conv(a, b["conv1"])
        if b["kind"] == "gpool":
            gg = g.bnact(g.conv(a, b["gconv"]), b["gBN"])
            r = g.addbias(r, g.matmul(g.gpool(gg, sqrtArea), b["gmul"]))
        r = g.conv(g.bnact(r, b["midBN"]), b["conv2"])
        t = g.op("Add", [t, r])
    t = g.bnact(t, m["tipBN"])
    # politique
    p1 = g.conv(t, m["p1"])
    g1 = g.bnact(g.conv(t, m["g1"]), m["g1BN"])
    g1p = g.gpool(g1, sqrtArea)
    p1 = g.bnact(g.addbias(p1, g.matmul(g1p, m["gpoolToBias"])), m["p1BN"])
    pol = g.conv(p1, m["p2"])
    pol = g.op("Flatten", [pol], axis=2) if False else g.op("Reshape", [pol, g.op("Concat", [g.op("Slice", [shp, g.ci64([0]), g.ci64([1])]), g.ci64([m["p2"]["oc"], -1])], axis=0)])
    g.nodes.append(helper.make_node("Identity", [pol], ["policy"]))
    g.nodes.append(helper.make_node("Identity", [g.matmul(g1p, m["passMul"])], ["policy_pass"]))
    # valeur
    v1 = g.bnact(g.conv(t, m["v1"]), m["v1BN"])
    v1p = g.gpool(v1, sqrtArea, value=True)
    v2 = g.op("Relu", [g.op("Add", [g.matmul(v1p, m["v2"]), g.const(m["v2b"]["b"])])])
    g.nodes.append(helper.make_node("Add", [g.matmul(v2, m["v3"]), g.const(m["v3b"]["b"])], ["value"]))
    g.nodes.append(helper.make_node("Add", [g.matmul(v2, m["sv3"]), g.const(m["sv3b"]["b"])], ["score_value"]))
    g.nodes.append(helper.make_node("Identity", [g.conv(v1, m["own"])], ["ownership"]))
    F = TensorProto.FLOAT
    inputs = [helper.make_tensor_value_info(X, F, ["N", m["nin"], "H", "W"]), helper.make_tensor_value_info(GI, F, ["N", m["nglob"]])]
    outputs = [helper.make_tensor_value_info("policy", F, ["N", m["p2"]["oc"], "HW"]), helper.make_tensor_value_info("policy_pass", F, ["N", m["passMul"]["oc"]]),
               helper.make_tensor_value_info("value", F, ["N", 3]), helper.make_tensor_value_info("score_value", F, ["N", m["sv3"]["oc"]]),
               helper.make_tensor_value_info("ownership", F, ["N", 1, "H", "W"])]
    graph = helper.make_graph(g.nodes, m["name"], inputs, outputs, g.inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 18)], producer_name="tengen-kata2onnx")
    model.ir_version = 9
    onnx.checker.check_model(model)
    return model

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    fp16 = "--fp16" in sys.argv
    m = parse(src)
    print(m["name"], "version", m["version"], "blocs", len(m["blocks"]), "entrées", m["nin"], m["nglob"],
          "politique", m["p2"]["oc"], "pass", m["passMul"]["oc"], "score", m["sv3"]["oc"])
    onnx.save(build(m, fp16), dst)
