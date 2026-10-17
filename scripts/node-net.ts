import * as ort from "onnxruntime-web";
import { readFileSync } from "fs";
import { Net, RawOutputs } from "../src/katago/net";
ort.env.wasm.numThreads = 1;
export async function makeNet(path = "public/models/kata-b15c192.onnx") {
  const sess = await ort.InferenceSession.create(readFileSync(path), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  return new Net(async (bin, glob, n): Promise<RawOutputs> => {
    const o = await sess.run({ bin_input: new ort.Tensor("float32", bin, [1, 22, n, n]), global_input: new ort.Tensor("float32", glob, [1, 19]) });
    return { policy: o.policy.data as Float32Array, pass: (o.policy_pass.data as Float32Array)[0], value: o.value.data as Float32Array, score: o.score_value.data as Float32Array, ownership: o.ownership.data as Float32Array };
  });
}
