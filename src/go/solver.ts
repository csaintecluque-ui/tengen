/**
 * Solveurs tactiques exacts pour les problèmes :
 *  - capture : l'attaquant peut-il prendre la chaîne cible (échelles, filets, prises-reprises, courses) ?
 *  - vie et mort : dans une zone fermée, le groupe cible peut-il être tué / vivre ?
 * Recherche minimax avec élagage et table de transposition. Pensé pour de petites zones.
 */
import { Board, Color, PASS, EMPTY, opp } from "./board";
import { passAliveArea } from "../katago/features";

export type Goal =
  | { type: "capture"; target: number }          // le joueur au trait veut capturer la cible
  | { type: "escape"; target: number }           // le joueur au trait veut sauver la cible
  | { type: "kill"; target: number; region: number[] }
  | { type: "live"; target: number; region: number[] };

export interface SolveResult { win: boolean; move: number; }

interface Ctx { nodes: number; budget: number; tt: Map<string, boolean>; }

/* ---------- capture ---------- */
/** Mode approfondi (hors ligne) : filets et suites plus longues. */
export const solverOptions = { thorough: false };
function captureCandidates(b: Board, target: number, attacker: Color, isAttacker: boolean, wide = true): number[] {
  const g = b.group(target), set = new Set<number>();
  for (const l of g.libs) set.add(l);
  if (!isAttacker) {
    // le défenseur peut capturer ou raccourcir des chaînes attaquantes voisines
    for (const s of g.stones) for (const d of b.adj) {
      const r = s + d;
      if (b.c[r] === attacker) { const h = b.group(r); if (h.libs.length === 1 || (h.libs.length === 2 && g.libs.length <= 2)) h.libs.forEach((l) => set.add(l)); }
    }
  } else {
    if (wide) {
      // filets : points voisins (y compris en diagonale) des libertés
      for (const l of g.libs) for (const d of [...b.adj, b.w + 1, b.w - 1, -b.w + 1, -b.w - 1]) if (b.c[l + d] === EMPTY) set.add(l + d);
    }
    // sauver ses propres pierres en atari autour de la cible
    for (const s of g.stones) for (const d of b.adj) {
      const r = s + d;
      if (b.c[r] === attacker) { const h = b.group(r); if (h.libs.length === 1) h.libs.forEach((l) => set.add(l)); }
    }
  }
  return [...set];
}

/** ply : profondeur depuis la racine. Renvoie true si l'attaquant capture. */
function capSearch(b: Board, target: number, attacker: Color, toMove: Color, ply: number, ctx: Ctx): boolean {
  if (b.c[target] === EMPTY) return true;
  const libs = b.libCount(target, 6);
  const isAtt = toMove === attacker;
  if (isAtt && libs === 1) return true;
  if (libs >= 4) return false;
  if (libs === 3 && ply > (solverOptions.thorough ? 9 : 5)) return false;
  if (ply > 60 || ++ctx.nodes > ctx.budget) return false;
  const key = b.hash() + toMove + b.ko;
  const hit = ctx.tt.get(key); if (hit !== undefined) return hit;
  const moves = captureCandidates(b, target, attacker, isAtt, solverOptions.thorough ? ply < 7 : ply < 3);
  let result: boolean;
  if (isAtt) {
    result = false;
    for (const m of order(b, moves, toMove)) {
      if (!b.isLegal(m, toMove)) continue;
      const nb = b.clone(); nb.play(m, toMove);
      if (capSearch(nb, target, attacker, opp(toMove), ply + 1, ctx)) { result = true; break; }
    }
  } else {
    result = true;
    for (const m of order(b, moves, toMove)) {
      if (!b.isLegal(m, toMove)) continue;
      const nb = b.clone(); nb.play(m, toMove);
      if (nb.c[target] === EMPTY) continue;
      if (!capSearch(nb, target, attacker, opp(toMove), ply + 1, ctx)) { result = false; break; }
    }
    // jouer ailleurs (ne rien faire ici) est parfois la meilleure défense
    if (result && libs >= 2 && ply < 3) {
      const nb = b.clone(); nb.play(PASS, toMove);
      if (!capSearch(nb, target, attacker, attacker, ply + 1, ctx)) result = false;
    }
  }
  ctx.tt.set(key, result);
  return result;
}

function order(b: Board, moves: number[], col: Color): number[] {
  const sc = (m: number) => { let s = 0; for (const d of b.adj) if (b.c[m + d] === EMPTY) s++; return -s; };
  return moves.slice().sort((a, c) => sc(a) - sc(c));
}

/* ---------- vie et mort ---------- */
function isSafe(b: Board, target: number, defender: Color): boolean {
  if (b.c[target] !== defender) return false;
  const area = passAliveArea(b);
  return area[target] === defender;
}

