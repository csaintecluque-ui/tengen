/**
 * Règles du go : plateau, chaînes, libertés, captures, ko simple, suicide interdit.
 * Les points sont indexés dans un tableau avec bordure : p = (y + 1) * W + (x + 1), W = taille + 2.
 * y = 0 est la ligne du haut (ligne « taille » en coordonnées de go).
 */
export const EMPTY = 0, BLACK = 1, WHITE = 2, EDGE = 3;
export type Color = 1 | 2;
export const PASS = -1;
export const opp = (c: Color): Color => (3 - c) as Color;

export const COLS = "ABCDEFGHJKLMNOPQRST";

export class Board {
  readonly n: number;
  readonly w: number;
  readonly c: Int8Array;
  ko = -1;
  readonly adj: number[];
  private mark: Int32Array;
  private stamp = 0;

  constructor(n: number) {
    this.n = n; this.w = n + 2;
    this.c = new Int8Array(this.w * this.w);
    this.mark = new Int32Array(this.w * this.w);
    this.adj = [1, -1, this.w, -this.w];
    for (let y = 0; y < this.w; y++) for (let x = 0; x < this.w; x++)
      if (x === 0 || y === 0 || x === this.w - 1 || y === this.w - 1) this.c[y * this.w + x] = EDGE;
  }
  idx(x: number, y: number) { return (y + 1) * this.w + (x + 1); }
  x(p: number) { return (p % this.w) - 1; }
  y(p: number) { return Math.floor(p / this.w) - 1; }
  onBoard(p: number) { return p >= 0 && p < this.c.length && this.c[p] !== EDGE; }

  clone(): Board {
    const b = new Board(this.n); b.c.set(this.c); b.ko = this.ko; return b;
  }
  copyFrom(o: Board) { this.c.set(o.c); this.ko = o.ko; }

