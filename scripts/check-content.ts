import { Board } from "../src/go/board";
import { MODULES } from "../src/content/index";
import { PROBLEMS } from "../src/content/problems";
import TREES from "../src/content/trees.json";
let errors = 0; const err = (m: string) => { errors++; console.log("ERREUR", m); };
const ids = new Set<string>();
function checkBoard(key: string, rows: string[], toPlay: 1 | 2, task: any, marks?: Record<string, string>, koAt?: string) {
  let b: Board; try { b = Board.fromRows(rows); } catch (e) { err(key + " " + (e as Error).message); return; }
  // pierres sans liberté = position impossible
  for (const p of b.points()) if (b.c[p] && b.group(p).libs.length === 0) err(`${key} : chaîne sans liberté en ${b.name(p)}`);
  for (const k of Object.keys(marks || {})) try { b.parse(k); } catch { err(`${key} : marque invalide ${k}`); }
  if (koAt) try { b.parse(koAt); } catch { err(`${key} : ko invalide`); }
  if (!task) return;
  if (task.type === "move" || task.type === "accept") for (const a of task.accept) { try { const p = b.parse(a); if (!b.isLegal(p, toPlay)) err(`${key} : coup accepté illégal ${a}`); } catch { err(`${key} : coup accepté invalide ${a}`); } }
  if (task.type === "illegal") { const p = b.parse(task.at); if (b.isLegal(p, toPlay)) err(`${key} : ${task.at} devrait être interdit`); }
  if (task.type === "quiz" && !(task.answer >= 0 && task.answer < task.options.length)) err(`${key} : réponse de quiz hors limites`);
  if (task.type === "goal" && !(TREES as any)[key]?.win?.length) err(`${key} : aucune solution calculée`);
}
for (const m of MODULES) for (const l of m.lessons) {
  if (ids.has(l.id)) err("id de leçon en double " + l.id); ids.add(l.id);
  l.steps.forEach((s, i) => { if (s.board) checkBoard(`${l.id}#${i}`, s.board, s.toPlay ?? 1, s.task, s.marks as any, s.koAt); });
}
const pids = new Set<string>();
for (const p of PROBLEMS) {
  if (pids.has(p.id)) err("id de problème en double " + p.id); pids.add(p.id);
  checkBoard(p.id, p.rows, p.toPlay, p.goal ? { type: "goal" } : { type: "accept", accept: p.accept || [] });
  if (!p.goal && !(p.accept || []).length) err(p.id + " : ni objectif ni coups acceptés");
}
console.log(`${MODULES.reduce((a, m) => a + m.lessons.length, 0)} leçons, ${PROBLEMS.length} problèmes, ${errors} erreur(s)`);
if (errors) process.exit(1);
