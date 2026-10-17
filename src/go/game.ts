import { Board, Color, BLACK, WHITE, PASS, opp, areaScore } from "./board";

export interface Move { col: Color; p: number; }
interface Snapshot { cells: Int8Array; ko: number; caps: [number, number]; }

/** Une partie : plateau courant, historique complet (pour annuler, les entrées de KataGo et le SGF). */
export class Game {
  readonly size: number;
  komi: number;
  handicap: number;
  board: Board;
  toPlay: Color = BLACK;
  moves: Move[] = [];
  /** captures[0] = pierres prises par Noir, captures[1] = par Blanc */
  caps: [number, number] = [0, 0];
  private snaps: Snapshot[] = [];
  /** positions avant chaque coup (snaps[i] = position avant moves[i]) */
  setupStones: { black: number[]; white: number[] } = { black: [], white: [] };

  constructor(size: number, komi = 7.5, handicap = 0) {
    this.size = size; this.komi = komi; this.handicap = handicap;
    this.board = new Board(size);
    if (handicap >= 2) {
      for (const p of handicapPoints(size, handicap)) { this.board.c[this.board.idx(p[0], p[1])] = BLACK; this.setupStones.black.push(this.board.idx(p[0], p[1])); }
      this.toPlay = WHITE;
    }
  }

  static fromSetup(rows: string[], toPlay: Color, komi = 7.5): Game {
    const b = Board.fromRows(rows); const g = new Game(b.n, komi);
    g.board = b; g.toPlay = toPlay;
    for (const p of b.points()) { if (b.c[p] === BLACK) g.setupStones.black.push(p); else if (b.c[p] === WHITE) g.setupStones.white.push(p); }
    return g;
  }

  clone(): Game {
    const g = new Game(this.size, this.komi, 0);
    g.handicap = this.handicap; g.board = this.board.clone(); g.toPlay = this.toPlay; g.moves = this.moves.slice();
    g.caps = [this.caps[0], this.caps[1]]; g.snaps = this.snaps.slice(); g.setupStones = this.setupStones;
    return g;
  }

  isLegal(p: number): boolean { return this.board.isLegal(p, this.toPlay); }

  play(p: number): number[] | null {
    const snap: Snapshot = { cells: new Int8Array(this.board.c), ko: this.board.ko, caps: [this.caps[0], this.caps[1]] };
    const col = this.toPlay;
    const cap = this.board.play(p, col);
    if (cap === null) return null;
    this.snaps.push(snap);
    this.moves.push({ col, p });
    if (cap.length) this.caps[col === BLACK ? 0 : 1] += cap.length;
    this.toPlay = opp(col);
    return cap;
  }

  undo(): boolean {
    const s = this.snaps.pop(); if (!s) return false;
    const m = this.moves.pop()!;
    this.board.c.set(s.cells); this.board.ko = s.ko; this.caps = s.caps; this.toPlay = m.col;
    return true;
  }

  /** Plateau tel qu'il était k coups en arrière (k = 0 : position actuelle). */
  boardAgo(k: number): Board {
    if (k <= 0) return this.board;
    const i = this.snaps.length - k;
    if (i < 0) return this.snaps.length ? this.boardFromSnap(0) : this.board;
    return this.boardFromSnap(i);
  }
  private boardFromSnap(i: number): Board {
    const b = new Board(this.size); b.c.set(this.snaps[i].cells); b.ko = this.snaps[i].ko; return b;
  }

  lastMove(): Move | undefined { return this.moves[this.moves.length - 1]; }
  consecutivePasses(): number {
    let n = 0; for (let i = this.moves.length - 1; i >= 0 && this.moves[i].p === PASS; i--) n++; return n;
  }
  isOver(): boolean { return this.consecutivePasses() >= 2; }

  score(dead: Set<number> = new Set()) {
    const s = areaScore(this.board, dead);
    return { ...s, whiteTotal: s.white + this.komi, margin: s.black - (s.white + this.komi) };
  }

  /** Rejoue la partie jusqu'au coup n (0 = position initiale). */
  atMove(n: number): Game {
    const g = new Game(this.size, this.komi, 0);
    g.handicap = this.handicap; g.setupStones = this.setupStones;
    for (const p of this.setupStones.black) g.board.c[p] = BLACK;
    for (const p of this.setupStones.white) g.board.c[p] = WHITE;
    g.toPlay = this.moves.length ? this.moves[0].col : this.toPlay;
    for (let i = 0; i < n && i < this.moves.length; i++) { g.toPlay = this.moves[i].col; g.play(this.moves[i].p); }
    if (n >= this.moves.length) g.toPlay = this.toPlay;
    return g;
  }
}

/** Points de handicap traditionnels (x, y depuis le coin haut-gauche). */
export function handicapPoints(n: number, h: number): [number, number][] {
  const e = n >= 13 ? 3 : 2, f = n - 1 - e, m = (n - 1) / 2;
  const corners: [number, number][] = [[f, e], [e, f], [f, f], [e, e]];
  const sides: [number, number][] = [[e, m], [f, m], [m, e], [m, f]];
  const center: [number, number] = [m, m];
  if (h <= 4) return corners.slice(0, h);
  if (h === 5) return [...corners, center];
  if (h === 6) return [...corners, sides[0], sides[1]];
  if (h === 7) return [...corners, sides[0], sides[1], center];
  if (h === 8) return [...corners, ...sides];
  return [...corners, ...sides, center];
}

export { BLACK, WHITE, PASS };
