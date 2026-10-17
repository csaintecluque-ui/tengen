/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
import { Brain } from "./brain";
import { Net, RawOutputs } from "../katago/net";
import { fromData, GameData } from "./serial";
import { mcSearch } from "./mcts";

const brain = new Brain();
let session: ort.InferenceSession | null = null;

type Req =
  | { id: number; type: "load"; modelUrl: string; wasmUrl: string }
  | { id: number; type: "genmove"; game: GameData; level: number }
  | { id: number; type: "evaluate"; game: GameData }
  | { id: number; type: "analyze"; game: GameData; visits: number; timeMs: number }
  | { id: number; type: "dead"; game: GameData }
  | { id: number; type: "ownership"; game: GameData }
  | { id: number; type: "review"; game: GameData }
  | { id: number; type: "mc"; game: GameData; timeMs: number };

const post = (m: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

async function fetchWithProgress(url: string, id: number): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try { cache = await caches.open("tengen-moteur"); const hit = await cache.match(url); if (hit) return await hit.arrayBuffer(); } catch { /* pas de cache */ }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("Téléchargement impossible (" + res.status + ")");
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let got = 0, lastSent = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    chunks.push(value); got += value.length;
    if (got - lastSent > 400000) { lastSent = got; post({ id, progress: total ? got / total : 0, bytes: got }); }
  }
  const buf = new Uint8Array(got); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
  try { await cache?.put(url, new Response(buf.slice().buffer, { headers: { "content-type": "application/octet-stream" } })); } catch { /* stockage plein */ }
  return buf.buffer;
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const m = ev.data;
  try {
    switch (m.type) {
      case "load": {
        if (session) { post({ id: m.id, result: true }); return; }
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths = m.wasmUrl.replace(/[^/]+$/, "");
        const model = await fetchWithProgress(m.modelUrl, m.id);
        post({ id: m.id, progress: 1, phase: "init" });
        session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
        const s = session;
        brain.net = new Net(async (bin, glob, n): Promise<RawOutputs> => {
          const o = await s.run({ bin_input: new ort.Tensor("float32", bin, [1, 22, n, n]), global_input: new ort.Tensor("float32", glob, [1, 19]) });
          return { policy: o.policy.data as Float32Array, pass: (o.policy_pass.data as Float32Array)[0], value: o.value.data as Float32Array, score: o.score_value.data as Float32Array, ownership: o.ownership.data as Float32Array };
        });
        post({ id: m.id, result: true });
        return;
      }
      case "genmove": post({ id: m.id, result: await brain.genmove(fromData(m.game), m.level) }); return;
      case "evaluate": post({ id: m.id, result: await brain.evaluate(fromData(m.game)) }); return;
      case "analyze": post({ id: m.id, result: await brain.analyze(fromData(m.game), m.visits, m.timeMs) }); return;
      case "dead": post({ id: m.id, result: await brain.deadStones(fromData(m.game)) }); return;
      case "ownership": post({ id: m.id, result: await brain.ownership(fromData(m.game)) }); return;
      case "mc": { const g = fromData(m.game); const r = mcSearch(g.board, g.toPlay, g.komi, { timeMs: m.timeMs }); post({ id: m.id, result: r }); return; }
      case "review": {
        if (!brain.net) { post({ id: m.id, result: null }); return; }
        const total = m.game.moves.length, out = [];
        for (let i = 0; i <= total; i++) {
          const g = fromData(m.game, i);
          const e = await brain.net.evaluate(g);
          const best = Array.from(e.policy.keys()).sort((a, b) => e.policy[b] - e.policy[a]).slice(0, 3);
          const sgn = g.toPlay === 1 ? 1 : -1;
          out.push({ winrateBlack: sgn === 1 ? e.winrate : 1 - e.winrate, leadBlack: sgn * e.lead, best, policy: i < total ? e.policy[idxOf(g, m.game.moves[i][1])] : 0 });
          post({ id: m.id, progress: (i + 1) / (total + 1) });
        }
        post({ id: m.id, result: out });
        return;
      }
    }
  } catch (e) {
    post({ id: m.id, error: e instanceof Error ? e.message : String(e) });
  }
};

function idxOf(g: { size: number; board: { x(p: number): number; y(p: number): number } }, p: number) {
  return p < 0 ? g.size * g.size : g.board.y(p) * g.size + g.board.x(p);
}
