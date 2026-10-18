import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Header, go, toast, fr } from "../ui/common";
import { Goban, Marks } from "../ui/Goban";
import { Game } from "../go/game";
import { PASS, BLACK, WHITE, Color, areaScore } from "../go/board";
import { fromData, toData } from "../engine/serial";
import { engine } from "../engine/client";
import { LEVELS } from "../engine/levels";
import { store, useStore, SavedGame } from "../store";
import { ask, hasKey, boardText, lastMovesText, extractJson, AIError, aiName } from "../coach/ai";
import { useKata } from "./play";

const colName = (c: Color) => (c === BLACK ? "Noir" : "Blanc");

export function GameScreen() {
  useStore();
  const kata = useKata();
  const saved0 = store.current;
  const [saved, setSaved] = useState<SavedGame | null>(saved0);
  const [game, setGame] = useState<Game | null>(() => (saved0 ? fromData(saved0.data) : null));
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ghost, setGhost] = useState<Marks["ghost"]>(undefined);
  const [heat, setHeat] = useState<Marks["heat"]>(undefined);
  const [own, setOwn] = useState<Float32Array | undefined>(undefined);
  const [scoring, setScoring] = useState<Set<number> | null>(null);
  const [claude, setClaude] = useState<{ text: string; thinking: boolean } | null>(null);
  const [winrate, setWinrate] = useState<number | null>(null);
  const [showEval, setShowEval] = useState(false);
  const epoch = useRef(0);

  const human = saved?.human ?? 1;
  const ended = !!saved?.result;
  const botTurn = !!saved && !!game && !ended && !scoring && saved.mode !== "local" && game.toPlay !== human;

  function persist(g: Game, extra: Partial<SavedGame> = {}) {
    const s = { ...saved!, data: toData(g), ...extra };
    setSaved(s); store.saveCurrent(s);
    return s;
  }
  function refresh(g: Game) { setGame(g); force((x) => x + 1); }

  // Tour de l'ordinateur
  useEffect(() => {
    if (!botTurn || busy || !game || !saved) return;
    const my = ++epoch.current;
    setBusy(true); setHeat(undefined); setOwn(undefined);
    (async () => {
      try {
        let p: number, resign = false, info = "";
        if (saved.mode === "claude") {
          const r = await claudeMove(game, saved.level ?? 4);
          if (my !== epoch.current) return;
          p = r.p; info = r.msg; resign = !!r.resign;
          setClaude({ text: r.msg, thinking: false });
        } else {
          const r = await engine.genmove(game, saved.level ?? 0);
          if (my !== epoch.current) return;
          p = r.p; resign = !!r.resign; info = r.info.note || "";
          if (r.info.winrate != null && (saved.level ?? 0) >= 2) setWinrate(game.toPlay === BLACK ? r.info.winrate : 1 - r.info.winrate);
        }
        if (resign) { finish(game, { winner: human as 1 | 2, result: `${colName(game.toPlay)} abandonne. ${colName(human as Color)} gagne.` }); return; }
        const g = game.clone(); g.play(p);
        setMsg(p === PASS ? (info || `${colName(game.toPlay)} passe.`) : capMsg(game, g));
        refresh(g); persist(g);
        if (g.isOver()) enterScoring(g);
      } catch (e) {
        setMsg("Le moteur a rencontré un problème : " + (e as Error).message);
      } finally { if (my === epoch.current) setBusy(false); }
    })();
  }, [botTurn, game?.moves.length, busy]);

  if (!saved || !game) return <><Header sub="Partie" back="jouer" /><p>Aucune partie en cours. <a href="#/jouer">Lancer une partie</a></p></>;
  const title = saved.mode === "ai" ? "contre " + LEVELS[saved.level ?? 0].name : saved.mode === "claude" ? "contre " + aiName("play") + " · " + LEVELS[saved.level ?? 4].name : "à deux";

  async function claudeMove(g: Game, level: number): Promise<{ p: number; msg: string; resign?: boolean }> {
    setClaude({ text: "", thinking: true });
    const me = g.toPlay;
    const head = `Tu joues une partie de go contre ton élève, qui débute (règles chinoises, komi ${fr(g.komi)}). Tu as les ${me === BLACK ? "Noirs (X)" : "Blancs (O)"}.\n\n${boardText(g)}\n\nDerniers coups : ${lastMovesText(g, 6)}.\nPierres capturées : Noir ${g.caps[0]}, Blanc ${g.caps[1]}.`;
    if (level < 4) {
      // Niveau réglé : le coup vient du moteur de ce niveau, l'IA se contente de l'expliquer.
      const r = await engine.genmove(g, level);
      if (r.resign) return { p: PASS, msg: "", resign: true };
      if (r.p === PASS) return { p: PASS, msg: r.info.note || "Je passe." };
      const mv = g.board.name(r.p);
      const prompt = `${head}\n\nTu joues volontairement au niveau « ${LEVELS[level].name} » pour rester à la portée de ton élève. Ton coup est déjà choisi : ${mv}. Il n'est pas forcément le meilleur : ne prétends pas le contraire et ne dévoile pas de meilleur coup.\n\nÉcris 1 ou 2 phrases simples pour ton élève : l'idée de ton coup en ${mv} et, si utile, un mot bienveillant sur son dernier coup ou un danger pour ses pierres. Réponds uniquement en JSON : {"message": "..."}`;
      try {
        const txt = await ask(prompt, { maxTokens: 300, role: "play" });
        const j = extractJson<{ message: string }>(txt);
        return { p: r.p, msg: j?.message || txt.replace(/[{}"]/g, "").trim().slice(0, 400) };
      } catch (e) { return { p: r.p, msg: (e as AIError).message }; }
    }
    const r = await engine.analyze(g, g.size <= 9 ? 48 : 20, g.size <= 9 ? 2500 : 4000);
    const cands = (r?.candidates || []).slice(0, 5);
    if (!cands.length) return { p: PASS, msg: "Je passe." };
    if (g.lastMove()?.p === PASS && cands[0].winrate > 0.5) {
      const dead = new Set(await engine.deadStones(g)); const sc = g.score(dead);
      if ((me === BLACK ? sc.margin : -sc.margin) > 0) return { p: PASS, msg: "Je passe aussi : on peut compter." };
    }
    const list = cands.map((c) => `${g.board.name(c.p)} (${Math.round(c.winrate * 100)} %)`).join(", ");
    const prompt = `${head}\nCandidats de KataGo avec ta chance de gagner : ${list}.\n\nChoisis UN coup de cette liste (le premier en général, un autre seulement s'il est presque aussi bon et plus instructif). Puis écris 1 ou 2 phrases simples pour ton élève : l'idée de ton coup et, si utile, un commentaire sur son dernier coup ou un danger pour ses pierres. Réponds uniquement en JSON : {"coup": "D5", "message": "..."}`;
    try {
      const txt = await ask(prompt, { maxTokens: 300, role: "play" });
      const j = extractJson<{ coup: string; message: string }>(txt);
      const want = j?.coup?.trim().toUpperCase();
      const hit = cands.find((c) => g.board.name(c.p) === want);
      return { p: (hit || cands[0]).p, msg: j?.message || "" };
    } catch (e) {
      return { p: cands[0].p, msg: (e as AIError).message + " KataGo joue à ma place." };
    }
  }

  function capMsg(before: Game, after: Game): string {
    const c = before.toPlay, k = c === BLACK ? 0 : 1, n = after.caps[k] - before.caps[k];
    return n > 0 ? `${colName(c)} capture ${n} pierre${n > 1 ? "s" : ""}.` : "";
  }

  function tap(p: number) {
    if (ended || busy) return;
    if (scoring) {
      if (!game!.board.c[p]) return;
      const grp = game!.board.group(p).stones, d = new Set(scoring), isDead = d.has(p);
      for (const q of grp) isDead ? d.delete(q) : d.add(q);
      setScoring(d); return;
    }
    if (botTurn) return;
    const g = game!;
    if (!g.isLegal(p)) { setGhost({ p, col: g.toPlay, bad: true }); setMsg(g.board.c[p] ? "Il y a déjà une pierre ici." : p === g.board.ko ? "Ko : joue d'abord ailleurs avant de reprendre." : "Coup interdit : ta pierre n'aurait aucune liberté."); return; }
    if (store.settings.confirmTap && !(ghost && ghost.p === p && !ghost.bad)) { setGhost({ p, col: g.toPlay }); setMsg(`Touche encore pour jouer en ${g.board.name(p)}.`); return; }
    const ng = g.clone(); ng.play(p);
    setGhost(undefined); setHeat(undefined); setOwn(undefined); setMsg(capMsg(g, ng));
    refresh(ng); persist(ng);
  }

  function pass() {
    if (busy || ended || botTurn) return;
    const g = game!.clone(); g.play(PASS); setMsg(`${colName(game!.toPlay)} passe.`); setHeat(undefined); setOwn(undefined);
    refresh(g); persist(g);
    if (g.isOver()) enterScoring(g);
  }

  function undo() {
    epoch.current++; setBusy(false);
    const g = game!.clone();
    const steps = saved!.mode === "local" ? 1 : g.toPlay === human ? 2 : 1;
    for (let i = 0; i < steps; i++) g.undo();
    setScoring(null); setHeat(undefined); setOwn(undefined); setGhost(undefined); setMsg("Coup annulé.");
    refresh(g); persist(g);
  }

  async function enterScoring(g: Game) {
    setBusy(true); setMsg("Fin de partie : estimation des pierres mortes…");
    try { const dead = await engine.deadStones(g); setScoring(new Set(dead)); setMsg("Touche un groupe pour le marquer mort ou vivant, puis valide."); }
    catch { setScoring(new Set()); }
    setBusy(false);
  }

  function finish(g: Game, res: { winner: 1 | 2; result: string; margin?: number }) {
    const s = persist(g, { result: res.result, winner: res.winner, margin: res.margin });
    store.saveGame(s); store.saveCurrent(s);
    if (s.mode === "ai" && s.human) store.rateGame(30 - LEVELS[s.level ?? 0].kyu + (s.data.handicap ? -s.data.handicap : 0), res.winner === s.human);
    setScoring(null); setMsg("");
  }

  function validateScore() {
    const g = game!, sc = g.score(scoring!);
    const diff = sc.margin, winner: 1 | 2 = diff > 0 ? 1 : 2;
    finish(g, { winner, margin: Math.abs(diff), result: `${colName(winner)} gagne de ${fr(Math.abs(diff))} point${Math.abs(diff) >= 2 ? "s" : ""}.` });
  }

  function resign() {
    const loser = saved!.mode === "local" ? game!.toPlay : (human as Color);
    epoch.current++; setBusy(false);
    finish(game!, { winner: (3 - loser) as 1 | 2, result: `${colName(loser)} abandonne. ${colName((3 - loser) as Color)} gagne.` });
  }

  async function hint() {
    if (busy || botTurn || ended) return;
    setBusy(true); setMsg("Recherche d'un bon coup…");
    try {
      const g = game!;
      if (engine.ready()) {
        const r = await engine.analyze(g, g.size <= 9 ? 40 : 16, 2500);
        const c = r!.candidates.filter((x) => x.p !== PASS).slice(0, 3);
        setHeat(c.map((x, i) => ({ p: x.p, v: 0.4 + 0.6 * (x.visits / (c[0].visits || 1)), text: "ABC"[i], best: i === 0 })));
        setMsg("Suggestions de KataGo : " + c.map((x, i) => `${"ABC"[i]} = ${g.board.name(x.p)} (${Math.round(x.winrate * 100)} %)`).join(", ") + ".");
      } else {
        const r = await engine.mc(g, 1200);
        const c = r.candidates.slice(0, 3);
        setHeat(c.map((x, i) => ({ p: x.p, v: 0.5, text: "ABC"[i], best: i === 0 })));
        setMsg("Suggestions (moteur maison) : " + c.map((x, i) => `${"ABC"[i]} = ${g.board.name(x.p)}`).join(", ") + ".");
      }
    } catch (e) { setMsg("Indice indisponible : " + (e as Error).message); }
    setBusy(false);
  }

  async function territory() {
    if (own) { setOwn(undefined); return; }
    setBusy(true);
    try { const o = await engine.ownership(game!); setOwn(o); let b = 0, w = 0; for (const v of o) { if (v > 0.5) b++; else if (v < -0.5) w++; } setMsg(`Zones probables : Noir ≈ ${b}, Blanc ≈ ${w} intersections${engine.ready() ? " (KataGo)" : ""}.`); }
    catch { /* */ }
    setBusy(false);
  }

  const marks: Marks = { last: game.lastMove()?.p, ghost, heat, own };
  if (game.board.ko >= 0 && !ended) marks.ko = game.board.ko;
  if (scoring) { marks.dead = scoring; const sc = areaScore(game.board, scoring); const t: Record<number, 1 | 2> = {}; for (const p of game.board.points()) if ((!game.board.c[p] || scoring.has(p)) && sc.owner[p]) t[p] = sc.owner[p] as 1 | 2; marks.terr = t; }
  if (ended && saved.result) { /* garder le plateau final */ }
  const sc = scoring ? game.score(scoring) : null;
  const turnLabel = ended ? "Partie terminée" : scoring ? "Décompte" : botTurn ? (saved.mode === "claude" ? aiName("play") + " réfléchit" : "L'ordinateur réfléchit") : saved.mode === "local" ? `À ${colName(game.toPlay)}` : `À toi (${colName(game.toPlay)})`;

  return (
    <>
      <Header sub={`${game.size}×${game.size} · ${title}`} back={() => go("jouer")} />
      <div class="stack" style="gap:10px">
        <div class="statusbar">
          <span class="who"><span class={"dot" + (game.toPlay === WHITE ? " w" : "")} /><span class={botTurn && busy ? "thinking" : ""}>{turnLabel}</span></span>
          <span class="small muted num">Prises : N {game.caps[0]} · B {game.caps[1]}</span>
        </div>
        {showEval && winrate != null && <div class="meter" title="Chance de gain de Noir"><i style={{ width: `${winrate * 100}%` }} /></div>}
        <Goban board={game.board} marks={marks} onTap={tap} full coords={store.settings.coords} />
        <p class="small muted" role="status" style="min-height:1.5em">{msg}</p>
        {claude && saved.mode === "claude" && !ended && (
          <div class="card bubble"><span class="av">IA</span><span class={"tx" + (claude.thinking ? " thinking" : "")}>{claude.thinking ? aiName("play") + " choisit son coup" : claude.text}</span></div>
        )}
        {scoring && !ended && sc && (
          <div class="card stack">
            <ScoreTable s={sc} komi={game.komi} />
            <div class="row"><button class="btn primary" onClick={validateScore}>Valider le score</button><button class="btn" onClick={() => { setScoring(null); setMsg("La partie reprend."); }}>Reprendre la partie</button></div>
          </div>
        )}
        {ended && (
          <div class="card stack">
            <div class="result">{saved.result}</div>
            <div class="row">
              <button class="btn primary" onClick={() => go("analyse/" + saved.id)}>Analyser la partie</button>
              <button class="btn" onClick={() => { const g = new Game(game.size, game.komi, game.handicap); const s: SavedGame = { ...saved, id: Date.now().toString(36), date: Date.now(), data: toData(g), result: undefined, winner: undefined, margin: undefined, review: undefined }; store.saveCurrent(s); setSaved(s); setGame(g); setMsg(""); setClaude(null); setWinrate(null); }}>Rejouer</button>
              <a class="btn" href="#/jouer">Autres réglages</a>
            </div>
          </div>
        )}
        {!scoring && !ended && (
          <>
            <div class="toolbar">
              <button class="btn" onClick={pass} disabled={busy || botTurn}>Passer</button>
              <button class="btn" onClick={undo} disabled={!game.moves.length}>Annuler</button>
              <button class="btn" onClick={hint} disabled={busy || botTurn}>Indice</button>
              <button class="btn" onClick={territory} disabled={busy}>{own ? "Masquer" : "Territoires"}</button>
            </div>
            <div class="spread">
              <ResignButton onConfirm={resign} />
              <label class="small muted row" style="gap:6px"><input type="checkbox" checked={showEval} onChange={(e) => setShowEval((e.target as HTMLInputElement).checked)} /> Évaluation</label>
              <span class="small muted num">Komi {fr(game.komi)} · coup {game.moves.length}</span>
            </div>
            <Coach game={game} />
            {(saved.mode === "claude" || (saved.level ?? 0) >= 2) && kata.status !== "ready" && <p class="small muted">KataGo n'est pas chargé : <a href="#/jouer">active-le</a>.</p>}
          </>
        )}
      </div>
    </>
  );
}

function ResignButton(props: { onConfirm: () => void }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 3000); return () => clearTimeout(t); }, [sure]);
  return <button class="btn small danger" onClick={() => (sure ? props.onConfirm() : setSure(true))}>{sure ? "Confirmer l'abandon" : "Abandonner"}</button>;
}

