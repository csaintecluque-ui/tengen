/**
 * Le professeur Claude : appels directs à l'API d'Anthropic depuis l'appareil, avec la clé de l'utilisateur.
 * La clé est conservée uniquement dans le stockage local de l'appareil ; elle n'est jamais dans le code ni sur GitHub.
 */
import { store } from "../store";
import { Game } from "../go/game";
import { COLS, PASS, BLACK } from "../go/board";

export class ClaudeError extends Error { constructor(public code: string, msg: string) { super(msg); } }

export function hasKey() { return !!store.settings.apiKey.trim(); }

const SYSTEM = `Tu es le professeur de go de Tengen, une appli pour apprendre le go en français.
Ton élève débute : il connaît les règles mais peu la stratégie. Tu expliques simplement, avec des mots concrets, sans jargon non expliqué.
Quand tu emploies un terme japonais (atari, sente, gote, joseki, tesuji…), donne son sens en quelques mots la première fois.
Cite toujours les intersections avec leurs coordonnées (ex. D4). Les colonnes vont de A à T sans la lettre I, la ligne 1 est en bas.
Appuie-toi sur les chiffres du moteur KataGo fournis : ils sont fiables. Ne contredis pas le moteur sur la valeur d'un coup ; explique plutôt POURQUOI.
Réponds en français, en texte simple, sans titres ni tableaux. Sois chaleureux et encourageant mais honnête.`;

export function boardText(g: Game): string {
  const b = g.board, n = b.n;
  let s = "   " + COLS.slice(0, n).split("").join(" ") + "\n";
  for (let y = 0; y < n; y++) {
    let row = String(n - y).padStart(2, " ") + " ";
    for (let x = 0; x < n; x++) { const v = b.c[b.idx(x, y)]; row += (v === 1 ? "X" : v === 2 ? "O" : ".") + (x < n - 1 ? " " : ""); }
    s += row + "\n";
  }
  return s + "(X = Noir, O = Blanc)";
}
export function lastMovesText(g: Game, k = 8): string {
  const mv = g.moves.slice(-k);
  if (!mv.length) return "aucun";
  return mv.map((m, i) => `${g.moves.length - mv.length + i + 1}. ${m.col === BLACK ? "Noir" : "Blanc"} ${m.p === PASS ? "passe" : g.board.name(m.p)}`).join(", ");
}

export async function ask(prompt: string, opts: { onText?: (t: string) => void; signal?: AbortSignal; maxTokens?: number; system?: string } = {}): Promise<string> {
  const key = store.settings.apiKey.trim();
  if (!key) throw new ClaudeError("no_key", "Ajoute ta clé API dans Réglages pour utiliser Claude.");
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: opts.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: store.settings.claudeModel, max_tokens: opts.maxTokens ?? 700, stream: true, system: opts.system ?? SYSTEM, messages: [{ role: "user", content: prompt }] })
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ClaudeError("cancelled", "Arrêté.");
    throw new ClaudeError("network", "Pas de connexion à Claude. Vérifie ta connexion internet.");
  }
  if (!res.ok) {
    let detail = ""; try { detail = (await res.json())?.error?.message || ""; } catch { /* ignore */ }
    if (res.status === 401) throw new ClaudeError("auth", "Clé API refusée. Vérifie-la dans Réglages.");
    if (res.status === 403) throw new ClaudeError("forbidden", "Cette clé n'a pas accès à ce modèle. " + detail);
    if (res.status === 404) throw new ClaudeError("model", "Modèle introuvable. Choisis-en un autre dans Réglages.");
    if (res.status === 429) throw new ClaudeError("rate", "Trop de demandes ou plafond de dépenses atteint. Réessaie dans un moment.");
    if (res.status === 529 || res.status >= 500) throw new ClaudeError("overloaded", "Claude est surchargé. Réessaie dans un instant.");
    if (res.status === 400 && /credit|balance/i.test(detail)) throw new ClaudeError("credit", "Crédit API épuisé : recharge-le sur console.anthropic.com.");
    throw new ClaudeError("http", "Erreur de Claude (" + res.status + "). " + detail);
  }
  const reader = res.body!.getReader(), dec = new TextDecoder(); let buf = "", text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data:")); if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") { text += ev.delta.text; opts.onText?.(text); }
          if (ev.type === "error") throw new ClaudeError("stream", ev.error?.message || "Erreur pendant la réponse.");
        } catch (e) { if (e instanceof ClaudeError) throw e; }
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ClaudeError("cancelled", text || "Arrêté.");
    throw e;
  }
  return text;
}

/** Vérifie la clé avec une très courte requête. */
export async function testKey(): Promise<string> {
  return ask("Réponds seulement : « Prêt pour la leçon ! »", { maxTokens: 30 });
}

export function extractJson<T>(t: string): T | null {
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)) as T; } catch { return null; }
}
