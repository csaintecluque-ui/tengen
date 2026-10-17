import { useState } from "preact/hooks";
import { Header, Seg, go, toast, fr } from "../ui/common";
import { useStore, store, SavedGame } from "../store";
import { ALL_LESSONS } from "../content";
import { PROBLEMS } from "../content/problems";
import { LEVELS, kyuLabel } from "../engine/levels";
import { engine, MODEL_URL, MODEL_MB } from "../engine/client";
import { useKata, KataCard } from "./play";
import { PROVIDERS, ProviderId, listModels, testAI } from "../coach/ai";
import { fromSgf } from "../go/sgf";

export function ProfileScreen() {
  const s = useStore();
  const p = s.progress;
  const lessons = ALL_LESSONS.filter((l) => p.lessons[l.id]).length;
  const solved = Object.values(p.problems).filter((x) => x.ok).length;
  const first = Object.values(p.problems).filter((x) => x.ok && !x.ko).length;
  const games = s.games.filter((g) => g.result);
  const vsAi = games.filter((g) => g.mode === "ai" && g.human);
  const wins = vsAi.filter((g) => g.winner === g.human).length;
  const days = p.streakDays.length;
  const est = 30 - p.rating;
  return (
    <>
      <Header sub="Profil et progression" actions={<a class="iconbtn" href="#/reglages" style="text-decoration:none;color:var(--ink)">Réglages</a>} />
      <div class="stack">
        <div class="card stack" style="gap:6px">
          <span class="eyebrow">Niveau estimé</span>
          <div class="result" style="font-size:28px">{p.ratingGames ? `≈ ${kyuLabel(est)}` : "À découvrir"}</div>
          <p class="small muted">{p.ratingGames ? `D'après ${p.ratingGames} partie${p.ratingGames > 1 ? "s" : ""} contre l'ordinateur. C'est une estimation indicative, qui s'affine avec le temps.` : "Joue quelques parties contre l'ordinateur pour obtenir une estimation."}</p>
        </div>
        <div class="grid">
          <div class="tile"><span class="eyebrow">Leçons</span><b class="num" style="font-size:24px">{lessons} / {ALL_LESSONS.length}</b></div>
          <div class="tile"><span class="eyebrow">Problèmes</span><b class="num" style="font-size:24px">{solved} / {PROBLEMS.length}</b><small>{first} du premier coup</small></div>
          <div class="tile"><span class="eyebrow">Parties</span><b class="num" style="font-size:24px">{games.length}</b><small>{vsAi.length ? `${wins} victoire${wins > 1 ? "s" : ""} sur ${vsAi.length} contre l'ordinateur` : "Aucune partie terminée"}</small></div>
          <div class="tile"><span class="eyebrow">Jours d'entraînement</span><b class="num" style="font-size:24px">{days}</b></div>
        </div>
        {vsAi.length > 0 && (
          <div class="card stack" style="gap:6px">
            <b>Résultats par niveau</b>
            {LEVELS.map((l) => { const g = vsAi.filter((x) => x.level === l.id); if (!g.length) return null; const w = g.filter((x) => x.winner === x.human).length;
              return <div class="spread small" key={l.id}><span>{l.name}</span><span class="num">{w} / {g.length}</span></div>; })}
          </div>
        )}
        <div class="spread"><h3>Mes parties</h3><a class="small" href="#/parties">Tout voir</a></div>
        <GameList games={s.games.slice(0, 5)} />
      </div>
    </>
  );
}

function GameList(props: { games: SavedGame[] }) {
  if (!props.games.length) return <p class="muted small">Tes parties terminées apparaîtront ici, prêtes à être analysées.</p>;
  return (
    <div class="list">
      {props.games.map((g) => (
        <a class="item" key={g.id} href={`#/analyse/${g.id}`} style="grid-template-columns:40px 1fr auto">
          <span class={"stone" + (g.human === 2 ? " w" : "")}>{g.data.size}</span>
          <span class="t"><b>{g.title || (g.mode === "ai" ? "Contre " + LEVELS[g.level ?? 0].name : g.mode === "claude" ? "Contre une IA" : g.mode === "local" ? "Partie à deux" : "Partie importée")}</b><small>{new Date(g.date).toLocaleDateString("fr-FR")} · {g.result || `${g.data.moves.length} coups`}</small></span>
          {g.human && g.winner ? <span class={"chip " + (g.winner === g.human ? "ok" : "")}>{g.winner === g.human ? "Gagnée" : "Perdue"}</span> : <span class="chip">{g.review ? "Analysée" : "Voir"}</span>}
        </a>
      ))}
    </div>
  );
}

