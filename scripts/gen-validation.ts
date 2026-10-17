import { Game } from "../src/go/game";
import { PASS } from "../src/go/board";
import { fillInputs, NUM_SPATIAL, NUM_GLOBAL } from "../src/katago/features";
import { writeFileSync } from "fs";
let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const out: any[] = [];
for (const [size, count] of [[9, 40], [13, 15], [19, 10]] as const) {
  for (let k = 0; k < count; k++) {
    const g = new Game(size, 7.5);
    const len = 10 + Math.floor(rnd() * size * size * 0.9);
    for (let i = 0; i < len; i++) {
      const last = g.lastMove();
      let p = PASS;
      for (let t = 0; t < 30; t++) {
        let x: number, y: number;
        if (last && last.p !== PASS && rnd() < 0.7) { x = g.board.x(last.p) + Math.floor(rnd() * 5) - 2; y = g.board.y(last.p) + Math.floor(rnd() * 5) - 2; }
        else { x = Math.floor(rnd() * size); y = Math.floor(rnd() * size); }
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const q = g.board.idx(x, y);
        if (g.isLegal(q) && !g.board.isEyeish(q, g.toPlay)) { p = q; break; }
      }
      if (rnd() < 0.02) p = PASS;
      if (p === PASS && g.lastMove()?.p === PASS) break;
      g.play(p);
    }
    const HW = size * size, bin = new Float32Array(NUM_SPATIAL * HW), glob = new Float32Array(NUM_GLOBAL);
    fillInputs(g, bin, glob);
    out.push({ size, moves: g.moves.map((m) => [m.col === 1 ? "B" : "W", g.board.name(m.p)]), bin: Array.from(bin), glob: Array.from(glob), toPlay: g.toPlay,
      ladders: bin.slice(14 * HW, 15 * HW).reduce((a, v) => a + v, 0) });
  }
}
writeFileSync("/home/claude/dl/validation.json", JSON.stringify(out));
console.log(out.length, "positions, avec échelles:", out.filter((o) => o.ladders > 0).length);
