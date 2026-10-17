/**
 * Le professeur IA : appels directs depuis l'appareil vers le fournisseur choisi, avec la clé de l'utilisateur.
 * Les clés restent dans le stockage local de l'appareil ; elles ne sont jamais dans le code ni sur GitHub.
 */
import { store } from "../store";
import { Game } from "../go/game";
import { COLS, PASS, BLACK } from "../go/board";

export type ProviderId = "anthropic" | "openai" | "google" | "xai" | "openrouter" | "custom";
export interface Provider {
  id: ProviderId; name: string; brand: string; keyHint: string; console: string; note: string;
  defaultModel: string; suggested: { id: string; label: string }[];
}

export const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Claude", brand: "Anthropic", keyHint: "sk-ant-…", console: "console.anthropic.com", note: "Recommandé : excellent pédagogue en français.",
    defaultModel: "claude-sonnet-5-5", suggested: [{ id: "claude-haiku-5-5", label: "Haiku 5.5 · rapide" }, { id: "claude-sonnet-5-5", label: "Sonnet 5.5 · équilibré" }, { id: "claude-opus-5-5", label: "Opus 5.5 · le plus fin" }] },
  { id: "openai", name: "ChatGPT", brand: "OpenAI", keyHint: "sk-…", console: "platform.openai.com", note: "Les modèles GPT d'OpenAI.", defaultModel: "", suggested: [] },
  { id: "google", name: "Gemini", brand: "Google", keyHint: "AIza…", console: "aistudio.google.com", note: "Les modèles Gemini de Google (clé gratuite possible avec limites).", defaultModel: "", suggested: [] },
  { id: "xai", name: "Grok", brand: "xAI", keyHint: "xai-…", console: "console.x.ai", note: "Les modèles Grok de xAI.", defaultModel: "", suggested: [] },
  { id: "openrouter", name: "OpenRouter", brand: "OpenRouter", keyHint: "sk-or-…", console: "openrouter.ai", note: "Une seule clé pour des centaines de modèles : Mistral, DeepSeek, Llama, Qwen, et aussi GPT, Gemini ou Claude.", defaultModel: "", suggested: [] },
  { id: "custom", name: "Compatible OpenAI", brand: "Autre service", keyHint: "clé (facultative)", console: "", note: "Pour un service compatible avec l'API d'OpenAI (adresse https obligatoire, et le service doit accepter les appels depuis un navigateur).", defaultModel: "", suggested: [] },
];

export class AIError extends Error { constructor(public code: string, msg: string) { super(msg); } }

export function provider(): Provider { return PROVIDERS.find((p) => p.id === store.settings.ai.provider) || PROVIDERS[0]; }
export function currentKey(): string { return (store.settings.ai.keys[store.settings.ai.provider] || "").trim(); }
export function currentModel(): string { const ai = store.settings.ai; return (ai.models[ai.provider] || provider().defaultModel || "").trim(); }
export function hasKey(): boolean {
  const ai = store.settings.ai;
  if (ai.provider === "custom") return !!ai.customBase.trim() && !!currentModel();
  return !!currentKey() && !!currentModel();
}
export function aiName(): string { return provider().name; }

export const SYSTEM = `Tu es le professeur de go de Tengen, une appli pour apprendre le go en français.
Ton élève débute : il connaît les règles mais peu la stratégie. Tu expliques simplement, avec des mots concrets, sans jargon non expliqué.
Quand tu emploies un terme japonais (atari, sente, gote, joseki, tesuji…), donne son sens en quelques mots la première fois.
Cite toujours les intersections avec leurs coordonnées (ex. D4). Les colonnes vont de A à T sans la lettre I, la ligne 1 est en bas.
Appuie-toi sur les chiffres du moteur KataGo fournis : ils sont fiables. Ne contredis pas le moteur sur la valeur d'un coup ; explique plutôt POURQUOI.
Réponds en français, en texte simple, sans titres ni tableaux ni markdown. Sois chaleureux et encourageant mais honnête.`;

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

function httpError(status: number, detail: string): AIError {
  const p = provider().name;
  if (status === 401 || status === 403) return new AIError("auth", `Clé refusée par ${p}, ou accès au modèle interdit. Vérifie la clé et le modèle dans Réglages. ${detail}`);
  if (status === 404) return new AIError("model", `Modèle introuvable chez ${p}. Choisis-en un autre dans Réglages.`);
  if (status === 402 || /credit|balance|quota|billing/i.test(detail)) return new AIError("credit", `Crédit épuisé ou quota atteint chez ${p}. ${detail}`);
  if (status === 429) return new AIError("rate", "Trop de demandes ou plafond atteint. Réessaie dans un moment.");
  if (status >= 500) return new AIError("overloaded", `${p} est surchargé. Réessaie dans un instant.`);
  return new AIError("http", `Erreur de ${p} (${status}). ${detail}`);
}