export function GamesScreen() {
  const s = useStore();
  const [text, setText] = useState("");
  const importSgf = (t: string) => {
    try {
      const { data, meta } = fromSgf(t);
      const g: SavedGame = { id: Date.now().toString(36), date: Date.now(), data, mode: "local", human: 0, title: meta.PB && meta.PW ? `${meta.PB} – ${meta.PW}` : "Partie importée", result: meta.RE };
      store.saveGame(g); toast("Partie importée"); go("analyse/" + g.id);
    } catch (e) { toast((e as Error).message); }
  };
  return (
    <>
      <Header sub="Mes parties" back={() => go("profil")} />
      <div class="stack">
        <GameList games={s.games} />
        <details class="card"><summary style="font-weight:700;cursor:pointer">Importer une partie (SGF)</summary>
          <div class="stack" style="margin-top:10px;gap:8px">
            <input type="file" id="sgf-file" accept=".sgf,application/x-go-sgf,text/plain" onChange={async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importSgf(await f.text()); }} />
            <textarea id="sgf-text" placeholder="…ou colle le texte SGF ici" value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
            <button class="btn small" disabled={!text.trim()} onClick={() => importSgf(text)}>Importer</button>
          </div>
        </details>
      </div>
    </>
  );
}

export function SettingsScreen() {
  const s = useStore();
  const kata = useKata();
  const st = s.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <Header sub="Réglages" back={() => go("profil")} />
      <div class="stack">
        <h2>Affichage</h2>
        <Seg label="Thème" value={st.theme} options={[["system", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]]} onChange={(v) => store.setSettings({ theme: v })} />
        <Seg label="Poser une pierre en partie" value={st.confirmTap} options={[[true, "Toucher deux fois"], [false, "Un seul toucher"]]} onChange={(v) => store.setSettings({ confirmTap: v })} />
        <Seg label="Coordonnées autour du plateau" value={st.coords} options={[[true, "Afficher"], [false, "Masquer"]]} onChange={(v) => store.setSettings({ coords: v })} />
        <Seg label="Numéros des coups (analyse)" value={st.showMoveNumbers} options={[[false, "Masquer"], [true, "Afficher"]]} onChange={(v) => store.setSettings({ showMoveNumbers: v })} />

        <AISettings />

        <h2 style="margin-top:8px">KataGo</h2>
        <KataCard />
        <Seg label="Charger KataGo au démarrage (s'il est déjà téléchargé)" value={st.autoKatago} options={[[true, "Oui"], [false, "Non"]]} onChange={(v) => store.setSettings({ autoKatago: v })} />
        {kata.status === "ready" && (
          <button class="btn small" onClick={async () => { try { const c = await caches.open("tengen-moteur"); await c.delete(MODEL_URL); toast(`Modèle supprimé (${MODEL_MB} Mo libérés au prochain lancement)`); } catch { toast("Suppression impossible"); } }}>Supprimer le modèle de l'appareil</button>
        )}

        <h2 style="margin-top:8px">Données</h2>
        <p class="small muted">Ta progression, tes parties et tes réglages restent sur cet appareil. Exporte tes parties importantes en SGF depuis l'écran d'analyse.</p>
        <button class="btn small danger" onClick={() => { if (confirmReset) { store.resetProgress(); setConfirmReset(false); toast("Progression remise à zéro"); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); } }}>{confirmReset ? "Confirmer la remise à zéro" : "Remettre la progression à zéro"}</button>

        <h2 style="margin-top:8px">À propos</h2>
        <div class="card small stack" style="gap:6px">
          <p><b>Tengen</b> — appli d'apprentissage du go. Version {__APP_VERSION__}.</p>
          <p class="muted">Moteur : réseau KataGo g170 (15 blocs), projet libre de David J. Wu (licence MIT), exécuté avec ONNX Runtime Web. Professeur : l'IA de ton choix (Claude, ChatGPT, Gemini, Grok, OpenRouter…), avec ta propre clé.</p>
          <p class="muted">Sceau Anamnesis · CSC.</p>
        </div>
      </div>
    </>
  );
}

declare const __APP_VERSION__: string;
export { fr };

