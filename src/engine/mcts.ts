/**
 * Moteur « maison » sans réseau de neurones : Monte-Carlo avec UCB et RAVE à la racine,
 * parties aléatoires guidées par quelques réflexes de go (capturer, s'échapper d'atari, ne pas boucher ses yeux).
 * Volontairement imparfait : idéal pour les premiers niveaux.
 */
import { Board, Color, PASS, EMPTY, opp } from "../go/board";

export function makeRng(seed: number) {
  let s = seed >>> 0 || 88675123;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function playoutMove(b: Board, col: Color, last: number, rnd: () => number, empt: number[]): number {
  const c = b.c, o = opp(col);
  if (last >= 0 && c[last] === o) {
    const g = b.group(last);
    if (g.libs.length === 1 && b.isLegal(g.libs[0], col)) return g.libs[0];
    for (const d of b.adj) {
      const r = last + d;
      if (c[r] === col) {
        const h = b.group(r);
        if (h.libs.length === 1 && rnd() < 0.7 && b.isLegal(h.libs[0], col)) {
          let e = 0; for (const dd of b.adj) if (c[h.libs[0] + dd] === EMPTY) e++;
          if (e >= 2) return h.libs[0];
        }
      } else if (c[r] === o) {
        const h = b.group(r); if (h.libs.length === 1 && b.isLegal(h.libs[0], col)) return h.libs[0];
      }
    }
  }
  let n = empt.length;
  while (n > 0) {
    const k = (rnd() * n) | 0, q = empt[k];
    if (c[q] === EMPTY && !b.isEyeish(q, col) && b.isLegal(q, col)) {
      // éviter l'auto-atari d'une grosse chaîne
      const t = b.clone(); t.play(q, col);
      const g = t.group(q);
      if (!(g.libs.length === 1 && g.stones.length >= 3) || rnd() < 0.1) return q;
    }
    empt[k] = empt[--n]; empt[n] = q;
  }
  return PASS;
}

export function playout(b: Board, col: Color, last: number, rnd: () => number, seq: number[] | null, maxMoves: number) {
  let passes = 0, moves = 0;
  const empt: number[] = [];
  for (const p of b.points()) if (b.c[p] === EMPTY) empt.push(p);
  while (passes < 2 && moves < maxMoves) {
    const p = playoutMove(b, col, last, rnd, empt);
    if (p === PASS) passes++;
    else {
      passes = 0; b.play(p, col); if (seq) seq.push(p, col);
      if (moves % 8 === 7) { empt.length = 0; for (const q of b.points()) if (b.c[q] === EMPTY) empt.push(q); }
    }
    last = p; col = opp(col); moves++;
  }
}

function areaOwners(b: Board): Int8Array {
  const c = b.c, own = new Int8Array(c.length), seen = new Uint8Array(c.length);
  for (const p of b.points()) {
    if (c[p] === 1 || c[p] === 2) own[p] = c[p];
    else if (!seen[p]) {
      const st = [p], reg: number[] = []; let touch = 0; seen[p] = 1;
      while (st.length) {
        const q = st.pop()!; reg.push(q);
        for (const d of b.adj) { const r = q + d, v = c[r]; if (v === EMPTY && !seen[r]) { seen[r] = 1; st.push(r); } else if (v === 1) touch |= 1; else if (v === 2) touch |= 2; }
      }
      const o = touch === 1 ? 1 : touch === 2 ? 2 : 0; for (const q of reg) own[q] = o;
    }
  }
  return own;
}

export interface McCandidate { p: number; n: number; wr: number; }
export interface McResult { candidates: McCandidate[]; ownershipBlack: Float32Array; total: number; }

/** Recherche Monte-Carlo. ownershipBlack est indexé y*n+x. */
export function mcSearch(board: Board, col: Color, komi: number, opts: { playouts?: number; timeMs?: number; seed?: number }): McResult {
  const rnd = makeRng(opts.seed ?? (Date.now() & 0x7fffffff));
  const n = board.n, cands: number[] = [];
  for (const p of board.points()) if (board.c[p] === EMPTY && board.isLegal(p, col) && !board.isEyeish(p, col)) cands.push(p);
  const own = new Float64Array(board.c.length); let total = 0;
  const N = cands.length;
  const nv = new Float64Array(N), wv = new Float64Array(N), an = new Float64Array(N), aw = new Float64Array(N);
  const pos = new Int32Array(board.c.length).fill(-1); cands.forEach((p, i) => (pos[p] = i));
  const t0 = Date.now(), maxP = opts.playouts ?? 1e9, timeMs = opts.timeMs ?? 1e9, K = 300, maxMoves = n * n * 3;
  const seen = new Uint8Array(board.c.length);
  if (N) while (total < maxP) {
    if ((total & 15) === 0 && Date.now() - t0 > timeMs) break;
    const lnT = Math.log(total + 1); let bi = 0, bv = -1e9;
    for (let i = 0; i < N; i++) {
      let v: number;
      if (nv[i] === 0) v = 100 + (an[i] > 0 ? aw[i] / an[i] : 0.5) + rnd() * 0.01;
      else {
        const beta = Math.sqrt(K / (3 * nv[i] + K)), q = wv[i] / nv[i], a = an[i] > 0 ? aw[i] / an[i] : q;
        v = beta * a + (1 - beta) * q + 0.35 * Math.sqrt(lnT / nv[i]);
      }
      if (v > bv) { bv = v; bi = i; }
    }
    const b = board.clone(); b.play(cands[bi], col);
    const seq: number[] = [];
    playout(b, opp(col), cands[bi], rnd, seq, maxMoves);
    const ow = areaOwners(b); let sb = 0, sw = 0;
    for (const p of b.points()) { if (ow[p] === 1) { sb++; own[p]++; } else if (ow[p] === 2) { sw++; own[p]--; } }
    const win = (col === 1 ? sb - sw - komi > 0 : sw + komi - sb > 0) ? 1 : 0;
    nv[bi]++; wv[bi] += win;
    seen.fill(0); seen[cands[bi]] = 1; an[bi]++; aw[bi] += win;
    for (let k = 0; k < seq.length; k += 2) {
      const mp = seq[k]; if (seq[k + 1] !== col || seen[mp]) continue; seen[mp] = 1;
      const j = pos[mp]; if (j >= 0) { an[j]++; aw[j] += win; }
    }
    total++;
  }
  const ownershipBlack = new Float32Array(n * n);
  for (const p of board.points()) ownershipBlack[board.y(p) * n + board.x(p)] = own[p] / Math.max(1, total);
  const out = cands.map((p, i) => ({ p, n: nv[i], wr: nv[i] ? wv[i] / nv[i] : 0 }));
  out.sort((a, b) => b.n - a.n || b.wr - a.wr);
  return { candidates: out, ownershipBlack, total };
}

/** Propriété moyenne par parties aléatoires (pour estimer les pierres mortes sans réseau). */
export function mcOwnership(board: Board, toPlay: Color, count: number): Float32Array {
  const rnd = makeRng(1234567), n = board.n, acc = new Float64Array(board.c.length);
  for (let t = 0; t < count; t++) {
    const b = board.clone(); b.ko = -1;
    playout(b, toPlay, -1, rnd, null, n * n * 3);
    const ow = areaOwners(b);
    for (const p of b.points()) { if (ow[p] === 1) acc[p]++; else if (ow[p] === 2) acc[p]--; }
  }
  const out = new Float32Array(n * n);
  for (const p of board.points()) out[board.y(p) * n + board.x(p)] = acc[p] / count;
  return out;
}
