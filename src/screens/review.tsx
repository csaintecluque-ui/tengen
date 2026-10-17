import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Header, go, fr, copyText, toast } from "../ui/common";
import { Goban, Marks } from "../ui/Goban";
import { fromData } from "../engine/serial";
import { engine } from "../engine/client";
import { store, useStore, SavedGame, ReviewPos } from "../store";
import { PASS, BLACK, WHITE, Color } from "../go/board";
import { Game } from "../go/game";
import { toSgf } from "../go/sgf";
import { useKata, KataCard } from "./play";
import { Coach } from "./game";
import { LEVELS } from "../engine/levels";
import { ask, hasKey, aiName, boardText } from "../coach/ai";

/* ---------- profondeur d'analyse ---------- */
export const DEPTHS = {
  rapide: { label: "Rapide", desc: "Une évaluation par coup", visits: (_n: number) => 1 },
  standard: { label: "Standard", desc: "Courte recherche à chaque coup", visits: (n: number) => (n <= 9 ? 24 : n <= 13 ? 10 : 5) },
  approfondie: { label: "Approfondie", desc: "Recherche plus longue, variantes fiables", visits: (n: number) => (n <= 9 ? 80 : n <= 13 ? 32 : 12) },
};
const MS_PER_EVAL = (n: number) => (n <= 9 ? 60 : n <= 13 ? 150 : 350);
function estimate(moves: number, n: number, visits: number) {
  const s = ((moves + 1) * visits * MS_PER_EVAL(n)) / 1000;
  return s < 60 ? "moins d'une minute" : `environ ${Math.round(s / 60)} min`;
}

/* ---------- statistiques ---------- */
interface MoveStat { i: number; col: Color; loss: number; drop: number; kind: "Gaffe" | "Erreur" | "Imprécision" | "" ; rank: number; }
function moveStats(r: ReviewPos[], moves: [Color, number][]): MoveStat[] {
  const out: MoveStat[] = [];
  for (let i = 0; i < moves.length && i + 1 < r.length; i++) {
    const col = moves[i][0], s = col === BLACK ? 1 : -1;
    const wb = col === BLACK ? r[i].winrateBlack : 1 - r[i].winrateBlack, wa = col === BLACK ? r[i + 1].winrateBlack : 1 - r[i + 1].winrateBlack;
    const loss = Math.max(0, s * (r[i].leadBlack - r[i + 1].leadBlack)), drop = Math.max(0, wb - wa);
    const kind = drop >= 0.2 || loss >= 8 ? "Gaffe" : drop >= 0.1 || loss >= 4 ? "Erreur" : drop >= 0.05 || loss >= 2 ? "Imprécision" : "";
    out.push({ i, col, loss, drop, kind, rank: r[i].playedRank ?? -1 });
  }
  return out;
}
function summary(st: MoveStat[], col: Color, total: number) {
  const mine = st.filter((s) => s.col === col && st.length);
  const n = mine.length || 1;
  const phase = (a: number, b: number) => { const m = mine.filter((s) => s.i >= a && s.i < b); return m.length ? m.reduce((x, s) => x + s.loss, 0) / m.length : 0; };
  const third = Math.max(1, Math.round(total / 3));
  return {
    accuracy: Math.round((100 * mine.filter((s) => s.loss < 1).length) / n),
    top: Math.round((100 * mine.filter((s) => s.rank === 0).length) / n),
    avgLoss: mine.reduce((x, s) => x + s.loss, 0) / n,
    gaffes: mine.filter((s) => s.kind === "Gaffe").length, erreurs: mine.filter((s) => s.kind === "Erreur").length, impr: mine.filter((s) => s.kind === "Imprécision").length,
    phases: [phase(0, third), phase(third, 2 * third), phase(2 * third, total)],
  };
}

export function ReviewScreen(props: { id: string }) {
  useStore();
  const sg = store.games.find((g) => g.id === props.id) || (store.current?.id === props.id ? store.current : null);
  if (!sg) return <><Header sub="Analyse" back="profil" /><p>Partie introuvable.</p></>;
  return <ReviewInner key={sg.id} sg={sg} />;
}