function AISettings() {
  const s = useStore();
  const ai = s.settings.ai;
  const pv = PROVIDERS.find((p) => p.id === ai.provider) || PROVIDERS[0];
  const [key, setKey] = useState(ai.keys[ai.provider] || "");
  const [base, setBase] = useState(ai.customBase);
  const [model, setModel] = useState(ai.models[ai.provider] || pv.defaultModel);
  const [show, setShow] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const choose = (id: ProviderId) => {
    const p = PROVIDERS.find((x) => x.id === id)!;
    store.setSettings({ ai: { ...ai, provider: id } });
    setKey(ai.keys[id] || ""); setModel(ai.models[id] || p.defaultModel); setModels(null); setMsg(null); setFilter("");
  };
  const save = (m = model) => {
    store.setSettings({ ai: { ...store.settings.ai, keys: { ...store.settings.ai.keys, [ai.provider]: key.trim() }, models: { ...store.settings.ai.models, [ai.provider]: m.trim() }, customBase: base.trim() } });
  };
  const shown = (models || []).filter((m) => !filter || m.toLowerCase().includes(filter.toLowerCase())).slice(0, 60);
  return (
    <>
      <h2 style="margin-top:8px">Ton professeur IA</h2>
      <div class="card stack small" style="gap:6px">
        <p>Avec une clé API, une IA peut t'expliquer les positions, rédiger le bilan de tes parties et jouer contre toi. Les clés sont enregistrées <b>uniquement sur cet appareil</b> : elles ne sont ni dans le code de l'appli, ni sur GitHub, et ne servent qu'à appeler directement le fournisseur choisi.</p>
        <p class="muted">Les API sont facturées à part des abonnements grand public (ChatGPT Plus, Claude Pro…). Crée une clé dédiée chez le fournisseur et fixe-lui un plafond de dépenses. Tu peux la révoquer à tout moment.</p>
      </div>
      <div class="field">
        <span class="label">Fournisseur</span>
        <div class="list">
          {PROVIDERS.map((p) => (
            <button key={p.id} class="item" style="grid-template-columns:1fr auto" aria-pressed={ai.provider === p.id} onClick={() => choose(p.id)}>
              <span class="t"><b>{p.name}</b><small>{p.brand} · {p.note}</small></span>
              {ai.provider === p.id ? <span class="chip accent">Choisi</span> : ai.keys[p.id] ? <span class="chip ok">Clé enregistrée</span> : <span class="chip">Choisir</span>}
            </button>
          ))}
        </div>
      </div>
      {pv.id === "custom" && (
        <div class="field">
          <label for="ai-base">Adresse du service (https)</label>
          <input id="ai-base" type="text" inputMode="url" autocomplete="off" spellcheck={false} placeholder="https://mon-service.example/v1" value={base} onInput={(e) => setBase((e.target as HTMLInputElement).value)} />
        </div>
      )}
      <div class="field">
        <label for="api-key">Clé API {pv.name}{pv.console && <span class="muted"> · à créer sur {pv.console}</span>}</label>
        <div class="row" style="flex-wrap:nowrap">
          <input id="api-key" type={show ? "text" : "password"} autocomplete="off" spellcheck={false} placeholder={pv.keyHint} value={key} onInput={(e) => setKey((e.target as HTMLInputElement).value)} />
          <button class="btn small" onClick={() => setShow(!show)}>{show ? "Masquer" : "Voir"}</button>
        </div>
      </div>
      <div class="field">
        <label for="ai-model">Modèle</label>
        {pv.suggested.length > 0 && (
          <div class="row" style="gap:6px">{pv.suggested.map((m) => <button key={m.id} class={"chip" + (model === m.id ? " accent" : "")} style="border:0;min-height:34px;font-size:13px" onClick={() => setModel(m.id)}>{m.label}</button>)}</div>
        )}
        <input id="ai-model" type="text" autocomplete="off" spellcheck={false} placeholder="nom exact du modèle" value={model} onInput={(e) => setModel((e.target as HTMLInputElement).value)} />
        <div class="row">
          <button class="btn small" disabled={!key.trim() && pv.id !== "openrouter" && pv.id !== "custom"} onClick={async () => {
            setMsg({ ok: true, text: "Chargement des modèles…" });
            try { const l = await listModels(pv.id, key.trim(), base); setModels(l); setMsg({ ok: true, text: `${l.length} modèles disponibles. Choisis-en un ci-dessous.` }); }
            catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
          }}>Voir les modèles disponibles</button>
        </div>
        {models && (
          <div class="stack" style="gap:6px">
            {models.length > 12 && <input type="search" id="ai-model-filter" placeholder="Filtrer (ex. mistral, gpt, gemini, deepseek…)" value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} />}
            <div class="list" style="max-height:260px;overflow:auto">
              {shown.map((m) => <button key={m} class="item" style="grid-template-columns:1fr auto;padding:8px 0" aria-pressed={model === m} onClick={() => setModel(m)}><span class="t"><b style="font-size:14px;word-break:break-all">{m}</b></span>{model === m ? <span class="chip accent">Choisi</span> : null}</button>)}
            </div>
          </div>
        )}
      </div>
      <div class="row">
        <button class="btn small primary" onClick={() => { save(); toast("Réglages de l'IA enregistrés sur l'appareil"); }}>Enregistrer</button>
        <button class="btn small" onClick={async () => { save(); setMsg({ ok: true, text: "Test en cours…" }); try { const t = await testAI(); setMsg({ ok: true, text: pv.name + " répond : " + t }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } }}>Tester</button>
        {ai.keys[ai.provider] && <button class="btn small danger" onClick={() => { setKey(""); store.setSettings({ ai: { ...store.settings.ai, keys: { ...store.settings.ai.keys, [ai.provider]: "" } } }); toast("Clé supprimée"); }}>Supprimer la clé</button>}
      </div>
      {msg && <div class={"fb " + (msg.ok ? "info" : "ko")}>{msg.text}</div>}
    </>
  );
}