async function readSSE(res: Response, onEvent: (data: string) => string | void, signal?: AbortSignal): Promise<void> {
  const reader = res.body!.getReader(), dec = new TextDecoder(); let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.search(/\r?\n\r?\n/)) >= 0) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx).replace(/^\r?\n\r?\n/, "");
        for (const line of chunk.split(/\r?\n/)) if (line.startsWith("data:")) onEvent(line.slice(5).trim());
      }
    }
  } catch (e) { if (signal?.aborted || (e as Error).name === "AbortError") throw new AIError("cancelled", "Arrêté."); throw e; }
}

export async function ask(prompt: string, opts: { onText?: (t: string) => void; signal?: AbortSignal; maxTokens?: number; system?: string } = {}): Promise<string> {
  const ai = store.settings.ai, pid = ai.provider, key = currentKey(), model = currentModel();
  const system = opts.system ?? SYSTEM, maxTokens = opts.maxTokens ?? 800;
  if (!hasKey()) throw new AIError("no_key", "Choisis une IA et ajoute ta clé dans Réglages.");
  let url = "", headers: Record<string, string> = { "content-type": "application/json" }, body: unknown;
  if (pid === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers = { ...headers, "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
    body = { model, max_tokens: maxTokens, stream: true, system, messages: [{ role: "user", content: prompt }] };
  } else if (pid === "google") {
    const m = model.replace(/^models\//, "");
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:streamGenerateContent?alt=sse`;
    headers = { ...headers, "x-goog-api-key": key };
    body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: Math.max(maxTokens, 1024) } };
  } else {
    const base = pid === "openai" ? "https://api.openai.com/v1" : pid === "xai" ? "https://api.x.ai/v1" : pid === "openrouter" ? "https://openrouter.ai/api/v1" : ai.customBase.trim().replace(/\/+$/, "");
    url = base + "/chat/completions";
    if (key) headers.authorization = "Bearer " + key;
    if (pid === "openrouter") { headers["HTTP-Referer"] = location.origin + location.pathname; headers["X-Title"] = "Tengen"; }
    const tokens = pid === "openai" ? { max_completion_tokens: Math.max(maxTokens, 2000) } : { max_tokens: maxTokens };
    body = { model, stream: true, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], ...tokens };
  }
  let res: Response;
  try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: opts.signal }); }
  catch (e) {
    if ((e as Error).name === "AbortError") throw new AIError("cancelled", "Arrêté.");
    throw new AIError("network", `Impossible de joindre ${provider().name}. Vérifie ta connexion${pid === "custom" ? ", l'adresse du service et qu'il accepte les appels depuis un navigateur (CORS)" : ""}.`);
  }
  if (!res.ok) { let d = ""; try { const j = await res.json(); d = j?.error?.message || j?.message || ""; } catch { /* */ } throw httpError(res.status, d); }
  let text = "";
  await readSSE(res, (data) => {
    if (!data || data === "[DONE]") return;
    let ev: any; try { ev = JSON.parse(data); } catch { return; }
    let delta = "";
    if (pid === "anthropic") { if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") delta = ev.delta.text; if (ev.type === "error") throw new AIError("stream", ev.error?.message || "Erreur."); }
    else if (pid === "google") { delta = (ev.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join(""); }
    else { delta = ev.choices?.[0]?.delta?.content || ""; if (ev.error) throw new AIError("stream", ev.error.message || "Erreur."); }
    if (delta) { text += delta; opts.onText?.(text); }
  }, opts.signal);
  if (!text) throw new AIError("empty", "L'IA n'a rien répondu. Essaie un autre modèle.");
  return text;
}

/** Liste des modèles disponibles chez le fournisseur (avec la clé saisie). */
export async function listModels(pid: ProviderId, key: string, customBase = ""): Promise<string[]> {
  try {
    if (pid === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
      if (!r.ok) throw httpError(r.status, ""); const j = await r.json(); return (j.data || []).map((m: { id: string }) => m.id);
    }
    if (pid === "google") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
      if (!r.ok) throw httpError(r.status, ""); const j = await r.json();
      return (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent")).map((m: { name: string }) => m.name.replace(/^models\//, ""));
    }
    const base = pid === "openai" ? "https://api.openai.com/v1" : pid === "xai" ? "https://api.x.ai/v1" : pid === "openrouter" ? "https://openrouter.ai/api/v1" : customBase.trim().replace(/\/+$/, "");
    const r = await fetch(base + "/models", { headers: key ? { authorization: "Bearer " + key } : {} });
    if (!r.ok) throw httpError(r.status, ""); const j = await r.json();
    let ids: string[] = (j.data || []).map((m: { id: string }) => m.id);
    if (pid === "openai") ids = ids.filter((id) => /^(gpt|o\d|chatgpt)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|embedding)/.test(id));
    return ids.sort();
  } catch (e) {
    if (e instanceof AIError) throw e;
    throw new AIError("network", "Impossible de récupérer la liste des modèles. Vérifie la clé et la connexion.");
  }
}

export async function testAI(): Promise<string> { return ask("Réponds seulement : « Prêt pour la leçon ! »", { maxTokens: 40 }); }

export function extractJson<T>(t: string): T | null {
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)) as T; } catch { return null; }
}
