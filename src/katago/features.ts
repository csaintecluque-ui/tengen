/**
 * Encodage des entrées du réseau KataGo (version d'entrées 7, modèles g170 / version 8).
 * Port fidèle de cpp/neuralnet/nninputs.cpp (fillRowV7) et cpp/game/board.cpp
 * (recherche d'échelles, calcul de zone par l'algorithme de Benson) du projet KataGo (licence MIT).
 * Règles utilisées : surface (chinoises), ko simple, suicide interdit, pas de taxe.
 */
import { Board, Color, EMPTY, EDGE, PASS, opp } from "../go/board";
import type { Game } from "../go/game";

export const NUM_SPATIAL = 22;
export const NUM_GLOBAL = 19;

/* ---------- chaînes ---------- */
interface Chains { head: Int32Array; libs: Int32Array; }
function computeChains(b: Board): Chains {
  const N = b.c.length, head = new Int32Array(N).fill(-1), libs = new Int32Array(N);
  const seenLib = new Int32Array(N); let stamp = 0;
  for (let p = 0; p < N; p++) {
    const v = b.c[p]; if ((v !== 1 && v !== 2) || head[p] >= 0) continue;
    const st = [p], stones: number[] = []; head[p] = p; stamp++; let n = 0;
    while (st.length) {
      const q = st.pop()!; stones.push(q);
      for (const d of b.adj) {
        const r = q + d, w = b.c[r];
        if (w === EMPTY) { if (seenLib[r] !== stamp) { seenLib[r] = stamp; n++; } }
        else if (w === v && head[r] < 0) { head[r] = p; st.push(r); }
      }
    }
    for (const q of stones) libs[q] = n;
  }
  return { head, libs };
}

/* ---------- échelles ---------- */
function libertiesOf(b: Board, p: number): number[] { return b.group(p).libs; }

/** Coups de capture qui donnent des libertés : libertés des chaînes adverses voisines en atari. */
function libertyGainingCaptures(b: Board, p: number): number[] {
  const col = b.c[p], o = 3 - col, out: number[] = [], seen = new Set<number>();
  const g = b.group(p);
  for (const q of g.stones) for (const d of b.adj) {
    const r = q + d;
    if (b.c[r] === o) {
      const h = b.group(r);
      const key = Math.min(...h.stones);
      if (seen.has(key)) continue; seen.add(key);
      if (h.libs.length === 1) out.push(h.libs[0]);
    }
  }
  return out;
}
function immediateLibs(b: Board, p: number): number { let n = 0; for (const d of b.adj) if (b.c[p + d] === EMPTY) n++; return n; }
function isAdjacent(b: Board, a: number, c: number) { return b.adj.some((d) => a + d === c); }
/** Heuristique d'ordre du C++ : pour chaque chaîne voisine de la couleur pla, (libertés - 1.5) * 2 */
function connLibsX2(b: Board, p: number, pla: number): number {
  let n = 0; const seen = new Set<number>();
  for (const d of b.adj) {
    const r = p + d;
    if (b.c[r] === pla) {
      const g = b.group(r); const key = Math.min(...g.stones);
      if (seen.has(key)) continue; seen.add(key);
      const l = g.libs.length; if (l > 1) n += l * 2 - 3;
    }
  }
  return n;
}

const LADDER_BUDGET = 25000;
/** La chaîne en p est-elle prise en échelle ? defenderFirst : c'est au défenseur de jouer. */
export function searchIsLadderCaptured(b0: Board, loc: number, defenderFirst: boolean): boolean {
  const col = b0.c[loc]; if (col !== 1 && col !== 2) return false;
  const libs0 = b0.libCount(loc, 3);
  if (libs0 > 2 || (defenderFirst && libs0 > 1)) return false;
  const pla = col as Color, att = opp(pla);
  const b = b0.clone(); if (defenderFirst) b.ko = -1;
  const stackSize = Math.floor((b.n * b.n * 3) / 2) + 1;
  let nodes = 0, aborted = false;
  const rec = (bb: Board, depth: number): boolean => {
    if (aborted) return false;
    if (depth >= stackSize - 1) return true;
    const isDef = defenderFirst ? depth % 2 === 0 : depth % 2 === 1;
    const libs = bb.libCount(loc, 3);
    if (!isDef && libs <= 1) return true;
    if (!isDef && libs >= 3) return false;
    if (isDef && libs >= 2) return false;
    if (isDef && bb.ko >= 0) return false;
    let moves: number[];
    if (isDef) {
      moves = [...libertyGainingCaptures(bb, loc), ...libertiesOf(bb, loc)];
    } else {
      moves = libertiesOf(bb, loc);
      if (moves.length !== 2) return false;
      let l0 = immediateLibs(bb, moves[0]), l1 = immediateLibs(bb, moves[1]);
      if (!isAdjacent(bb, moves[0], moves[1])) {
        if (l0 >= 3 && l1 >= 3) return false;
        else if (l0 >= 3) moves = [moves[0]];
        else if (l1 >= 3) moves = [moves[1]];
      }
      if (moves.length > 1) {
        l0 = l0 * 2 + connLibsX2(bb, moves[0], pla);
        l1 = l1 * 2 + connLibsX2(bb, moves[1], pla);
        if (l1 > l0) moves = [moves[1], moves[0]];
      }
    }
    for (const m of moves) {
      const who = isDef ? pla : att;
      if (!bb.isLegal(m, who)) continue;
      const nb = bb.clone(); nb.play(m, who);
      if (++nodes >= LADDER_BUDGET) { aborted = true; return false; }
      const r = rec(nb, depth + 1);
      if (aborted) return false;
      if (isDef && !r) return false;
      if (!isDef && r) return true;
    }
    return isDef;
  };
  const res = rec(b, 0);
  return aborted ? false : res;
}

