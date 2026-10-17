import { Board } from "../src/go/board";
import { mcSearch } from "../src/engine/mcts";
const b = new Board(9);
const r = mcSearch(b, 1, 7.5, { timeMs: 1000 });
console.log("playouts/s", r.total, r.candidates.slice(0, 3).map((c) => [b.name(c.p), c.n, c.wr.toFixed(2)]));