function ldSearch(b: Board, target: number, defender: Color, toMove: Color, region: number[], depth: number, passes: number, ctx: Ctx): boolean {
  // renvoie true si l'ATTAQUANT gagne (cible capturée)
  if (b.c[target] !== defender) return true;
  if (isSafe(b, target, defender)) return false;
  if (passes >= 2) return false; // deux passes : la cible est encore là (vie ou seki)
  if (depth <= 0 || ++ctx.nodes > ctx.budget) return false;
  const key = b.hash() + toMove + b.ko + passes;
  const hit = ctx.tt.get(key); if (hit !== undefined) return hit;
  const attacker = opp(defender), isAtt = toMove === attacker;
  const moves = region.filter((p) => b.c[p] === EMPTY && b.isLegal(p, toMove));
  let res: boolean;
  if (isAtt) {
    res = false;
    for (const m of moves) { const nb = b.clone(); nb.play(m, toMove); if (ldSearch(nb, target, defender, defender, region, depth - 1, 0, ctx)) { res = true; break; } }
    if (!res) { const nb = b.clone(); nb.play(PASS, toMove); res = ldSearch(nb, target, defender, defender, region, depth - 1, passes + 1, ctx); }
  } else {
    res = true;
    for (const m of moves) {
      const nb = b.clone(); nb.play(m, toMove);
      if (!ldSearch(nb, target, defender, attacker, region, depth - 1, 0, ctx)) { res = false; break; }
    }
    if (res) { const nb = b.clone(); nb.play(PASS, toMove); res = ldSearch(nb, target, defender, attacker, region, depth - 1, passes + 1, ctx); }
  }
  ctx.tt.set(key, res);
  return res;
}

/** Le joueur au trait atteint-il son but ? (true = oui) */
export function goalWon(b: Board, goal: Goal, toMove: Color, budget = 400000): boolean | null {
  const ctx: Ctx = { nodes: 0, budget, tt: new Map() };
  let r: boolean;
  const col = b.c[goal.target] as Color;
  if (goal.type === "capture") r = capSearch(b, goal.target, opp(col), toMove, 0, ctx);
  else if (goal.type === "escape") r = !capSearch(b, goal.target, opp(col), toMove, 0, ctx);
  else if (goal.type === "kill") r = ldSearch(b, goal.target, col, toMove, goal.region, 24, 0, ctx);
  else r = !ldSearch(b, goal.target, col, toMove, goal.region, 24, 0, ctx);
  if (ctx.nodes > budget) return null;
  return r;
}

/** Statut du but après un coup : la partie du problème est-elle terminée ? */
export function goalSettled(b: Board, goal: Goal, solverColor: Color): "won" | "lost" | null {
  const col = b.c[goal.target];
  const attackerWants = goal.type === "capture" || goal.type === "kill";
  const userIsAttacker = attackerWants;
  if (col === EMPTY || col !== targetColor(goal, b, solverColor)) return userIsAttacker ? "won" : "lost";
  if (goal.type === "capture" || goal.type === "escape") {
    const libs = b.libCount(goal.target, 6);
    if (libs >= 5) return userIsAttacker ? "lost" : "won";
    return null;
  }
  if (isSafe(b, goal.target, col as Color)) return userIsAttacker ? "lost" : "won";
  return null;
}
function targetColor(goal: Goal, b: Board, userColor: Color): Color {
  // la cible appartient à l'adversaire de l'utilisateur pour capture/kill, à l'utilisateur pour escape/live
  return goal.type === "capture" || goal.type === "kill" ? opp(userColor) : userColor;
}

/** Liste des coups gagnants pour le joueur au trait. */
export function winningMoves(b: Board, goal: Goal, toMove: Color, budget = 400000): number[] {
  const out: number[] = [];
  for (const m of candidateMoves(b, goal, toMove)) {
    if (!b.isLegal(m, toMove)) continue;
    const nb = b.clone(); nb.play(m, toMove);
    const st = goalSettled(nb, goal, toMove);
    if (st === "won") { out.push(m); continue; }
    if (st === "lost") continue;
    const r = goalWon(nb, goal, opp(toMove), budget);
    if (r === true) out.push(m);
  }
  return out;
}

/** Meilleure réponse de l'adversaire (celui qui résiste) : un coup qui le fait gagner, sinon le plus coriace. */
export function bestReply(b: Board, goal: Goal, toMove: Color, budget = 200000): number {
  const cands = candidateMoves(b, goal, toMove).filter((m) => b.isLegal(m, toMove));
  let fallback = PASS, fallbackScore = -1;
  for (const m of cands) {
    const nb = b.clone(); nb.play(m, toMove);
    const r = goalWon(nb, goal, opp(toMove), budget);
    if (r === false) return m; // ce coup fait échouer l'utilisateur
    // à défaut : le coup qui maximise les libertés de la cible (défense) ou les minimise (attaque)
    const t = nb.c[goal.target] ? nb.libCount(goal.target, 8) : 0;
    const defending = (goal.type === "capture" || goal.type === "kill");
    const score = defending ? t : 8 - t;
    if (score > fallbackScore) { fallbackScore = score; fallback = m; }
  }
  return fallback;
}

export function candidateMoves(b: Board, goal: Goal, toMove: Color): number[] {
  if (goal.type === "kill" || goal.type === "live") return goal.region.filter((p) => b.c[p] === EMPTY);
  const col = b.c[goal.target] as Color; if (!col) return [];
  const attacker = opp(col);
  return captureCandidates(b, goal.target, attacker, toMove === attacker, true);
}