/** Pour une chaîne à 2 libertés : liste des coups de l'attaquant qui la prennent en échelle. */
export function ladderWorkingMoves(b: Board, loc: number): number[] {
  const col = b.c[loc] as Color; if (b.libCount(loc, 3) !== 2) return [];
  const att = opp(col), libs = libertiesOf(b, loc), out: number[] = [];
  for (const m of libs) {
    if (!b.isLegal(m, att)) continue;
    const nb = b.clone(); nb.play(m, att);
    if (searchIsLadderCaptured(nb, loc, true)) out.push(m);
  }
  return out;
}

function iterLadders(b: Board, f: (p: number, working: number[]) => void) {
  const solved = new Map<number, boolean>();
  const ch = computeChains(b);
  for (let y = 0; y < b.n; y++) for (let x = 0; x < b.n; x++) {
    const p = b.idx(x, y), v = b.c[p];
    if (v !== 1 && v !== 2) continue;
    const libs = ch.libs[p];
    if (libs !== 1 && libs !== 2) continue;
    const h = ch.head[p];
    if (solved.has(h)) { if (solved.get(h)) f(p, []); continue; }
    let laddered: boolean, working: number[] = [];
    if (libs === 1) laddered = searchIsLadderCaptured(b, p, true);
    else { working = ladderWorkingMoves(b, p); laddered = working.length > 0; }
    solved.set(h, laddered);
    if (laddered) f(p, working);
  }
}

/* ---------- zones (Benson) : port de Board::calculateAreaForPla ---------- */
function calculateAreaForPla(b: Board, ch: Chains, pla: Color, safeBig: boolean, unsafeBig: boolean, result: Int8Array) {
  const o = opp(pla), N = b.c.length, c = b.c;
  const regionIdx = new Int32Array(N).fill(-1);
  const regions: { head: number; locs: number[]; vital: number[]; internal: number; containsOpp: boolean }[] = [];
  const isAdjToPlaHead = (loc: number, h: number) => b.adj.some((d) => c[loc + d] === pla && ch.head[loc + d] === h);
  const isAdjToPla = (loc: number) => b.adj.some((d) => c[loc + d] === pla);
  let atLeastOnePla = false;
  for (let y = 0; y < b.n; y++) for (let x = 0; x < b.n; x++) {
    const loc = b.idx(x, y);
    if (regionIdx[loc] !== -1) continue;
    if (c[loc] !== EMPTY) { atLeastOnePla ||= c[loc] === pla; continue; }
    const ri = regions.length;
    const vital: number[] = [];
    for (const d of b.adj) { const a = loc + d; if (c[a] === pla && !vital.includes(ch.head[a])) vital.push(ch.head[a]); }
    const reg = { head: loc, locs: [] as number[], vital, internal: 0, containsOpp: false };
    regions.push(reg);
    const q = [loc]; regionIdx[loc] = ri; let qi = 0;
    while (qi < q.length) {
      const l = q[qi++];
      if (reg.vital.length && c[l] === EMPTY) reg.vital = reg.vital.filter((h) => isAdjToPlaHead(l, h));
      if (reg.internal < 2 && !isAdjToPla(l)) reg.internal++;
      if (c[l] === o) reg.containsOpp = true;
      reg.locs.push(l);
      for (const d of b.adj) { const a = l + d; if ((c[a] === EMPTY || c[a] === o) && regionIdx[a] === -1) { regionIdx[a] = ri; q.push(a); } }
    }
  }
  const heads: number[] = [];
  for (let p = 0; p < N; p++) if (c[p] === pla && ch.head[p] === p) heads.push(p);
  const vitalCount = new Map<number, number>(); for (const h of heads) vitalCount.set(h, 0);
  for (const r of regions) for (const h of r.vital) vitalCount.set(h, (vitalCount.get(h) || 0) + 1);
  const killed = new Set<number>(), bordersDead = new Set<number>();
  const stonesOf = new Map<number, number[]>();
  for (let p = 0; p < N; p++) if (c[p] === pla) { const h = ch.head[p]; if (!stonesOf.has(h)) stonesOf.set(h, []); stonesOf.get(h)!.push(p); }
  for (;;) {
    let any = false;
    for (const h of heads) {
      if (killed.has(h)) continue;
      if ((vitalCount.get(h) || 0) < 2) {
        killed.add(h); any = true;
        for (const s of stonesOf.get(h)!) for (const d of b.adj) {
          const a = s + d, ri = regionIdx[a];
          if (ri >= 0 && (c[a] === EMPTY || c[a] === o) && !bordersDead.has(ri)) {
            bordersDead.add(ri);
            for (const vh of regions[ri].vital) vitalCount.set(vh, (vitalCount.get(vh) || 0) - 1);
          }
        }
      }
    }
    if (!any) break;
  }
  for (const h of heads) if (!killed.has(h)) for (const s of stonesOf.get(h)!) result[s] = pla;
  regions.forEach((r, ri) => {
    let mark = r.internal <= 1 && !bordersDead.has(ri) && atLeastOnePla;
    mark = mark || (safeBig && !r.containsOpp && !bordersDead.has(ri) && atLeastOnePla);
    if (mark) for (const l of r.locs) result[l] = pla;
    else if (unsafeBig && !r.containsOpp && atLeastOnePla) for (const l of r.locs) if (result[l] === EMPTY) result[l] = pla;
  });
}

