import type { Problem, Rows, GoalSpec } from "./types";
import { COLS } from "../go/board";

/* ---------- transformations (rotation / symétrie) pour varier les orientations ---------- */
type T = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
function tf(x: number, y: number, n: number, t: T): [number, number] {
  let a = x, b = y;
  if (t & 4) [a, b] = [b, a];
  if (t & 2) a = n - 1 - a;
  if (t & 1) b = n - 1 - b;
  return [a, b];
}
function tRows(rows: Rows, t: T): Rows {
  const n = rows.length, out = Array.from({ length: n }, () => Array(n).fill("."));
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const [a, b] = tf(x, y, n, t); out[b][a] = ch; }));
  return out.map((r) => r.join(""));
}
function tPt(s: string, n: number, t: T): string {
  const x = COLS.indexOf(s[0]), y = n - parseInt(s.slice(1), 10);
  const [a, b] = tf(x, y, n, t); return COLS[a] + (n - b);
}
function tRegion(s: string, n: number, t: T): string {
  return s.split(/\s+/).map((part) => part.includes(":") ? part.split(":").map((p) => tPt(p, n, t)).join(":") : tPt(part, n, t)).join(" ");
}
function tGoal(g: GoalSpec, n: number, t: T): GoalSpec {
  if (g.type === "kill" || g.type === "live") return { ...g, target: tPt(g.target, n, t), region: tRegion(g.region, n, t) };
  return { ...g, target: tPt(g.target, n, t) };
}
function variant(p: Problem, t: T, id: string, title?: string): Problem {
  const n = p.rows.length;
  return { ...p, id, title: title ?? p.title, rows: tRows(p.rows, t), goal: p.goal && tGoal(p.goal, n, t), accept: p.accept?.map((a) => tPt(a, n, t)) };
}

