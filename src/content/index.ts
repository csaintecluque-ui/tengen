import type { Module } from "./types";
import { RULES } from "./lessons-rules";
import { TACTICS } from "./lessons-tactics";
import { LIFE } from "./lessons-life";
import { SHAPES, OPENING, MIDDLE, ENDGAME } from "./lessons-strategy";

export const MODULES: Module[] = [RULES, TACTICS, LIFE, SHAPES, OPENING, MIDDLE, ENDGAME];

export function findLesson(id: string) {
  for (const m of MODULES) { const i = m.lessons.findIndex((l) => l.id === id); if (i >= 0) return { module: m, lesson: m.lessons[i], index: i }; }
  return null;
}
export function nextLesson(id: string) {
  const all = MODULES.flatMap((m) => m.lessons);
  const i = all.findIndex((l) => l.id === id);
  return i >= 0 && i < all.length - 1 ? all[i + 1] : null;
}
export const ALL_LESSONS = MODULES.flatMap((m) => m.lessons);
