import { makeNet } from "./node-net";
import { Game } from "../src/go/game";
import { search } from "../src/katago/search";
import { readFileSync } from "fs";
const net = await makeNet();
const games = JSON.parse(readFileSync("/home/claude/dl/selfplay.json", "utf8"));
const L = "ABCDEFGHJ";
for (const gi of [1, 2]) {
  const gm = games[gi];
  for (let k = 38; k <= Math.min(58, gm.moves.length - 4); k += 2) {
    const g = new Game(9, 7);
    for (const [c, m] of gm.moves.slice(0, k)) { const p = m.toLowerCase() === "pass" ? -1 : g.board.idx(L.indexOf(m[0]), 9 - +m.slice(1)); g.toPlay = c === "B" ? 1 : 2; g.play(p); }
    g.toPlay = gm.moves[k][0] === "B" ? 1 : 2;
    const r = await search(net, g, 160);
    const c = r.candidates;
    const rows: string[] = []; for (let y = 0; y < 9; y++) { let s = ""; for (let x = 0; x < 9; x++) { const v = g.board.c[g.board.idx(x, y)]; s += v === 1 ? "X" : v === 2 ? "O" : "."; } rows.push(s); }
    console.log(gi, k, g.toPlay === 1 ? "B" : "W", c.slice(0, 4).map((x) => `${g.board.name(x.p)}:${x.visits}:${(x.winrate * 100).toFixed(0)}%:${x.lead.toFixed(1)}`).join(" "), JSON.stringify(rows));
  }
}
