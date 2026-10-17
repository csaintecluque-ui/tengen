import { Game } from "../go/game";
import { BLACK, Color } from "../go/board";

/** Forme sérialisable d'une partie (pour le worker et la sauvegarde). */
export interface GameData {
  size: number; komi: number; handicap: number;
  setupBlack: number[]; setupWhite: number[];
  start: Color;
  moves: [Color, number][];
}

export function toData(g: Game): GameData {
  const start: Color = g.moves.length ? g.moves[0].col : g.toPlay;
  return { size: g.size, komi: g.komi, handicap: g.handicap, setupBlack: g.setupStones.black.slice(), setupWhite: g.setupStones.white.slice(), start, moves: g.moves.map((m) => [m.col, m.p]) };
}

export function fromData(d: GameData, upTo = Infinity): Game {
  const g = new Game(d.size, d.komi, 0);
  g.handicap = d.handicap;
  g.setupStones = { black: d.setupBlack.slice(), white: d.setupWhite.slice() };
  for (const p of d.setupBlack) g.board.c[p] = BLACK;
  for (const p of d.setupWhite) g.board.c[p] = 2;
  g.toPlay = d.start;
  for (let i = 0; i < d.moves.length && i < upTo; i++) { g.toPlay = d.moves[i][0]; if (!g.play(d.moves[i][1])) break; }
  return g;
}
