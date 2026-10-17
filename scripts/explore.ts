import { Board } from "../src/go/board";
import { winningMoves, Goal } from "../src/go/solver";
export function W(rows: string[], goal: "capture"|"escape"|"kill"|"live", target: string, toPlay: 1|2 = 1, region?: string) {
  const b = Board.fromRows(rows);
  const t = b.parse(target);
  let g: Goal;
  if (goal === "kill" || goal === "live") g = { type: goal, target: t, region: parseRegion(b, region!) };
  else g = { type: goal, target: t };
  const t0 = Date.now();
  const w = winningMoves(b, g, toPlay);
  return w.map((p) => b.name(p)).join(",") + `  (${Date.now() - t0}ms)`;
}
export function parseRegion(b: Board, s: string): number[] {
  const out: number[] = [];
  for (const part of s.trim().split(/\s+/)) {
    if (part.includes(":")) { const [a, c] = part.split(":"); const pa = b.parse(a), pc = b.parse(c);
      for (let x = Math.min(b.x(pa), b.x(pc)); x <= Math.max(b.x(pa), b.x(pc)); x++) for (let y = Math.min(b.y(pa), b.y(pc)); y <= Math.max(b.y(pa), b.y(pc)); y++) out.push(b.idx(x, y)); }
    else out.push(b.parse(part));
  }
  return out;
}