  /** Tous les points jouables (sur le plateau). */
  points(): number[] {
    const out: number[] = [];
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) out.push(this.idx(x, y));
    return out;
  }

  /** Chaîne contenant p : pierres et nombre de libertés. */
  group(p: number): { stones: number[]; libs: number[] } {
    const col = this.c[p], s = ++this.stamp, m = this.mark, c = this.c, st = [p], stones: number[] = [], libs: number[] = [];
    m[p] = s;
    while (st.length) {
      const q = st.pop()!; stones.push(q);
      for (const d of this.adj) {
        const r = q + d; if (m[r] === s) continue; const v = c[r];
        if (v === EMPTY) { m[r] = s; libs.push(r); } else if (v === col) { m[r] = s; st.push(r); }
      }
    }
    return { stones, libs };
  }
  libCount(p: number, cap = 99): number {
    const col = this.c[p], s = ++this.stamp, m = this.mark, c = this.c, st = [p]; let n = 0;
    m[p] = s;
    while (st.length) {
      const q = st.pop()!;
      for (const d of this.adj) {
        const r = q + d; if (m[r] === s) continue; const v = c[r];
        if (v === EMPTY) { m[r] = s; if (++n >= cap) return n; } else if (v === col) { m[r] = s; st.push(r); }
      }
    }
    return n;
  }

  isLegal(p: number, col: Color): boolean {
    if (p === PASS) return true;
    const c = this.c; if (c[p] !== EMPTY || p === this.ko) return false;
    const o = opp(col);
    for (const d of this.adj) {
      const r = p + d, v = c[r];
      if (v === EMPTY) return true;
      if (v === col && this.libCount(r, 2) > 1) return true;
      if (v === o && this.libCount(r, 2) === 1) return true;
    }
    return false;
  }

  /** Joue un coup. Renvoie les pierres capturées, ou null si le coup est illégal. */
  play(p: number, col: Color): number[] | null {
    if (p === PASS) { this.ko = -1; return []; }
    const c = this.c; if (c[p] !== EMPTY || p === this.ko) return null;
    const o = opp(col); const captured: number[] = [];
    c[p] = col;
    for (const d of this.adj) {
      const r = p + d;
      if (c[r] === o) {
        const g = this.group(r);
        if (g.libs.length === 0) for (const q of g.stones) { c[q] = EMPTY; captured.push(q); }
      }
    }
    const own = this.group(p);
    if (own.libs.length === 0) { c[p] = EMPTY; return null; }
    this.ko = captured.length === 1 && own.stones.length === 1 && own.libs.length === 1 ? captured[0] : -1;
    return captured;
  }

  /** Œil simple pour la couleur col (utilisé par les parties aléatoires). */
  isEyeish(p: number, col: Color): boolean {
    const c = this.c, w = this.w;
    for (const d of this.adj) { const v = c[p + d]; if (v !== col && v !== EDGE) return false; }
    let bad = 0, edge = 0;
    for (const d of [w + 1, w - 1, -w + 1, -w - 1]) { const v = c[p + d]; if (v === EDGE) edge = 1; else if (v === opp(col)) bad++; }
    return bad + edge < 2;
  }

  hash(): string {
    let s = "";
    for (let i = 0; i < this.c.length; i++) if (this.c[i] !== EDGE) s += this.c[i];
    return s;
  }

  /** Nom d'un point : « D4 ». */
  name(p: number): string {
    if (p === PASS) return "passe";
    return COLS[this.x(p)] + (this.n - this.y(p));
  }
  parse(s: string): number {
    const t = s.trim().toUpperCase();
    if (t === "PASS" || t === "PASSE") return PASS;
    const x = COLS.indexOf(t[0]), r = parseInt(t.slice(1), 10);
    if (x < 0 || x >= this.n || !(r >= 1 && r <= this.n)) throw new Error("Point invalide : " + s);
    return this.idx(x, this.n - r);
  }

  /** Charge un diagramme : lignes de « . X O », du haut vers le bas. */
  static fromRows(rows: string[]): Board {
    const n = rows.length, b = new Board(n);
    rows.forEach((r, y) => {
      const cells = r.replace(/\s+/g, "");
      if (cells.length !== n) throw new Error(`Ligne ${y} de longueur ${cells.length} au lieu de ${n}`);
      for (let x = 0; x < n; x++) {
        const ch = cells[x];
        if (ch === "X" || ch === "x" || ch === "B") b.c[b.idx(x, y)] = BLACK;
        else if (ch === "O" || ch === "o" || ch === "W") b.c[b.idx(x, y)] = WHITE;
      }
    });
    return b;
  }
}

/** Score en surface (règles chinoises) avec une liste de pierres mortes. */
export function areaScore(b: Board, dead: Set<number> = new Set()) {
  const c = new Int8Array(b.c);
  for (const p of dead) c[p] = EMPTY;
  const seen = new Uint8Array(c.length);
  const owner = new Int8Array(c.length);
  let bs = 0, ws = 0, bt = 0, wt = 0;
  for (let p = 0; p < c.length; p++) {
    if (c[p] === BLACK) { bs++; owner[p] = BLACK; } else if (c[p] === WHITE) { ws++; owner[p] = WHITE; }
    else if (c[p] === EMPTY && !seen[p]) {
      const st = [p], reg: number[] = []; let touch = 0; seen[p] = 1;
      while (st.length) {
        const q = st.pop()!; reg.push(q);
        for (const d of b.adj) {
          const r = q + d, v = c[r];
          if (v === EMPTY && !seen[r]) { seen[r] = 1; st.push(r); }
          else if (v === BLACK) touch |= 1; else if (v === WHITE) touch |= 2;
        }
      }
      const o = touch === 1 ? BLACK : touch === 2 ? WHITE : 0;
      for (const q of reg) owner[q] = o;
      if (o === BLACK) bt += reg.length; else if (o === WHITE) wt += reg.length;
    }
  }
  return { blackStones: bs, whiteStones: ws, blackArea: bt, whiteArea: wt, black: bs + bt, white: ws + wt, owner };
}