/* ---------- problèmes de base ---------- */
const BASE: Problem[] = [
  // Captures
  { id: "cap-1", title: "Une seule liberté", theme: "Capturer", level: 1, toPlay: 1,
    rows: [".......", ".......", "...X...", "..XO...", "...X...", ".......", "......."],
    prompt: "Capture la pierre blanche.", accept: ["E4"], hint: "Compte ses libertés : il n'en reste qu'une.", explain: "Boucher la dernière liberté capture la pierre." },
  { id: "cap-2", title: "Sur le bord", theme: "Capturer", level: 1, toPlay: 1,
    rows: [".......", ".......", ".......", ".......", ".......", "..XXX..", ".XOO..."],
    prompt: "Capture les deux pierres blanches.", accept: ["E1"], hint: "La chaîne n'a qu'une liberté, le long du bord.", explain: "Le bord prive la chaîne de libertés : une seule suffit à la capturer." },
  { id: "cap-3", title: "Trois d'un coup", theme: "Capturer", level: 1, toPlay: 1,
    rows: [".......", ".......", ".XXXX..", "XOOOX..", ".XX.X..", ".......", "......."],
    prompt: "Capture toute la chaîne blanche.", accept: ["D3"], hint: "Une seule intersection vide touche la chaîne.", explain: "Une chaîne partage ses libertés : boucher la dernière prend toutes ses pierres." },
  { id: "esc-1", title: "S'échapper", theme: "Sauver ses pierres", level: 1, toPlay: 1,
    rows: [".......", ".......", "...O...", "..OX...", "...O...", ".......", "......."],
    prompt: "Ta pierre est en atari. Sauve-la.", goal: { type: "escape", target: "D4" }, hint: "Prolonge vers l'espace libre.", explain: "En prolongeant, ta chaîne gagne des libertés et ne peut plus être prise tout de suite." },
  { id: "cap-dir", title: "Le bon côté", theme: "Capturer", level: 2, toPlay: 1,
    rows: [".......", ".......", ".......", ".......", "...X...", "..XO...", "......."],
    prompt: "Capture la pierre blanche D2.", goal: { type: "capture", target: "D2" }, hint: "Mets en atari de façon à pousser la pierre vers le bord.", explain: "Pousser vers le bord : la pierre blanche n'y trouve pas de libertés." },
  { id: "cap-corner", title: "Dans le coin", theme: "Capturer", level: 1, toPlay: 1,
    rows: [".......", ".......", ".......", ".......", ".......", "X......", "O......"],
    prompt: "Capture la pierre blanche du coin.", accept: ["B1"], hint: "Dans le coin, il ne lui reste qu'une liberté.", explain: "Dans le coin, une pierre n'a que deux libertés : une seule pierre adverse la met en atari." },

  // Échelles
  { id: "lad-1", title: "L'échelle", theme: "Échelle", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", "....X....", "...XO....", "...X.....", ".........", ".........", "........."],
    prompt: "Capture la pierre blanche E5.", goal: { type: "capture", target: "E5" }, hint: "Mets en atari du côté libre : Blanc devra fuir vers ta pierre D4.", explain: "Chaque fuite blanche retombe en atari : c'est l'échelle, jusqu'au bord." },
  { id: "lad-2", title: "Échelle au bord", theme: "Échelle", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", ".........", ".........", "..X......", ".XO......", ".X......."],
    prompt: "Capture la pierre blanche C2.", goal: { type: "capture", target: "C2" }, hint: "Ne la laisse pas filer vers la droite.", explain: "Le bord fait office de mur : l'échelle y est très courte." },

  // Prise-reprise
  { id: "snap-1", title: "Prise-reprise", theme: "Prise-reprise", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", ".........", ".........", "XXXX.....", "OOOX.....", "..OX....."],
    prompt: "Capture les pierres blanches du coin.", goal: { type: "capture", target: "A2" }, hint: "Sacrifie une pierre dans une liberté blanche.", explain: "Si Blanc capture ta pierre, il se met lui-même en atari et tu reprends tout." },

  // Course aux libertés
  { id: "race-1", title: "La course", theme: "Course aux libertés", level: 3, toPlay: 1,
    rows: [".......", ".......", ".......", "OOOXXXX", "O.XO.X.", "O.XO.X.", "O.XO.X."],
    prompt: "Noir joue et gagne la course aux libertés.", accept: ["E1", "E2", "E3"], hint: "Bouche les libertés de Blanc par l'extérieur.", explain: "Trois libertés partout : celui qui commence gagne, en réduisant l'adversaire depuis l'extérieur." },

  // Vie et mort
  { id: "ld-st3-live", title: "Trois en ligne", theme: "Vie et mort", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", ".........", ".........", "OOOOOO...", "XXXXXO...", "X...XO..."],
    prompt: "Noir joue et vit.", goal: { type: "live", target: "A2", region: "B1:D1" }, hint: "Le point du milieu.", explain: "Le point vital sépare l'espace en deux yeux." },
  { id: "ld-st3-kill", title: "Trois en ligne", theme: "Vie et mort", level: 2, toPlay: 2,
    rows: [".........", ".........", ".........", ".........", ".........", ".........", "OOOOOO...", "XXXXXO...", "X...XO..."],
    prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "B1:D1" }, hint: "Le même point que pour vivre.", explain: "Le point vital pour vivre est aussi le point vital pour tuer." },
  { id: "ld-bent3", title: "Le coude", theme: "Vie et mort", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", ".........", "OOOOO....", "XXXXO....", ".XXXO....", "..XXO...."],
    prompt: "Noir joue et vit.", goal: { type: "live", target: "B2", region: "A1 A2 B1" }, hint: "Le point qui touche les deux autres.", explain: "Le coin du coude sépare l'espace en deux yeux." },
  { id: "ld-corner3", title: "Le coin", theme: "Vie et mort", level: 2, toPlay: 2,
    rows: [".........", ".........", ".........", ".........", ".........", ".........", "OOOOO....", "XXXXO....", "...XO...."],
    prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "A1:C1" }, hint: "Le milieu de l'espace.", explain: "Trois en ligne : le point du centre tue." },
  { id: "ld-bulky5", title: "Cinq en bloc", theme: "Vie et mort", level: 3, toPlay: 2,
    rows: [".........", ".........", ".........", ".........", ".........", "OOOOOO...", "XXXXXO...", "X..XXO...", "X...XO..."],
    prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "B1:D1 B2:C2" }, hint: "Le point au cœur de la forme.", explain: "Cinq en bloc a un seul point vital, celui qui touche trois points de l'espace." },
  { id: "ld-l", title: "L'équerre", theme: "Vie et mort", level: 3, toPlay: 2,
    rows: [".......", ".......", "OOOOO..", "XXXXO..", "X..XO..", "X.XXO..", "XXXXO.."],
    prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A4", region: "B3 C3 B2" }, hint: "Trois points en coude : vise celui qui touche les deux autres.", explain: "Le point vital d'un coude est l'angle." },
  { id: "ld-tuer-left", title: "Le bord gauche", theme: "Vie et mort", level: 2, toPlay: 1,
    rows: ["OOOOX..", "...OX..", "OOOOX..", "XXXX...", ".......", ".......", "......."],
    prompt: "Le groupe blanc a trois points d'espace. Empêche-le de faire deux yeux.", goal: { type: "kill", target: "A7", region: "A6:C6" }, hint: "Joue au milieu de l'espace blanc.", explain: "Blanc ne peut plus faire qu'un œil : le groupe est mort." },

  // Couper / relier (coups acceptés)
  { id: "cut-1", title: "Couper", theme: "Couper et relier", level: 1, toPlay: 1,
    rows: [".......", ".......", "..XO...", "..O....", ".......", ".......", "......."],
    prompt: "Les deux pierres blanches se touchent en diagonale. Sépare-les.", accept: ["D4"], hint: "Une diagonale a deux points de coupe. L'un est déjà à toi.", explain: "Coupées : Blanc doit maintenant défendre deux pierres isolées." },
  { id: "da-1", title: "Double atari", theme: "Double atari", level: 1, toPlay: 1,
    rows: [".......", ".......", "..X.X..", "..O.O..", "..X.X..", ".......", "......."],
    prompt: "Mets deux pierres blanches en atari d'un seul coup.", accept: ["D4"], hint: "Joue entre les deux pierres blanches.", explain: "Blanc ne peut en sauver qu'une : tu captureras l'autre." },
];

