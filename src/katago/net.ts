/**
 * Évaluation d'une position par le réseau KataGo (ONNX Runtime). Indépendant de l'environnement :
 * on lui fournit une fonction `run` qui exécute le modèle (navigateur : onnxruntime-web ; tests : Node).
 */
import { PASS } from "../go/board";
import type { Game } from "../go/game";
import { fillInputs, NUM_GLOBAL, NUM_SPATIAL } from "./features";

export interface RawOutputs { policy: Float32Array; pass: number; value: Float32Array; score: Float32Array; ownership: Float32Array; }
export type RunFn = (bin: Float32Array, glob: Float32Array, n: number) => Promise<RawOutputs>;

export interface Evaluation {
  /** probabilités sur les points (index y*n+x) puis la passe en dernier ; 0 pour les coups illégaux */
  policy: Float32Array;
  /** chance de gain du joueur au trait (0..1) */
  winrate: number;
  /** avance en points du joueur au trait */
  lead: number;
  /** propriété estimée, du point de vue de Noir : +1 = Noir, -1 = Blanc */
  ownershipBlack: Float32Array;
}

export class Net {
  private cache = new Map<string, Evaluation>();
  constructor(private run: RunFn) {}

  key(g: Game): string {
    const mv = g.moves, L = mv.length;
    let h = g.board.hash() + "|" + g.toPlay + "|" + g.board.ko + "|" + g.komi + "|";
    for (let k = 1; k <= 5 && k <= L; k++) h += mv[L - k].p + ",";
    return h;
  }

  async evaluate(g: Game): Promise<Evaluation> {
    const k = this.key(g);
    const hit = this.cache.get(k); if (hit) return hit;
    const n = g.size, HW = n * n;
    const bin = new Float32Array(NUM_SPATIAL * HW), glob = new Float32Array(NUM_GLOBAL);
    fillInputs(g, bin, glob);
    const out = await this.run(bin, glob, n);
    const b = g.board, pla = g.toPlay;
    const logits = new Float32Array(HW + 1); let max = -Infinity;
    const legal = new Uint8Array(HW + 1);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (b.isLegal(b.idx(x, y), pla)) { legal[i] = 1; logits[i] = out.policy[i]; if (logits[i] > max) max = logits[i]; }
    }
    legal[HW] = 1; logits[HW] = out.pass; if (out.pass > max) max = out.pass;
    const policy = new Float32Array(HW + 1); let sum = 0;
    for (let i = 0; i <= HW; i++) if (legal[i]) { policy[i] = Math.exp(logits[i] - max); sum += policy[i]; }
    for (let i = 0; i <= HW; i++) policy[i] /= sum;
    const v = out.value, vm = Math.max(v[0], v[1], v[2]);
    const ew = Math.exp(v[0] - vm), el = Math.exp(v[1] - vm), en = Math.exp(v[2] - vm);
    const winrate = (ew + 0.5 * en) / (ew + el + en);
    const lead = out.score[2] * 20;
    const ownershipBlack = new Float32Array(HW);
    const sgn = pla === 1 ? 1 : -1;
    for (let i = 0; i < HW; i++) ownershipBlack[i] = sgn * Math.tanh(out.ownership[i]);
    const e: Evaluation = { policy, winrate, lead, ownershipBlack };
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(k, e);
    return e;
  }
}

/** Index de politique (y*n+x, ou n*n pour passer) d'un point du plateau. */
export function policyIndex(g: Game, p: number): number { return p === PASS ? g.size * g.size : g.board.y(p) * g.size + g.board.x(p); }
export function pointOfIndex(g: Game, i: number): number { const n = g.size; return i === n * n ? PASS : g.board.idx(i % n, Math.floor(i / n)); }