function ReviewInner({ sg }: { sg: SavedGame }) {
  const kata = useKata();
  const data = sg.data, total = data.moves.length, n = data.size;
  const [i, setI] = useState(total);
  const [prog, setProg] = useState<number | null>(null);
  const [review, setReview] = useState<ReviewPos[] | undefined>(() => (sg.review && !Array.isArray(sg.review) ? sg.review.positions : undefined));
  const [depth, setDepth] = useState(store.settings.analysisDepth);
  const [chart, setChart] = useState<"win" | "score">("win");
  const [showOwn, setShowOwn] = useState(false);
  const [own, setOwn] = useState<Float32Array | undefined>();
  const [variation, setVariation] = useState<{ base: number; game: Game; eval?: { winrateBlack: number; leadBlack: number; best: number[] } } | null>(null);
  const [anim, setAnim] = useState<{ game: Game; label: string } | null>(null);
  const [report, setReport] = useState<{ text: string; busy: boolean } | null>(null);
  const timer = useRef(0);
  const game = useMemo(() => fromData(data, i), [sg.id, i]);
  const stats = useMemo(() => (review ? moveStats(review, data.moves) : []), [review]);
  const human: Color | 0 = (sg.human as Color) || 0;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setOwn(undefined); if (showOwn && !variation && !anim) engine.ownership(game).then(setOwn).catch(() => {}); }, [i, showOwn, !!variation, !!anim]);

  async function run() {
    if (!engine.ready()) { const ok = await engine.loadKatago(); if (!ok) return; }
    setProg(0);
    const visits = DEPTHS[depth].visits(n);
    const r = await engine.review(fromData(data), visits, (p) => setProg(p));
    setProg(null);
    if (r && r.length) {
      setReview(r);
      if (r.length === total + 1) { const s = { ...sg, review: { depth, positions: r } }; store.saveGame(s); if (store.current?.id === s.id) store.saveCurrent(s); }
      else toast("Analyse interrompue : résultats partiels");
    }
  }

  const cur = review?.[i];
  const st = i < total ? stats[i] : undefined;
  const next = i < total ? data.moves[i] : null;
  const shown = anim?.game || variation?.game || game;
  const marks: Marks = {};
  if (anim) { const lm = anim.game.lastMove(); marks.last = lm?.p; const nums: Record<number, number> = {}; anim.game.moves.slice(game.moves.length).forEach((m, k) => { if (m.p !== PASS) nums[m.p] = k + 1; }); marks.numbers = nums; }
  else if (variation) {
    marks.last = variation.game.lastMove()?.p;
    const nums: Record<number, number> = {}; variation.game.moves.slice(variation.base).forEach((m, k) => { if (m.p !== PASS) nums[m.p] = k + 1; }); marks.numbers = nums;
    if (variation.eval) marks.heat = variation.eval.best.slice(0, 3).filter((p) => p !== PASS).map((p, k) => ({ p, v: k ? 0.5 : 1, text: "ABC"[k], best: !k }));
  } else {
    marks.last = i > 0 ? data.moves[i - 1][1] : undefined;
    if (cur && i < total) marks.heat = cur.best.filter((b) => b.p !== PASS).slice(0, 3).map((b, k) => ({ p: b.p, v: k ? 0.5 : 1, text: "ABC"[k], best: !k }));
    if (next && next[1] !== PASS) marks.shapes = { [next[1]]: "x" };
    if (store.settings.showMoveNumbers) { const nums: Record<number, number> = {}; data.moves.slice(0, i).forEach((m, k) => { if (m[1] !== PASS) nums[m[1]] = k + 1; }); marks.numbers = nums; }
    if (showOwn && own) marks.own = own;
  }

  function playPV(pv: number[], label: string) {
    clearTimeout(timer.current); setVariation(null);
    let g = game.clone(); let k = 0;
    const stepFn = () => { if (k >= pv.length) return; g = g.clone(); if (!g.play(pv[k])) return; k++; setAnim({ game: g, label }); timer.current = window.setTimeout(stepFn, 700); };
    stepFn();
  }
  async function varTap(p: number) {
    if (anim) return;
    const base = variation?.game || game;
    if (!base.isLegal(p)) { toast("Coup interdit ici"); return; }
    const g = base.clone(); g.play(p);
    setVariation({ base: variation?.base ?? game.moves.length, game: g });
    if (engine.ready()) {
      const r = await engine.analyze(g, n <= 9 ? 24 : 10, 1500);
      if (r) { const sgn = g.toPlay === BLACK ? 1 : -1; setVariation((v) => (v && v.game === g ? { ...v, eval: { winrateBlack: sgn === 1 ? r.winrate : 1 - r.winrate, leadBlack: sgn * r.lead, best: r.candidates.slice(0, 3).map((c) => c.p) } } : v)); }
    }
  }
  function navigate(k: number) { clearTimeout(timer.current); setAnim(null); setVariation(null); setI(Math.max(0, Math.min(total, k))); }
  const mistakes = stats.filter((s) => s.kind && (!human || s.col === human));
  const nextMistake = mistakes.find((s) => s.i > i), prevMistake = [...mistakes].reverse().find((s) => s.i < i);

  async function aiReport() {
    setReport({ text: "", busy: true });
    const key = stats.filter((s) => s.kind).sort((a, b) => b.loss - a.loss).slice(0, 8).sort((a, b) => a.i - b.i);
    const lines = key.map((s) => {
      const g = fromData(data, s.i), best = review![s.i].best[0];
      return `- Coup ${s.i + 1}, ${s.col === BLACK ? "Noir" : "Blanc"} joue ${g.board.name(data.moves[s.i][1])} (${s.kind}, ≈ ${fr(s.loss)} points perdus, chance de gain −${Math.round(s.drop * 100)} %). KataGo préférait ${g.board.name(best.p)}, suite : ${best.pv.slice(0, 6).map((p) => g.board.name(p)).join(" ")}.`;
    }).join("\n");
    const sb = summary(stats, BLACK, total), sw = summary(stats, WHITE, total);
    const who = human ? `L'élève joue ${human === BLACK ? "Noir" : "Blanc"}.` : "Partie entre deux joueurs.";
    const prompt = `Voici l'analyse par KataGo d'une partie de go ${n}×${n} (komi ${fr(data.komi)}). ${who} Résultat : ${sg.result || "non terminé"}.\n\nStatistiques (perte moyenne en points par coup, précision = coups à moins d'un point du meilleur) :\n- Noir : précision ${sb.accuracy} %, perte moyenne ${fr(sb.avgLoss)}, ${sb.gaffes} gaffes, ${sb.erreurs} erreurs ; par phase (ouverture/milieu/fin) : ${sb.phases.map((x) => fr(x)).join(" / ")}.\n- Blanc : précision ${sw.accuracy} %, perte moyenne ${fr(sw.avgLoss)}, ${sw.gaffes} gaffes, ${sw.erreurs} erreurs ; par phase : ${sw.phases.map((x) => fr(x)).join(" / ")}.\n\nMoments clés :\n${lines || "aucune erreur notable"}\n\nPosition finale :\n${boardText(fromData(data))}\n\nRédige un bilan pédagogique pour l'élève : 1) ce qui a décidé la partie, 2) ses trois principaux axes de progrès avec des exemples précis de la partie, 3) un exercice ou une leçon à travailler. 12 phrases maximum, texte simple.`;
    try { await ask(prompt, { maxTokens: 1200, onText: (t) => setReport({ text: t, busy: true }) }); setReport((r) => (r ? { ...r, busy: false } : r)); }
    catch (e) { setReport((r) => ({ text: (r?.text ? r.text + "\n\n" : "") + (e as Error).message, busy: false })); }
  }

  const players = (c: Color) => (c === human ? "Moi" : sg.mode === "ai" ? "Tengen " + LEVELS[sg.level ?? 0].name : sg.mode === "claude" ? "IA" : c === BLACK ? "Noir" : "Blanc");
  const sgf = toSgf(data, { black: players(BLACK), white: players(WHITE), result: sg.winner ? `${sg.winner === 1 ? "B" : "W"}+${sg.margin != null ? String(sg.margin) : "R"}` : undefined, date: new Date(sg.date).toISOString().slice(0, 10), event: "Tengen" });
  const blob = useMemo(() => URL.createObjectURL(new Blob([sgf], { type: "application/x-go-sgf" })), [sgf]);
  useEffect(() => () => URL.revokeObjectURL(blob), [blob]);

  return (
    <>
      <Header sub={`Analyse · ${n}×${n}`} back={() => go("parties")} />
      <div class="stack" style="gap:10px">
        {sg.result && <div class="result" style="font-size:18px">{sg.result}</div>}

        {review && <SummaryCard stats={stats} total={total} human={human} />}

        <Goban board={shown.board} marks={marks} onTap={variation || (!anim && review) ? varTap : undefined} full coords={store.settings.coords} />

        {anim && <div class="fb info spread"><span>{anim.label}</span><button class="btn small" onClick={() => { clearTimeout(timer.current); setAnim(null); }}>Revenir à la partie</button></div>}
        {variation && (
          <div class="card stack" style="gap:6px">
            <div class="spread"><b>Variante libre</b><button class="btn small" onClick={() => setVariation(null)}>Revenir à la partie</button></div>
            <p class="small muted">Touche le plateau pour jouer les coups de ton choix (les couleurs alternent). KataGo évalue chaque position.</p>
            {variation.eval ? <p class="small num">Noir : <b>{Math.round(variation.eval.winrateBlack * 100)} %</b> · avance : <b>{variation.eval.leadBlack >= 0 ? "Noir +" : "Blanc +"}{fr(Math.abs(variation.eval.leadBlack))}</b> · A : meilleure suite</p> : <p class="small muted thinking">Évaluation</p>}
            <button class="btn small" onClick={() => { const g = variation.game.clone(); g.undo(); if (g.moves.length <= variation.base) setVariation(null); else setVariation({ base: variation.base, game: g }); }}>Annuler le dernier coup</button>
          </div>
        )}

        {!anim && !variation && (
          <div class="field">
            <input type="range" min={0} max={total} value={i} onInput={(e) => navigate(+(e.target as HTMLInputElement).value)} aria-label="Coup affiché" />
            <div class="toolbar">
              <button class="btn" onClick={() => navigate(i - 1)}>Précédent</button>
              <button class="btn" onClick={() => navigate(i + 1)}>Suivant</button>
              <button class="btn" disabled={!prevMistake} onClick={() => prevMistake && navigate(prevMistake.i)}>Erreur préc.</button>
              <button class="btn" disabled={!nextMistake} onClick={() => nextMistake && navigate(nextMistake.i)}>Erreur suiv.</button>
            </div>
            <div class="spread small muted num"><span>Position après le coup {i} / {total}</span><label class="row" style="gap:6px"><input type="checkbox" checked={showOwn} onChange={(e) => setShowOwn((e.target as HTMLInputElement).checked)} /> Territoires</label></div>
          </div>
        )}

        {review && cur && !anim && !variation && (
          <div class="card stack" style="gap:8px">
            <div class="small num">Noir : <b>{Math.round(cur.winrateBlack * 100)} %</b> de chances · avance estimée : <b>{cur.leadBlack >= 0 ? "Noir +" : "Blanc +"}{fr(Math.abs(cur.leadBlack))}</b></div>
            {next && st && (
              <div class="stack" style="gap:6px">
                <div class="spread"><b>Coup {i + 1} : {next[0] === BLACK ? "Noir" : "Blanc"} {game.board.name(next[1])} <span class="muted small">(marqué d'une croix)</span></b>{st.kind && <span class={"chip " + (st.kind === "Gaffe" ? "warn" : st.kind === "Erreur" ? "copper" : "")}>{st.kind}</span>}</div>
                <p class="small">{st.loss < 0.5 ? "Excellent coup, conforme à KataGo." : `Perte estimée : ${fr(st.loss)} point${st.loss >= 2 ? "s" : ""}, chances de gain −${Math.round(st.drop * 100)} %.`}{st.rank === 0 ? " C'est le premier choix de KataGo." : st.rank > 0 ? ` C'est son choix n° ${st.rank + 1}.` : ""}</p>
              </div>
            )}
            <div class="stack" style="gap:4px">
              <span class="eyebrow">Meilleurs coups de KataGo</span>
              {cur.best.slice(0, 3).map((b, k) => {
                const mover = game.toPlay;
                return (
                  <div class="spread small" key={k} style="gap:6px;flex-wrap:wrap">
                    <span><b>{"ABC"[k]} · {game.board.name(b.p)}</b> <span class="muted num">{Math.round(b.winrate * 100)} % · {b.lead >= 0 ? "+" : "−"}{fr(Math.abs(b.lead))} pour {mover === BLACK ? "Noir" : "Blanc"}</span><br /><span class="muted">Suite : {b.pv.slice(0, 8).map((p) => game.board.name(p)).join(" ")}</span></span>
                    {b.pv.length > 1 && <button class="btn small" onClick={() => playPV(b.pv, `Suite de KataGo depuis ${game.board.name(b.p)} (coups numérotés)`)}>Voir la suite</button>}
                  </div>
                );
              })}
            </div>
            <p class="small muted">Astuce : touche le plateau pour essayer ta propre variante.</p>
          </div>
        )}

        {review ? (
          <>
            <div class="spread"><h3>Évolution de la partie</h3>
              <div class="seg" style="min-width:200px"><button aria-pressed={chart === "win"} onClick={() => setChart("win")}>Chances</button><button aria-pressed={chart === "score"} onClick={() => setChart("score")}>Score</button></div>
            </div>
            <Chart review={review} i={i} mode={chart} onPick={navigate} stats={stats} />
            <div class="spread"><h3>Moments clés</h3><span class="small muted">{human ? "Tes coups" : "Tous les coups"}</span></div>
            {mistakes.length === 0 && <p class="muted small">Aucune erreur marquante détectée.</p>}
            <div class="list">
              {mistakes.sort((a, b) => b.loss - a.loss).slice(0, 12).sort((a, b) => a.i - b.i).map((m) => {
                const g = fromData(data, m.i);
                return (
                  <button class="item" style="grid-template-columns:44px 1fr auto" key={m.i} onClick={() => navigate(m.i)}>
                    <span class={"stone" + (m.col === BLACK ? "" : " w")}>{m.i + 1}</span>
                    <span class="t"><b>{g.board.name(data.moves[m.i][1])} au lieu de {g.board.name(review[m.i].best[0].p)}</b><small>≈ {fr(m.loss)} points perdus · −{Math.round(m.drop * 100)} % de chances</small></span>
                    <span class={"chip " + (m.kind === "Gaffe" ? "warn" : m.kind === "Erreur" ? "copper" : "")}>{m.kind}</span>
                  </button>
                );
              })}
            </div>
            <div class="card stack" style="gap:8px">
              <b>Bilan de la partie par {hasKey() ? aiName() : "l'IA"}</b>
              {!hasKey() ? <p class="small muted">Ajoute une IA dans <a href="#/reglages">Réglages</a> pour obtenir un bilan rédigé : ce qui a décidé la partie et tes axes de progrès.</p>
                : report ? <div class="bubble"><span class="av">IA</span><span class={"tx" + (report.busy && !report.text ? " thinking" : "")}>{report.text || "Rédaction du bilan"}</span></div>
                : <button class="btn primary small" onClick={aiReport}>Rédiger le bilan</button>}
            </div>
            <details class="small muted"><summary>Refaire l'analyse</summary><div class="stack" style="margin-top:8px"><DepthPicker depth={depth} setDepth={setDepth} n={n} total={total} /><button class="btn small" onClick={run} disabled={prog != null}>Relancer</button></div></details>
          </>
        ) : (
          <div class="card stack" style="gap:8px">
            <b>Analyse par KataGo</b>
            <p class="small muted">KataGo étudie chaque position : chances de gain, score, erreurs, meilleurs coups et variantes. Tout se calcule sur ton téléphone.</p>
            {kata.status !== "ready" && kata.status !== "loading" ? <KataCard /> : null}
            <DepthPicker depth={depth} setDepth={setDepth} n={n} total={total} />
            {prog != null ? (
              <><div class="progress"><i style={{ width: `${prog * 100}%` }} /></div>
                <div class="spread small muted num"><span>{Math.round(prog * 100)} %</span><button class="btn small" onClick={() => engine.cancelReview()}>Arrêter</button></div></>
            ) : <button class="btn primary" onClick={run} disabled={kata.status === "loading"}>Analyser la partie</button>}
          </div>
        )}

        {!anim && !variation && <Coach game={game} context={review && next && st ? `Le coup suivant joué dans la partie était ${next[0] === BLACK ? "Noir" : "Blanc"} ${game.board.name(next[1])} (perte estimée ${fr(st.loss)} points). KataGo préférait ${game.board.name(review[i].best[0].p)}, avec la suite ${review[i].best[0].pv.slice(0, 6).map((p) => game.board.name(p)).join(" ")}.` : ""} />}

        <div class="card stack" style="gap:8px">
          <b>Exporter la partie</b>
          <p class="small muted">Le format SGF est lu par OGS, Sabaki, KaTrain et la plupart des logiciels de go.</p>
          <div class="row">
            <button class="btn small" onClick={async () => toast((await copyText(sgf)) ? "SGF copié" : "Copie impossible : sélectionne le texte ci-dessous")}>Copier le SGF</button>
            <a class="btn small" href={blob} download={`tengen-${new Date(sg.date).toISOString().slice(0, 10)}.sgf`}>Télécharger .sgf</a>
          </div>
          <details><summary class="small muted">Voir le texte SGF</summary><textarea readOnly value={sgf} style="font-size:12px;min-height:90px" /></details>
        </div>
      </div>
    </>
  );
}

