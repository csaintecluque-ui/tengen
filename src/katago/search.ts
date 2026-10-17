/**
 * Recherche arborescente PUCT (à la KataGo / AlphaZero) guidée par le réseau.
 * Utilité = chance de gain + petit bonus de score, du point de vue du joueur au trait de chaque nœud.
 */
import { PASS, opp } from "../go/board";
import type { Game } from "../go/game";
import { Net, Evaluation, pointOfIndex } from "./net";

interface Node {
  move: number;          // point joué pour arriver ici
  prior: number;
  visits: number;
  utilSum: number;       // somme des utilités du point de vue du joueur qui a joué `move`
  winSum: number;
  leadSum: number;
  children: Node[] | null;
  eval?: Evaluation;
}

export interface Candidate { p: number; visits: number; winrate: number; lead: number; prior: number; pv: number[]; }
export interface SearchResult { candidates: Candidate[]; root: Evaluation; visits: number; winrate: number; lead: number; }

const CPUCT = 1.1, FPU_REDUCTION = 0.25, SCORE_WEIGHT = 0.08;
const util = (winrate: number, lead: number) => (2 * winrate - 1) + SCORE_WEIGHT * Math.tanh(lead / 10);

export async function search(net: Net, game: Game, visits: number, opts: { timeMs?: number; signal?: { aborted: boolean }; allowPass?: boolean } = {}): Promise<SearchResult> {
  const t0 = Date.now();
  const rootEval = await net.evaluate(game);
  const root: Node = { move: -999, prior: 1, visits: 1, utilSum: 0, winSum: 0, leadSum: 0, children: null, eval: rootEval };
  expand(root, game, rootEval, opts.allowPass !== false);
  let done = 1;
  while (done < visits) {
    if (opts.signal?.aborted) break;
    if (opts.timeMs && Date.now() - t0 > opts.timeMs) break;
    const g = game.clone();
    const path: Node[] = [root];
    let node = root;
    while (node.children && node.children.length) {
      node = select(node);
      g.play(node.move);
      path.push(node);
      if (g.isOver()) break;
    }
    let w: number, l: number; // du point de vue du joueur au trait dans g
    if (g.isOver()) {
      const s = g.score(); const marginBlack = s.margin;
      const leadToPlay = g.toPlay === 1 ? marginBlack : -marginBlack;
      w = leadToPlay > 0 ? 1 : 0; l = leadToPlay;
    } else {
      const e = await net.evaluate(g);
      node.eval = e; expand(node, g, e, true);
      w = e.winrate; l = e.lead;
    }
    // remonter : le nœud feuille a été joué par l'adversaire du joueur au trait
    let win = 1 - w, lead = -l;
    for (let i = path.length - 1; i >= 0; i--) {
      const nd = path[i];
      nd.visits++; nd.winSum += win; nd.leadSum += lead; nd.utilSum += util(win, lead);
      win = 1 - win; lead = -lead;
    }
    done++;
  }
  const cands: Candidate[] = (root.children || []).filter((c) => c.visits > 0).sort((a, b) => b.visits - a.visits || b.prior - a.prior)
    .map((c) => ({ p: c.move, visits: c.visits, winrate: c.winSum / c.visits, lead: c.leadSum / c.visits, prior: c.prior, pv: pv(c) }));
  if (!cands.length && root.children) {
    const best = [...root.children].sort((a, b) => b.prior - a.prior)[0];
    cands.push({ p: best.move, visits: 0, winrate: rootEval.winrate, lead: rootEval.lead, prior: best.prior, pv: [best.move] });
  }
  const tot = cands.reduce((a, c) => a + c.visits, 0);
  return { candidates: cands, root: rootEval, visits: done,
    winrate: tot ? cands.reduce((a, c) => a + c.winrate * c.visits, 0) / tot : rootEval.winrate,
    lead: tot ? cands.reduce((a, c) => a + c.lead * c.visits, 0) / tot : rootEval.lead };
}

function pv(n: Node): number[] {
  const out = [n.move]; let cur = n;
  while (cur.children && cur.children.length && out.length < 12) {
    const best = cur.children.reduce((a, b) => (b.visits > a.visits ? b : a));
    if (!best.visits) break; out.push(best.move); cur = best;
  }
  return out;
}

function expand(node: Node, g: Game, e: Evaluation, allowPass: boolean) {
  const n = g.size, ch: Node[] = [];
  for (let i = 0; i <= n * n; i++) {
    const pr = e.policy[i]; if (pr <= 0) continue;
    const p = pointOfIndex(g, i);
    if (p === PASS && !allowPass) continue;
    if (p !== PASS && g.board.isEyeish(p, g.toPlay) && pr < 0.02) continue;
    ch.push({ move: p, prior: pr, visits: 0, utilSum: 0, winSum: 0, leadSum: 0, children: null });
  }
  ch.sort((a, b) => b.prior - a.prior);
  node.children = ch.slice(0, 40);
}

function select(node: Node): Node {
  const ch = node.children!; let best = ch[0], bv = -Infinity;
  const sq = Math.sqrt(node.visits);
  // valeur de première exploration : utilité du parent (vue par l'enfant) moins une réduction
  let visitedPrior = 0; for (const c of ch) if (c.visits) visitedPrior += c.prior;
  const parentUtil = node.visits ? -(node.utilSum / node.visits) : 0;
  const fpu = parentUtil - FPU_REDUCTION * Math.sqrt(visitedPrior);
  for (const c of ch) {
    const q = c.visits ? c.utilSum / c.visits : fpu;
    const v = q + CPUCT * c.prior * sq / (1 + c.visits);
    if (v > bv) { bv = v; best = c; }
  }
  return best;
}

export { opp };
