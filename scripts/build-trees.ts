/**
 * Génère, avec le solveur exact, les solutions des problèmes et des étapes « goal » des leçons :
 *  - win : premiers coups gagnants ;
 *  - refute : pour chaque coup perdant étudié, la réfutation de l'adversaire ;
 *  - pv : pour chaque coup gagnant, une suite principale (réponse adverse la plus coriace, puis coup gagnant…).
 * Sortie : src/content/trees.json. Relancer après toute modification du contenu : npm run trees
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { Board, Color, PASS, opp } from "../src/go/board";
import { Goal, goalWon, goalSettled, candidateMoves } from "../src/go/solver";
import { PROBLEMS } from "../src/content/problems";
import { MODULES } from "../src/content/index";
import type { GoalSpec } from "../src/content/types";
import { parseRegion } from "./explore";

export interface Solution { win: string[]; refute: Record<string, string>; pv: Record<string, string[]>; }

function toGoal(b: Board, g: GoalSpec): Goal {
  const t = b.parse(g.target);
  if (g.type === "kill" || g.type === "live") return { type: g.type, target: t, region: parseRegion(b, g.region) };
  return { type: g.type, target: t };
}

const BUDGET = 40000;

function userWinning(b: Board, goal: Goal, user: Color): number | null {
  for (const m of candidateMoves(b, goal, user)) {
    if (!b.isLegal(m, user)) continue;
    const nb = b.clone(); nb.play(m, user);
    const st = goalSettled(nb, goal, user);
    if (st === "won") return m;
    if (st === "lost") continue;
    if (goalWon(nb, goal, opp(user), BUDGET) === true) return m;
  }
  return null;
}

function resist(b: Board, goal: Goal, opponent: Color, user: Color): number {
  const cands = candidateMoves(b, goal, opponent).filter((m) => b.isLegal(m, opponent));
  const opponentDefends = goal.type === "capture" || goal.type === "kill";
  let best = PASS, bestScore = -1e9;
  for (const m of cands) {
    const nb = b.clone(); nb.play(m, opponent);
    if (goalSettled(nb, goal, user) === "won") continue;
    const t = nb.c[goal.target] ? nb.libCount(goal.target, 8) : 0;
    let score = opponentDefends ? t : -t;
    if (goal.type === "kill" || goal.type === "live") { let adj = 0; for (const d of nb.adj) if (nb.c[m + d] === user) adj++; score += adj * 0.1; }
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

function principal(b0: Board, goal: Goal, user: Color, first: number): string[] {
  const seq: string[] = []; let b = b0.clone(); b.play(first, user);
  const opponent = opp(user);
  for (let k = 0; k < 24; k++) {
    if (goalSettled(b, goal, user)) break;
    // le problème est réglé si l'utilisateur gagne même en passant
    const pb = b.clone(); pb.play(PASS, opponent); pb.play(PASS, user);
    const r = resist(b, goal, opponent, user);
    if (r === PASS) break;
    b = b.clone(); b.play(r, opponent); seq.push(b.name(r));
    if (goalSettled(b, goal, user)) break;
    const pass = b.clone(); pass.play(PASS, user);
    if (goal.type !== "capture" && goalWon(pass, goal, opponent, BUDGET / 4) === true) break;
    const u = userWinning(b, goal, user);
    if (u === null) break;
    b = b.clone(); b.play(u, user); seq.push(b.name(u));
  }
  return seq;
}

function solve(rows: string[], toPlay: Color, spec: GoalSpec): Solution {
  const b = Board.fromRows(rows), goal = toGoal(b, spec), user = toPlay, opponent = opp(user);
  const sol: Solution = { win: [], refute: {}, pv: {} };
  for (const m of candidateMoves(b, goal, user)) {
    if (!b.isLegal(m, user)) continue;
    const nb = b.clone(); nb.play(m, user);
    const name = b.name(m), st = goalSettled(nb, goal, user);
    let wins: boolean | null = st === "won" ? true : st === "lost" ? false : goalWon(nb, goal, opponent, BUDGET);
    if (wins === null) { console.warn("   ! budget dépassé :", name); continue; }
    if (wins) { sol.win.push(name); sol.pv[name] = st === "won" ? [] : principal(b, goal, user, m); continue; }
    for (const r of candidateMoves(nb, goal, opponent)) {
      if (!nb.isLegal(r, opponent)) continue;
      const rb = nb.clone(); rb.play(r, opponent);
      if (goalSettled(rb, goal, user) === "lost" || goalWon(rb, goal, user, BUDGET / 2) === false) { sol.refute[name] = nb.name(r); break; }
    }
  }
  return sol;
}

const only = process.argv[2];
const prev: Record<string, Solution> = existsSync("src/content/trees.json") ? JSON.parse(readFileSync("src/content/trees.json", "utf8")) : {};
const out: Record<string, Solution> = {};
const items: { key: string; rows: string[]; toPlay: Color; goal: GoalSpec }[] = [];
for (const p of PROBLEMS) if (p.goal) items.push({ key: p.id, rows: p.rows, toPlay: p.toPlay, goal: p.goal });
for (const m of MODULES) for (const l of m.lessons) l.steps.forEach((s, i) => {
  if (s.task?.type === "goal" && s.board) items.push({ key: `${l.id}#${i}`, rows: s.board, toPlay: (s.toPlay ?? 1) as Color, goal: s.task.goal });
});
let bad = 0;
for (const it of items) {
  if (only && !it.key.includes(only) && prev[it.key]) { out[it.key] = prev[it.key]; continue; }
  const t0 = Date.now();
  const s = solve(it.rows, it.toPlay, it.goal);
  out[it.key] = s;
  if (!s.win.length) bad++;
  console.log(`${it.key.padEnd(22)} gagnants: ${s.win.map((w) => w + (s.pv[w].length ? `(+${s.pv[w].length})` : "")).join(" ") || "AUCUN !"}  réfutations: ${Object.keys(s.refute).length}  ${Date.now() - t0} ms`);
}
writeFileSync("src/content/trees.json", JSON.stringify(out));
console.log("écrit", Object.keys(out).length, "solutions", bad ? `— ${bad} SANS SOLUTION` : "");