function DepthPicker(props: { depth: keyof typeof DEPTHS; setDepth: (d: keyof typeof DEPTHS) => void; n: number; total: number }) {
  return (
    <div class="field">
      <span class="label">Profondeur</span>
      <div class="seg">{(Object.keys(DEPTHS) as (keyof typeof DEPTHS)[]).map((k) => <button key={k} aria-pressed={props.depth === k} onClick={() => { props.setDepth(k); store.setSettings({ analysisDepth: k }); }}>{DEPTHS[k].label}</button>)}</div>
      <span class="small muted">{DEPTHS[props.depth].desc} · durée estimée : {estimate(props.total, props.n, DEPTHS[props.depth].visits(props.n))}</span>
    </div>
  );
}

function SummaryCard(props: { stats: MoveStat[]; total: number; human: Color | 0 }) {
  const b = summary(props.stats, BLACK, props.total), w = summary(props.stats, WHITE, props.total);
  const row = (label: string, x: string, y: string) => <><span>{label}</span><b>{x}</b><b>{y}</b></>;
  return (
    <div class="card stack" style="gap:8px">
      <div class="spread"><b>Bilan chiffré</b><span class="small muted">selon KataGo</span></div>
      <div class="score-table">
        <span /><b>Noir{props.human === BLACK ? " (toi)" : ""}</b><b>Blanc{props.human === WHITE ? " (toi)" : ""}</b>
        {row("Précision", `${b.accuracy} %`, `${w.accuracy} %`)}
        {row("Coups de KataGo", `${b.top} %`, `${w.top} %`)}
        {row("Perte moyenne", fr(b.avgLoss), fr(w.avgLoss))}
        {row("Gaffes / erreurs", `${b.gaffes} / ${b.erreurs}`, `${w.gaffes} / ${w.erreurs}`)}
        {row("Ouverture", fr(b.phases[0]), fr(w.phases[0]))}
        {row("Milieu", fr(b.phases[1]), fr(w.phases[1]))}
        {row("Fin", fr(b.phases[2]), fr(w.phases[2]))}
      </div>
      <p class="small muted">Précision : part des coups à moins d'un point du meilleur. Pertes en points par coup, par tiers de partie.</p>
    </div>
  );
}