export function ScoreTable(props: { s: { blackStones: number; whiteStones: number; blackArea: number; whiteArea: number; black: number; white: number }; komi: number }) {
  const s = props.s;
  return (
    <div class="score-table">
      <span /><b>Noir</b><b>Blanc</b>
      <span>Pierres</span><b>{s.blackStones}</b><b>{s.whiteStones}</b>
      <span>Territoire</span><b>{s.blackArea}</b><b>{s.whiteArea}</b>
      <span>Komi</span><b>–</b><b>{fr(props.komi)}</b>
      <span>Total</span><b>{fr(s.black)}</b><b>{fr(s.white + props.komi)}</b>
    </div>
  );
}

/** Panneau « Demander à Claude » pendant la partie. */
export function Coach(props: { game: Game; context?: string }) {
  const [q, setQ] = useState("Qu'est-ce que je devrais regarder dans cette position ?");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const g = props.game;
  if (!hasKey("coach")) return (
    <details class="card"><summary style="font-weight:700;cursor:pointer">Demander conseil à l'IA</summary>
      <p class="small muted" style="margin-top:8px">Choisis une IA (Claude, ChatGPT, Gemini…) et ajoute ta clé dans les réglages pour poser des questions sur la position à un professeur.</p>
      <a class="btn small" href="#/reglages">Ouvrir les réglages</a>
    </details>
  );
  async function send() {
    setBusy(true); setOut(""); ctl.current = new AbortController();
    try {
      let engineInfo = "";
      if (engine.ready()) {
        const r = await engine.analyze(g, g.size <= 9 ? 40 : 16, 2500);
        if (r) engineInfo = `Analyse KataGo (${g.toPlay === BLACK ? "Noir" : "Blanc"} au trait) : chance de gain ${Math.round(r.winrate * 100)} %, avance ${fr(r.lead)} points. Meilleurs coups : ${r.candidates.slice(0, 4).map((c) => `${g.board.name(c.p)} (${Math.round(c.winrate * 100)} %, suite : ${c.pv.slice(0, 5).map((p) => g.board.name(p)).join(" ")})`).join(" ; ")}.`;
      }
      const prompt = `Position (${g.size}×${g.size}, komi ${fr(g.komi)}), c'est à ${g.toPlay === BLACK ? "Noir" : "Blanc"} de jouer :\n\n${boardText(g)}\n\nDerniers coups : ${lastMovesText(g)}.\nPierres capturées : Noir ${g.caps[0]}, Blanc ${g.caps[1]}.\n${engineInfo}\n${props.context || ""}\n\nQuestion de l'élève : ${q}\n\nRéponds en 6 phrases maximum.`;
      await ask(prompt, { role: "coach", onText: setOut, signal: ctl.current.signal });
    } catch (e) { setOut((x) => (x ? x + "\n\n" : "") + (e as Error).message); }
    setBusy(false);
  }
  return (
    <details class="card"><summary style="font-weight:700;cursor:pointer">Demander conseil à {aiName("coach")}</summary>
      <div class="stack" style="margin-top:10px;gap:8px">
        {out && <div class="bubble"><span class="av">IA</span><span class="tx">{out}</span></div>}
        {busy && !out && <div class="bubble"><span class="av">IA</span><span class="tx thinking">{aiName("coach")} réfléchit</span></div>}
        <textarea id="coach-q" aria-label="Ta question" value={q} onInput={(e) => setQ((e.target as HTMLTextAreaElement).value)} />
        <div class="row">
          <button class="btn small primary" onClick={send} disabled={busy}>Demander</button>
          {busy && <button class="btn small" onClick={() => ctl.current?.abort()}>Arrêter</button>}
          <button class="btn small ghost" onClick={() => setQ("Quels sont les groupes faibles des deux camps ?")}>Groupes faibles</button>
          <button class="btn small ghost" onClick={() => setQ("Pourquoi l'ordinateur a-t-il joué son dernier coup ?")}>Dernier coup</button>
        </div>
      </div>
    </details>
  );
}

export { useMemo };
