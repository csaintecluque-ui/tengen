import { useEffect, useState } from "preact/hooks";
import { Header, Seg, go, Progress } from "../ui/common";
import { LEVELS } from "../engine/levels";
import { engine, MODEL_MB } from "../engine/client";
import { useStore, store, SavedGame } from "../store";
import { Game } from "../go/game";
import { toData } from "../engine/serial";
import { hasKey, aiName } from "../coach/ai";

interface Setup { mode: "ai" | "claude" | "local"; level: number; size: 9 | 13 | 19; human: 1 | 2; handicap: number; }
const KEY = "tengen.setup";
function loadSetup(): Setup { try { return { mode: "ai", level: 0, size: 9, human: 1, handicap: 0, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { mode: "ai", level: 0, size: 9, human: 1, handicap: 0 }; } }

export function useKata() {
  const [, set] = useState(0);
  useEffect(() => engine.subscribe(() => set((x) => x + 1)) as unknown as () => void, []);
  return engine.kata;
}

export function KataCard(props: { compact?: boolean }) {
  const k = useKata();
  if (k.status === "ready") return props.compact ? null : <p class="small muted">KataGo est chargé sur cet appareil et fonctionne hors ligne.</p>;
  if (k.status === "loading") return (
    <div class="card stack" style="gap:8px">
      <b>{k.phase === "init" ? "Démarrage de KataGo…" : "Téléchargement de KataGo…"}</b>
      <Progress value={k.progress} />
      <span class="small muted num">{Math.round(k.progress * 100)} %</span>
    </div>
  );
  return (
    <div class="card stack" style="gap:8px">
      <b>Activer KataGo</b>
      <p class="small muted">Le réseau de neurones de KataGo ({MODEL_MB} Mo) est téléchargé une seule fois, puis fonctionne hors ligne, sans clé ni abonnement. Il est nécessaire pour les niveaux Club, Fort et Expert, et pour l'analyse des parties.</p>
      {k.status === "error" && <div class="fb ko">Échec : {k.message}. Vérifie ta connexion et réessaie.</div>}
      <button class="btn primary" onClick={() => engine.loadKatago()}>Télécharger KataGo</button>
    </div>
  );
}

export function PlayScreen() {
  const s = useStore();
  const kata = useKata();
  const [st, setSt] = useState<Setup>(loadSetup);
  const upd = (p: Partial<Setup>) => { const n = { ...st, ...p }; setSt(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* */ } };
  const cur = s.current && !s.current.result ? s.current : null;
  const lv = LEVELS[st.level];
  const needKata = (st.mode === "ai" && lv.needsKatago) || st.mode === "claude";
  const blocked = (needKata && kata.status !== "ready") || (st.mode === "claude" && !hasKey());
  const start = () => {
    const handicap = st.mode === "local" || st.human === 1 ? st.handicap : 0;
    const komi = handicap >= 2 ? 0.5 : st.size === 9 ? 7 : 7.5;
    const g = new Game(st.size, komi, handicap);
    const saved: SavedGame = { id: Date.now().toString(36), date: Date.now(), data: toData(g), mode: st.mode, level: st.level, human: st.mode === "local" ? 0 : st.human };
    store.saveCurrent(saved);
    go("partie");
  };
  return (
    <>
      <Header sub="Jouer une partie" />
      <div class="stack">
        {cur && (
          <div class="card stack" style="gap:8px">
            <b>Partie en cours</b>
            <span class="small muted">{cur.data.size}×{cur.data.size} · {cur.mode === "ai" ? "contre " + LEVELS[cur.level ?? 0].name : cur.mode === "claude" ? "contre " + aiName() : "à deux"} · coup {cur.data.moves.length}</span>
            <div class="row"><a class="btn primary" href="#/partie">Reprendre</a></div>
          </div>
        )}
        <h2>Nouvelle partie</h2>
        <Seg label="Adversaire" value={st.mode} options={[["ai", "Ordinateur"], ["claude", "IA"], ["local", "À deux"]]} onChange={(v) => upd({ mode: v })} />
        {st.mode === "ai" && (
          <div class="field">
            <span class="label">Niveau</span>
            <div class="list">
              {LEVELS.map((l) => (
                <button key={l.id} class="item" style="grid-template-columns:34px 1fr auto" aria-pressed={st.level === l.id} onClick={() => upd({ level: l.id })}>
                  <span class={"stone" + (st.level === l.id ? "" : " w")}>{l.id + 1}</span>
                  <span class="t"><b>{l.name}</b><small>{l.desc}</small></span>
                  {l.needsKatago ? <span class="chip copper">KataGo</span> : <span class="chip">Maison</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {st.mode === "claude" && (
          <div class="card small stack" style="gap:6px">
            <p>{hasKey() ? aiName() : "L'IA de ton choix (Claude, ChatGPT, Gemini…)"} joue en choisissant parmi les meilleurs coups calculés par KataGo, et t'explique son idée à chaque coup. Chaque coup consomme un peu de crédit sur ta clé API.</p>
            {!hasKey() && <a class="btn" href="#/reglages">Choisir une IA et ajouter ma clé</a>}
          </div>
        )}
        {needKata && kata.status !== "ready" && <KataCard />}
        <Seg label="Plateau" value={st.size} options={[[9, "9×9"], [13, "13×13"], [19, "19×19"]]} onChange={(v) => upd({ size: v })} />
        {st.mode !== "local" && <Seg label="Ta couleur" value={st.human} options={[[1, "Noir (tu commences)"], [2, "Blanc"]]} onChange={(v) => upd({ human: v })} />}
        {(st.mode === "local" || st.human === 1) && <Seg label="Handicap (pierres noires d'avance)" value={st.handicap} options={[[0, "Aucun"], [2, "2"], [3, "3"], [4, "4"], ...(st.size > 9 ? [[6, "6"], [9, "9"]] as [number, string][] : [])]} onChange={(v) => upd({ handicap: v })} />}
        {st.size > 9 && st.mode === "ai" && st.level < 2 && <p class="small muted">Conseil : les niveaux « maison » sont plus justes en 9×9. Sur grand plateau, préfère les niveaux KataGo.</p>}
        <button class="btn primary block" disabled={blocked} onClick={start}>Commencer la partie</button>
        <p class="small muted">Pour jouer contre de vraies personnes : <a href="https://online-go.com" target="_blank" rel="noopener">OGS (online-go.com)</a>, gratuit et en français, ou un club de la <a href="https://ffg.jeudego.org" target="_blank" rel="noopener">Fédération française de go</a>. Tes parties s'exportent en SGF pour les comparer.</p>
      </div>
    </>
  );
}
