import type { Game } from "../go/game";
import { toData } from "./serial";
import type { GenMoveResult } from "./brain";
import type { Evaluation } from "../katago/net";
import type { SearchResult } from "../katago/search";
import type { McResult } from "./mcts";

export type KataState = { status: "absent" } | { status: "loading"; progress: number; phase?: string } | { status: "ready" } | { status: "error"; message: string };
import type { ReviewPos } from "../store";

const BASE = import.meta.env.BASE_URL;
export const MODEL_URL = BASE + "models/kata-b15c192.onnx";
export const MODEL_MB = 20;
const WASM_URL = BASE + "ort/ort-wasm-simd-threaded.wasm";

class EngineClient {
  private w: Worker;
  private seq = 0;
  private pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void; prog?: (p: number, phase?: string) => void }>();
  kata: KataState = { status: "absent" };
  private listeners = new Set<() => void>();
  private loading: Promise<boolean> | null = null;

  constructor() {
    this.w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.w.onmessage = (ev) => {
      const d = ev.data, p = this.pending.get(d.id); if (!p) return;
      if ("progress" in d) { p.prog?.(d.progress, d.phase); return; }
      this.pending.delete(d.id);
      if ("error" in d) p.rej(new Error(d.error)); else p.res(d.result);
    };
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => this.listeners.delete(f); }
  private emit() { this.listeners.forEach((f) => f()); }
  private call<T>(msg: Record<string, unknown>, prog?: (p: number, phase?: string) => void): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((res, rej) => { this.pending.set(id, { res, rej, prog }); this.w.postMessage({ ...msg, id }); });
  }

  /** Le modèle est-il déjà dans le cache de l'appareil ? */
  async isCached(): Promise<boolean> {
    try { const c = await caches.open("tengen-moteur"); return !!(await c.match(MODEL_URL)); } catch { return false; }
  }
  loadKatago(): Promise<boolean> {
    if (this.kata.status === "ready") return Promise.resolve(true);
    if (this.loading) return this.loading;
    this.kata = { status: "loading", progress: 0 }; this.emit();
    this.loading = this.call<boolean>({ type: "load", modelUrl: MODEL_URL, wasmUrl: WASM_URL }, (p, phase) => { this.kata = { status: "loading", progress: p, phase }; this.emit(); })
      .then(() => { this.kata = { status: "ready" }; this.emit(); return true; })
      .catch((e: Error) => { this.kata = { status: "error", message: e.message }; this.loading = null; this.emit(); return false; });
    return this.loading;
  }
  ready() { return this.kata.status === "ready"; }

  genmove(g: Game, level: number) { return this.call<GenMoveResult>({ type: "genmove", game: toData(g), level }); }
  evaluate(g: Game) { return this.call<Evaluation | null>({ type: "evaluate", game: toData(g) }); }
  analyze(g: Game, visits: number, timeMs: number) { return this.call<SearchResult | null>({ type: "analyze", game: toData(g), visits, timeMs }); }
  deadStones(g: Game) { return this.call<number[]>({ type: "dead", game: toData(g) }); }
  ownership(g: Game) { return this.call<Float32Array>({ type: "ownership", game: toData(g) }); }
  mc(g: Game, timeMs: number) { return this.call<McResult>({ type: "mc", game: toData(g), timeMs }); }
  cancelReview() { this.w.postMessage({ type: "cancel", id: ++this.seq }); }
  review(g: Game, visits: number, prog: (p: number) => void) { return this.call<ReviewPos[] | null>({ type: "review", game: toData(g), visits }, prog); }
}

export const engine = new EngineClient();