export function calculateArea(b: Board, nonPassAliveStones: boolean, safeBig: boolean, unsafeBig: boolean): Int8Array {
  const result = new Int8Array(b.c.length), ch = computeChains(b);
  calculateAreaForPla(b, ch, 1, safeBig, unsafeBig, result);
  calculateAreaForPla(b, ch, 2, safeBig, unsafeBig, result);
  if (nonPassAliveStones) for (const p of b.points()) if (result[p] === EMPTY && b.c[p] !== EDGE) result[p] = b.c[p];
  return result;
}
/** Zones « pass-alive » seules (vie inconditionnelle de Benson). */
export function passAliveArea(b: Board): Int8Array { return calculateArea(b, false, false, false); }

/* ---------- remplissage des entrées ---------- */
export function fillInputs(game: Game, bin: Float32Array, glob: Float32Array, offset = 0) {
  const b = game.board, n = b.n, HW = n * n, pla = game.toPlay, op = opp(pla);
  const set = (pos: number, ch: number) => { bin[offset * NUM_SPATIAL * HW + ch * HW + pos] = 1; };
  const gOff = offset * NUM_GLOBAL;
  const posOf = (p: number) => b.y(p) * n + b.x(p);
  const ch = computeChains(b);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const p = b.idx(x, y), pos = y * n + x, v = b.c[p];
    set(pos, 0);
    if (v === pla) set(pos, 1); else if (v === op) set(pos, 2);
    if (v === 1 || v === 2) { const l = ch.libs[p]; if (l === 1) set(pos, 3); else if (l === 2) set(pos, 4); else if (l === 3) set(pos, 5); }
  }
  if (b.ko >= 0) set(posOf(b.ko), 6);
  // historique des 5 derniers coups, tant que les couleurs alternent
  const mv = game.moves, L = mv.length;
  const expect = [op, pla, op, pla, op];
  // Règles chinoises « passe amicale » de KataGo : si une passe terminerait la partie,
  // l'historique est masqué et l'indicateur de fin de partie n'est pas transmis.
  const lastIsPass = L >= 1 && mv[L - 1].p === PASS;
  const maxHist = lastIsPass ? 0 : 5;
  for (let k = 0; k < maxHist; k++) {
    const m = mv[L - 1 - k];
    if (!m || m.col !== expect[k]) break;
    if (m.p === PASS) glob[gOff + k] = 1; else set(posOf(m.p), 9 + k);
  }
  // échelles : position actuelle, -1, -2
  iterLadders(b, (p, working) => {
    set(posOf(p), 14);
    if (b.c[p] === op && b.libCount(p, 2) > 1) for (const w of working) set(posOf(w), 17);
  });
  const prev = L >= 1 ? game.boardAgo(1) : b;
  iterLadders(prev, (p) => set(posOf(p), 15));
  const prev2 = L >= 2 ? game.boardAgo(2) : prev;
  iterLadders(prev2, (p) => set(posOf(p), 16));
  // zones
  const area = calculateArea(b, true, true, true);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const p = b.idx(x, y);
    if (area[p] === pla) set(y * n + x, 18); else if (area[p] === op) set(y * n + x, 19);
  }
  // entrées globales
  let selfKomi = pla === 2 ? game.komi : -game.komi;
  const bArea = HW;
  if (selfKomi > bArea + 20) selfKomi = bArea + 20;
  if (selfKomi < -bArea - 20) selfKomi = -bArea - 20;
  glob[gOff + 5] = selfKomi / 20;
  // ko simple, suicide interdit, surface, pas de taxe : 6..13 = 0
  const even = (n * n) % 2 === 0;
  const komiFloor = even ? Math.floor(selfKomi / 2) * 2 : Math.floor((selfKomi - 1) / 2) * 2 + 1;
  let delta = Math.min(2, Math.max(0, selfKomi - komiFloor));
  const wave = delta < 0.5 ? delta : delta < 1.5 ? 1 - delta : delta - 2;
  glob[gOff + 18] = wave;
}
