import type { Shape, View } from "../ui/Goban";

/** Diagramme : lignes du haut vers le bas, « X » Noir, « O » Blanc, « . » vide. */
export type Rows = string[];

/** Objectif résolu en direct par le solveur (problèmes et certaines étapes de leçon). */
export type GoalSpec =
  | { type: "capture" | "escape"; target: string }
  | { type: "kill" | "live"; target: string; region: string };   // region : « A1:E4 » ou liste « A1 B1 C2 »

export type Task =
  | { type: "read"; prompt?: string }
  | { type: "free"; prompt: string }
  | { type: "quiz"; prompt: string; options: string[]; answer: number }
  | { type: "move"; prompt: string; accept: string[]; hint: string; replies?: Record<string, string> }
  | { type: "goal"; prompt: string; goal: GoalSpec; hint: string }
  | { type: "illegal"; prompt: string; at: string };

export interface Step {
  text: string;
  board?: Rows;
  toPlay?: 1 | 2;
  view?: View;
  marks?: Record<string, Shape | string>;
  koAt?: string;
  task?: Task;
  ok?: string;
  /** annotations montrées après réussite */
  show?: { libs?: string; terr?: boolean; marks?: Record<string, Shape | string> };
}

export interface Lesson { id: string; title: string; sub: string; steps: Step[]; }
export interface Module { id: string; title: string; kanji: string; sub: string; lessons: Lesson[]; }

export interface Problem {
  id: string;
  title: string;
  theme: string;
  level: 1 | 2 | 3 | 4 | 5;
  rows: Rows;
  toPlay: 1 | 2;
  prompt: string;
  goal?: GoalSpec;
  /** pour les problèmes de jugement (sans solveur) : coups acceptés */
  accept?: string[];
  hint: string;
  explain: string;
  view?: View;
}

export type Block =
  | { p: string }
  | { h: string }
  | { list: string[] }
  | { board: Rows; caption?: string; marks?: Record<string, Shape | string>; view?: View }
  | { quote: string; by?: string }
  | { link: string; label: string; note?: string };

export interface Article { id: string; title: string; sub: string; group: string; body: Block[]; }
export interface GlossaryEntry { term: string; jp?: string; def: string; tags?: string[]; }
export interface Proverb { fr: string; jp?: string; explain: string; }
