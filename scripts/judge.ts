import { makeNet } from "./node-net";
import { Game } from "../src/go/game";
import { Board } from "../src/go/board";
import { search } from "../src/katago/search";
import { readFileSync } from "fs";
const net = await makeNet();
async function judge(label: string, rows: string[], toPlay: 1|2, komi=7, visits=300) {
  const b = Board.fromRows(rows); const g = new Game(b.n, komi); g.board = b; g.toPlay = toPlay;
  const r = await search(net, g, visits);
  console.log(label, "win", r.winrate.toFixed(3), r.candidates.slice(0, 8).map((c) => `${b.name(c.p)}:${c.visits}:${(c.winrate*100).toFixed(1)}%:${c.lead.toFixed(1)}`).join("  "));
}
await judge("tete", [".........", ".........", ".........", ".........", "...OX....", "...OX....", ".........", ".........", "........."], 1);
await judge("open9", [".........", ".........", ".........", ".........", "....X....", "......O..", ".........", ".........", "........."], 1, 7, 400);
// positions des parties
const games = JSON.parse(readFileSync("/home/claude/dl/selfplay.json", "utf8"));
const L = "ABCDEFGHJ";
games.forEach((gm: any, gi: number) => {
  const g = new Game(9, 7);
  for (const [c, m] of gm.moves) { const p = m.toLowerCase() === "pass" ? -1 : g.board.idx(L.indexOf(m[0]), 9 - +m.slice(1)); g.toPlay = c === "B" ? 1 : 2; g.play(p); }
  const rows: string[] = []; for (let y = 0; y < 9; y++) { let s = ""; for (let x = 0; x < 9; x++) { const v = g.board.c[g.board.idx(x, y)]; s += v === 1 ? "X" : v === 2 ? "O" : "."; } rows.push(s); }
  const sc = g.score(); console.log("game", gi, gm.final, "area B", sc.black, "W", sc.white, JSON.stringify(rows));
});