function Chart(props: { review: ReviewPos[]; i: number; mode: "win" | "score"; onPick: (i: number) => void; stats: MoveStat[] }) {
  const r = props.review, W = 600, H = 130, N = Math.max(1, r.length - 1);
  const maxLead = Math.max(5, ...r.map((p) => Math.abs(p.leadBlack)));
  const val = (p: ReviewPos) => (props.mode === "win" ? p.winrateBlack : 0.5 + p.leadBlack / (2 * maxLead));
  const x = (k: number) => (k / N) * W, y = (v: number) => H - v * H;
  const pts = r.map((p, k) => `${x(k).toFixed(1)},${y(val(p)).toFixed(1)}`).join(" ");
  return (
    <div class="chart-wrap">
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={props.mode === "win" ? "Chances de gain de Noir" : "Avance en points"}
        style={{ height: "130px" }}
        onClick={(e) => { const rc = (e.currentTarget as SVGElement).getBoundingClientRect(); props.onPick(Math.round(((e.clientX - rc.left) / rc.width) * N)); }}>
        <rect x="0" y="0" width={W} height={H} fill="var(--surface)" />
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="var(--ink)" opacity="0.13" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--line)" stroke-dasharray="4 4" />
        {props.stats.filter((s) => s.kind === "Gaffe" || s.kind === "Erreur").map((s) => <line key={s.i} x1={x(s.i + 1)} x2={x(s.i + 1)} y1="0" y2={H} stroke={s.kind === "Gaffe" ? "var(--bad)" : "var(--copper)"} stroke-width="1.5" opacity="0.55" vector-effect="non-scaling-stroke" />)}
        <polyline points={pts} fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1={x(props.i)} x2={x(props.i)} y1="0" y2={H} stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="spread small muted"><span>{props.mode === "win" ? "Noir en haut, Blanc en bas" : `Avance de Noir (échelle ±${Math.round(maxLead)} points)`}</span><span>Traits : gaffes et erreurs</span></div>
    </div>
  );
}

export { Game };
