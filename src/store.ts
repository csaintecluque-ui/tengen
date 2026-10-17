/** Données locales : réglages, progression, parties. Tout reste sur l'appareil. */
import { useEffect, useState } from "preact/hooks";
import type { GameData } from "./engine/serial";

const KEY = "tengen.";
function read<T>(k: string, d: T): T { try { const v = localStorage.getItem(KEY + k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; } }
function readArr<T>(k: string): T[] { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : []; } catch { return []; } }
function write(k: string, v: unknown) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* stockage plein ou bloqué */ } }

export interface Settings {
  theme: "system" | "light" | "dark";
  confirmTap: boolean;
  coords: boolean;
  apiKey: string;
  claudeModel: string;
  autoKatago: boolean;
  showMoveNumbers: boolean;
}
export const CLAUDE_MODELS = [
  { id: "claude-haiku-5-5", name: "Haiku 5.5", desc: "Rapide et économique" },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", desc: "Le meilleur équilibre (recommandé)" },
  { id: "claude-opus-5-5", name: "Opus 5.5", desc: "Le plus fin, plus cher" }
];
const defaultSettings: Settings = { theme: "system", confirmTap: true, coords: true, apiKey: "", claudeModel: "claude-sonnet-5-5", autoKatago: true, showMoveNumbers: false };

export interface ProblemStat { ok: number; ko: number; box: number; due: number; last: number; }
export interface Progress {
  lessons: Record<string, number>;
  problems: Record<string, ProblemStat>;
  rating: number;      // échelle kyu « inversée » : 30 - kyu
  ratingGames: number;
  streakDays: string[];
}
const defaultProgress: Progress = { lessons: {}, problems: {}, rating: 2, ratingGames: 0, streakDays: [] };

export interface SavedGame {
  id: string; date: number; data: GameData;
  mode: "ai" | "claude" | "local"; level?: number; human?: 0 | 1 | 2;
  result?: string; winner?: 0 | 1 | 2; margin?: number;
  review?: { winrateBlack: number; leadBlack: number; best: number[]; policy: number }[];
  title?: string;
}

type L = () => void;
const listeners = new Set<L>();
const emit = () => listeners.forEach((f) => f());

export const store = {
  settings: read<Settings>("settings", defaultSettings),
  progress: read<Progress>("progress", defaultProgress),
  games: readArr<SavedGame>("games"),
  current: (() => { try { const v = localStorage.getItem(KEY + "current"); return v ? (JSON.parse(v) as SavedGame) : null; } catch { return null; } })(),

  setSettings(p: Partial<Settings>) { this.settings = { ...this.settings, ...p }; write("settings", this.settings); applyTheme(); emit(); },
  saveProgress() { write("progress", this.progress); emit(); },
  lessonDone(id: string) { this.progress.lessons[id] = Date.now(); this.markDay(); this.saveProgress(); },
  problemResult(id: string, ok: boolean) {
    const s = this.progress.problems[id] || { ok: 0, ko: 0, box: 0, due: 0, last: 0 };
    const DAY = 864e5, gaps = [1, 3, 7, 16, 35, 90];
    if (ok) { s.ok++; s.box = Math.min(5, s.box + 1); s.due = Date.now() + gaps[s.box] * DAY; }
    else { s.ko++; s.box = 0; s.due = Date.now() + 0.5 * DAY; }
    s.last = Date.now();
    this.progress.problems[id] = s; this.markDay(); this.saveProgress();
  },
  markDay() { const d = new Date().toISOString().slice(0, 10); if (!this.progress.streakDays.includes(d)) { this.progress.streakDays.push(d); this.progress.streakDays = this.progress.streakDays.slice(-400); } },
  /** Mise à jour de type Elo du niveau estimé, après une partie contre un niveau de force connue. */
  rateGame(opponentRating: number, won: boolean) {
    const p = this.progress, expected = 1 / (1 + Math.exp(-(p.rating - opponentRating) / 3));
    const k = p.ratingGames < 10 ? 2.2 : 1.1;
    p.rating = Math.max(0, Math.min(36, p.rating + k * ((won ? 1 : 0) - expected)));
    p.ratingGames++; this.saveProgress();
  },
  saveCurrent(g: SavedGame | null) { this.current = g; try { if (g) localStorage.setItem(KEY + "current", JSON.stringify(g)); else localStorage.removeItem(KEY + "current"); } catch { /* ignore */ } },
  saveGame(g: SavedGame) {
    const i = this.games.findIndex((x) => x.id === g.id);
    if (i >= 0) this.games[i] = g; else this.games.unshift(g);
    this.games = this.games.slice(0, 300); write("games", this.games); emit();
  },
  deleteGame(id: string) { this.games = this.games.filter((g) => g.id !== id); write("games", this.games); emit(); },
  resetProgress() { this.progress = { ...defaultProgress, lessons: {}, problems: {}, streakDays: [] }; this.saveProgress(); },
};

export function useStore() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return store;
}

export function applyTheme() {
  const t = store.settings.theme, root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
}