/* Problèmes de jugement : réponses vérifiées par une recherche KataGo (voir scripts/judge.ts). */
const JUDGE: Problem[] = [
  { id: "tete", title: "Frapper la tête", theme: "Formes", level: 2, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", "...OX....", "...OX....", ".........", ".........", "........."],
    prompt: "Noir joue le meilleur coup.", accept: ["D6"], hint: "« Frappe la tête de deux pierres. »", explain: "Le hane à la tête des deux pierres blanches : KataGo l'estime nettement meilleur que tout autre coup." },
  { id: "open9-g4", title: "Ouverture 9×9", theme: "Ouverture", level: 3, toPlay: 1,
    rows: [".........", ".........", ".........", ".........", "....X....", "......O..", ".........", ".........", "........."],
    prompt: "Noir joue le coup préféré de KataGo.", accept: ["F3"], hint: "Empêche la pierre blanche de s'installer en bas.", explain: "F3 bloque Blanc du côté du bas ; KataGo le préfère à toute autre réponse." },
  { id: "yose-hane", title: "Le hane au bord", theme: "Fin de partie", level: 2, toPlay: 1,
    rows: ["....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "........."],
    prompt: "Noir joue le meilleur coup de fin de partie.", accept: ["F1"], hint: "Entre d'un pas dans le camp blanc, sur la première ligne.", explain: "Le hane en F1 rapporte environ deux points de plus qu'un simple blocage en E1." },
];

/* Variantes tournées pour s'entraîner à reconnaître les formes dans toutes les orientations. */
const VARIANTS: Problem[] = [
  variant(BASE.find((p) => p.id === "lad-1")!, 6, "lad-1b", "L'échelle (2)"),
  variant(BASE.find((p) => p.id === "snap-1")!, 2, "snap-1b", "Prise-reprise (2)"),
  variant(BASE.find((p) => p.id === "ld-st3-kill")!, 1, "ld-st3-kill-b", "Trois en ligne (2)"),
  variant(BASE.find((p) => p.id === "ld-bent3")!, 3, "ld-bent3-b", "Le coude (2)"),
  variant(BASE.find((p) => p.id === "ld-bulky5")!, 6, "ld-bulky5-b", "Cinq en bloc (2)"),
  variant(BASE.find((p) => p.id === "cap-dir")!, 5, "cap-dir-b", "Le bon côté (2)"),
  variant(BASE.find((p) => p.id === "lad-2")!, 3, "lad-2b", "Échelle au bord (2)"),
  variant(BASE.find((p) => p.id === "ld-corner3")!, 2, "ld-corner3-b", "Le coin (2)"),
  variant(BASE.find((p) => p.id === "esc-1")!, 3, "esc-1b", "S'échapper (2)"),
  variant(BASE.find((p) => p.id === "ld-l")!, 2, "ld-l-b", "L'équerre (2)"),
  variant(BASE.find((p) => p.id === "ld-tuer-left")!, 4, "ld-tuer-top", "Le bord du haut"),
  variant(BASE.find((p) => p.id === "ld-st3-live")!, 3, "ld-st3-live-b", "Trois en ligne (3)"),
  variant(BASE.find((p) => p.id === "ld-bent3")!, 1, "ld-bent3-c", "Le coude (3)"),
  variant(BASE.find((p) => p.id === "snap-1")!, 3, "snap-1c", "Prise-reprise (3)"),
  variant(BASE.find((p) => p.id === "lad-1")!, 3, "lad-1c", "L'échelle (3)"),
  variant(BASE.find((p) => p.id === "ld-bulky5")!, 2, "ld-bulky5-c", "Cinq en bloc (3)"),
  variant(BASE.find((p) => p.id === "cap-3")!, 2, "cap-3b", "Trois d'un coup (2)"),
  variant(BASE.find((p) => p.id === "da-1")!, 4, "da-1b", "Double atari (2)"),
  variant(BASE.find((p) => p.id === "cut-1")!, 1, "cut-1b", "Couper (2)"),
  variant(BASE.find((p) => p.id === "race-1")!, 2, "race-1b", "La course (2)"),
  variant(JUDGE[0], 2, "tete-b", "Frapper la tête (2)"),
];

export const PROBLEMS: Problem[] = [...BASE, ...JUDGE, ...VARIANTS].sort((a, b) => a.level - b.level);
export const THEMES = Array.from(new Set(PROBLEMS.map((p) => p.theme)));
