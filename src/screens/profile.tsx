import { useState } from "preact/hooks";
import { Header, Seg, go, toast, fr } from "../ui/common";
import { useStore, store, CLAUDE_MODELS, SavedGame } from "../store";
import { ALL_LESSONS } from "../content";
import { PROBLEMS } from "../content/problems";
import { LEVELS, kyuLabel } from "../engine/levels";
import { engine, MODEL_URL, MODEL_MB } from "../engine/client";
import { useKata, KataCard } from "./play";
import { testKey } from "../coach/claude";
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
          <span class="t"><b>{g.title || (g.mode === "ai" ? "Contre " + LEVELS[g.level ?? 0].name : g.mode === "claude" ? "Contre Claude" : g.mode === "local" ? "Partie à deux" : "Partie importée")}</b><small>{new Date(g.date).toLocaleDateString("fr-FR")} · {g.result || `${g.data.moves.length} coups`}</small></span>
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
  const [key, setKey] = useState(st.apiKey);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
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

        <h2 style="margin-top:8px">Claude, ton professeur</h2>
        <div class="card stack small" style="gap:6px">
          <p>Avec une clé API Anthropic, Claude peut t'expliquer les positions, commenter tes erreurs et jouer contre toi. La clé est enregistrée <b>uniquement sur cet appareil</b> : elle n'est ni dans le code de l'appli, ni sur GitHub, et ne sert qu'à appeler directement l'API d'Anthropic.</p>
          <p class="muted">L'API est facturée à part de l'abonnement Claude. Crée une clé dédiée sur console.anthropic.com et fixe-lui un plafond de dépenses. Tu peux la révoquer à tout moment.</p>
        </div>
        <div class="field">
          <label for="api-key">Clé API</label>
          <div class="row" style="flex-wrap:nowrap">
            <input id="api-key" type={show ? "text" : "password"} autocomplete="off" spellcheck={false} placeholder="sk-ant-…" value={key} onInput={(e) => setKey((e.target as HTMLInputElement).value)} />
            <button class="btn small" onClick={() => setShow(!show)}>{show ? "Masquer" : "Voir"}</button>
          </div>
          <div class="row">
            <button class="btn small primary" onClick={() => { store.setSettings({ apiKey: key.trim() }); toast(key.trim() ? "Clé enregistrée sur l'appareil" : "Clé supprimée"); }}>Enregistrer</button>
            <button class="btn small" disabled={!st.apiKey} onClick={async () => { setTest({ ok: true, text: "Test en cours…" }); try { const t = await testKey(); setTest({ ok: true, text: "Claude répond : " + t }); } catch (e) { setTest({ ok: false, text: (e as Error).message }); } }}>Tester</button>
            {st.apiKey && <button class="btn small danger" onClick={() => { setKey(""); store.setSettings({ apiKey: "" }); toast("Clé supprimée"); }}>Supprimer</button>}
          </div>
          {test && <div class={"fb " + (test.ok ? "info" : "ko")}>{test.text}</div>}
        </div>
        <div class="field">
          <span class="label">Modèle</span>
          <div class="list">
            {CLAUDE_MODELS.map((m) => (
              <button key={m.id} class="item" style="grid-template-columns:1fr auto" aria-pressed={st.claudeModel === m.id} onClick={() => store.setSettings({ claudeModel: m.id })}>
                <span class="t"><b>{m.name}</b><small>{m.desc}</small></span>
                {st.claudeModel === m.id ? <span class="chip accent">Choisi</span> : <span class="chip">Choisir</span>}
              </button>
            ))}
          </div>
        </div>

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
          <p class="muted">Moteur : réseau KataGo g170 (15 blocs), projet libre de David J. Wu (licence MIT), exécuté avec ONNX Runtime Web. Coach : API Claude d'Anthropic, avec ta propre clé.</p>
          <p class="muted">Sceau Anamnesis · CSC.</p>
        </div>
      </div>
    </>
  );
}

declare const __APP_VERSION__: string;
export { fr };
