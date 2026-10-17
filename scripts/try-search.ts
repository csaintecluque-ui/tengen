import { makeNet } from "./node-net";
import { Game } from "../src/go/game";
import { search } from "../src/katago/search";
const net = await makeNet();
for (const size of [9, 19]) {
  const g = new Game(size, 7.5);
  let t = Date.now(); const e = await net.evaluate(g); const t1 = Date.now() - t;
  t = Date.now(); const r = await search(net, g, 50); const t2 = Date.now() - t;
  console.log(size, "eval ms", t1, "search 50 ms", t2, "win", e.winrate.toFixed(3), r.candidates.slice(0, 3).map((c) => [g.board.name(c.p), c.visits, c.winrate.toFixed(3), c.lead.toFixed(1)]));
}
