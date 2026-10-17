/**
 * Cerveau du moteur (exécuté dans le worker) : choix des coups selon le niveau, analyse, estimation des territoires.
 */
import { Game } from "../go/game";
import { Board, Color, PASS, BLACK, WHITE, opp } from "../go/board";
import { Net, Evaluation, pointOfIndex, policyIndex } from "../katago/net";
import { search, SearchResult } from "../katago/search";
import { mcSearch, mcOwnership, makeRng } from "./mcts";

export interface MoveInfo { winrate?: number; lead?: number; candidates?: { p: number; winrate: number; lead: number; visits: number; prior: number }[]; note?: string; }
export interface GenMoveResult { p: number; resign?: boolean; info: MoveInfo; }

const rnd = makeRng(Date.now() & 0x7fffffff);

export class Brain {
  net: Net | null = null;
  private lowStreak = 0;

  hasNet() { return !!this.net; }

  async evaluate(g: Game): Promise<Evaluation | null> { return this.net ? this.net.evaluate(g) : null; }

  /** Propriété du point de vue de Noir (index y*n+x). */
  async ownership(g: Game): Promise<Float32Array> {
    if (this.net) {
      const e = await this.net.evaluate(g);
      return e.ownershipBlack;
    }
    return mcOwnership(g.board, g.toPlay, g.size <= 9 ? 400 : 200);
  }

  async deadStones(g: Game): Promise<number[]> {
    const own = await this.ownership(g);
    return deadFromOwnership(g.board, own);
  }

  async analyze(g: Game, visits: number, timeMs: number): Promise<SearchResult | null> {
    if (!this.net) return null;
    return search(this.net, g, visits, { timeMs });
  }

  async genmove(g: Game, level: number): Promise<GenMoveResult> {
    const n = g.size, me = g.toPlay;
    const moveNo = g.moves.length;
    if (moveNo > n * n * 2.2) return { p: PASS, info: { note: "Partie trop longue : je passe." } };
    const oppPassed = g.lastMove()?.p === PASS;

    // Le joueur vient de passer : si je mène au décompte, je passe aussi.
    if (oppPassed && moveNo > n * 2) {
      const dead = new Set(await this.deadStones(g));
      const s = g.score(dead);
      const myLead = me === BLACK ? s.margin : -s.margin;
      if (myLead > 0) return { p: PASS, info: { note: "Plus rien d'utile à jouer : je passe aussi." } };
    }

    const useNet = this.net && level >= 2;
    if (!useNet) return this.mcMove(g, level, oppPassed);

    const net = this.net!;
    if (level === 4) {
      const visits = n <= 9 ? 120 : n <= 13 ? 60 : 32;
      const timeMs = n <= 9 ? 3500 : n <= 13 ? 4500 : 5500;
      const r = await search(net, g, visits, { timeMs });
      const best = r.candidates[0];
      if (this.shouldResign(r.winrate, moveNo, n)) return { p: PASS, resign: true, info: { winrate: r.winrate, lead: r.lead } };
      return { p: best.p, info: { winrate: r.winrate, lead: r.lead, candidates: r.candidates.slice(0, 5) } };
    }
    const e = await net.evaluate(g);
    if (this.shouldResign(e.winrate, moveNo, n)) return { p: PASS, resign: true, info: { winrate: e.winrate, lead: e.lead } };
    const order = Array.from(e.policy.keys()).filter((i) => e.policy[i] > 0).sort((a, b) => e.policy[b] - e.policy[a]);
    const passIdx = n * n;
    const cands = order.map((i) => ({ i, pr: e.policy[i] })).filter((c) => c.i !== passIdx || c.pr > 0.4);
    let pick = cands[0]?.i ?? passIdx;
    if (level === 3) {
      if (moveNo < 4 && cands.length > 1) pick = sample(cands.slice(0, 4).map((c) => ({ i: c.i, w: c.pr })));
    } else {
      // niveau « Club » : tirage selon la politique, avec des erreurs régulières
      const pool = cands.filter((c) => c.pr >= 0.01).slice(0, 12);
      if (rnd() < 0.22 && pool.length > 2) pick = pool[Math.min(pool.length - 1, 1 + Math.floor(rnd() * Math.min(6, pool.length - 1)))].i;
      else pick = sample(pool.map((c) => ({ i: c.i, w: c.pr })));
    }
    const p = pointOfIndex(g, pick);
    return { p, info: { winrate: e.winrate, lead: e.lead, candidates: cands.slice(0, 5).map((c) => ({ p: pointOfIndex(g, c.i), prior: c.pr, winrate: e.winrate, lead: e.lead, visits: 0 })) } };
  }

  private shouldResign(wr: number, moveNo: number, n: number) {
    if (moveNo < (n * n) / 3) { this.lowStreak = 0; return false; }
    this.lowStreak = wr < 0.03 ? this.lowStreak + 1 : 0;
    return this.lowStreak >= 3;
  }

  private mcMove(g: Game, level: number, oppPassed: boolean): GenMoveResult {
    const n = g.size;
    const opts = level === 0 ? { playouts: n <= 9 ? 260 : 160 } : level === 1 ? { timeMs: n <= 9 ? 1200 : 1800 } : { timeMs: n <= 9 ? 2500 : 3500 };
    const r = mcSearch(g.board, g.toPlay, g.komi, opts);
    const c = r.candidates;
    if (!c.length) return { p: PASS, info: { note: "Je n'ai plus de coup utile : je passe." } };
    let pick = 0;
    const top = level === 0 ? 4 : level === 1 ? 2 : 1;
    if (top > 1) pick = sample(c.slice(0, top).map((x, i) => ({ i, w: x.n * x.n + 1 })));
    // en fin de partie, un coup qui ne sert à rien : passer plutôt que remplir son propre territoire
    if (oppPassed && c[pick].wr < 0.05 && g.moves.length > n * n * 0.6) return { p: PASS, info: { note: "Je passe." } };
    return { p: c[pick].p, info: { winrate: c[0].wr, candidates: c.slice(0, 5).map((x) => ({ p: x.p, winrate: x.wr, lead: 0, visits: x.n, prior: 0 })) } };
  }
}

function sample(items: { i: number; w: number }[]): number {
  const tot = items.reduce((a, b) => a + b.w, 0); let r = rnd() * tot;
  for (const it of items) { r -= it.w; if (r <= 0) return it.i; }
  return items[0].i;
}

/** Pierres mortes : chaînes dont la propriété moyenne est nettement adverse. */
export function deadFromOwnership(b: Board, own: Float32Array): number[] {
  const n = b.n, dead: number[] = [], seen = new Set<number>();
  for (const p of b.points()) {
    const v = b.c[p]; if ((v !== BLACK && v !== WHITE) || seen.has(p)) continue;
    const g = b.group(p); let sum = 0;
    for (const q of g.stones) { seen.add(q); sum += own[b.y(q) * n + b.x(q)]; }
    const avg = sum / g.stones.length;
    if ((v === BLACK && avg < -0.35) || (v === WHITE && avg > 0.35)) dead.push(...g.stones);
  }
  return dead;
}

export { policyIndex, opp };
export type { Color };
