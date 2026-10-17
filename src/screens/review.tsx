import { useEffect, useMemo, useState } from "preact/hooks";
import { Header, go, fr, copyText, toast } from "../ui/common";
import { Goban, Marks } from "../ui/Goban";
import { fromData } from "../engine/serial";
import { engine, ReviewPoint } from "../engine/client";
import { store, useStore, SavedGame } from "../store";
import { PASS, BLACK } from "../go/board";
import { toSgf } from "../go/sgf";
import { useKata, KataCard } from "./play";
import { Coach } from "./game";
import { LEVELS } from "../engine/levels";

interface Mistake { i: number; drop: number; loss: number; kind: string; }

function classify(r: ReviewPoint[], data: SavedGame["data"]): Mistake[] {
  const out: Mistake[] = [];
  for (let i = 0; i < data.moves.length && i + 1 < r.length; i++) {
    const col = data.moves[i][0];
    const before = col === BLACK ? r[i].winrateBlack : 1 - r[i].winrateBlack;
    const after = col === BLACK ? r[i + 1].winrateBlack : 1 - r[i + 1].winrateBlack;
    const lb = col === BLACK ? r[i].leadBlack : -r[i].leadBlack, la = col === BLACK ? r[i + 1].leadBlack : -r[i + 1].leadBlack;
    const drop = before - after, loss = lb - la;
    if (drop >= 0.2 || loss >= 8) out.push({ i, drop, loss, kind: "Gaffe" });
    else if (drop >= 0.1 || loss >= 4) out.push({ i, drop, loss, kind: "Erreur" });
    else if (drop >= 0.05 || loss >= 2) out.push({ i, drop, loss, kind: "Imprécision" });
  }
  return out;
}

export function ReviewScreen(props: { id: string }) {
  useStore();
  const sg = store.games.find((g) => g.id === props.id) || (store.current?.id === props.id ? store.current : null);
  if (!sg) return <><Header sub="Analyse" back="profil" /><p>Partie introuvable.</p></>;
  return <ReviewInner key={sg.id} sg={sg} />;
}

function ReviewInner({ sg }: { sg: SavedGame }) {
  const kata = useKata();
  const props = { id: sg.id };
  const [n, setN] = useState(() => sg.data.moves.length);
  const [prog, setProg] = useState<number | null>(null);
  const [review, setReview] = useState<ReviewPoint[] | undefined>(sg.review);
  const [onlyMine, setOnlyMine] = useState(true);
  const data = sg.data;
  const game = useMemo(() => fromData(data, n), [props.id, n]);

  async function run() {
    if (!engine.ready()) { const ok = await engine.loadKatago(); if (!ok) return; }
    setProg(0);
    const g = fromData(data!);
    const r = await engine.review(g, (p) => setProg(p));
    setProg(null);
    if (r) { setReview(r); const s = { ...sg!, review: r }; store.saveGame(s); if (store.current?.id === s.id) store.saveCurrent(s); }
  }
  const mistakes = review ? classify(review, data).filter((m) => !onlyMine || !sg.human || data.moves[m.i][0] === sg.human) : [];
  const total = data.moves.length;
  const cur = review?.[n];
  const marks: Marks = { last: n > 0 ? data.moves[n - 1][1] : undefined };
  if (cur && n < total) {
    const best = cur.best.filter((i) => i < data.size * data.size).slice(0, 3);
    marks.heat = best.map((i, k) => ({ p: game.board.idx(i % data.size, Math.floor(i / data.size)), v: k === 0 ? 1 : 0.5, text: "ABC"[k], best: k === 0 }));
  }
  if (store.settings.showMoveNumbers) {
    const nums: Record<number, number> = {}; data.moves.slice(0, n).forEach((m, i) => { if (m[1] !== PASS) nums[m[1]] = i + 1; }); marks.numbers = nums;
  }
  const next = n < total ? data.moves[n] : null;
  const sgf = toSgf(data, { black: sg.human === 1 ? "Moi" : sg.mode === "ai" ? "Tengen " + LEVELS[sg.level ?? 0].name : sg.mode === "claude" ? "Claude" : "Noir", white: sg.human === 2 ? "Moi" : sg.mode === "ai" ? "Tengen " + LEVELS[sg.level ?? 0].name : sg.mode === "claude" ? "Claude" : "Blanc", result: sg.winner ? `${sg.winner === 1 ? "B" : "W"}+${sg.margin != null ? fr(sg.margin).replace(",", ".") : "R"}` : undefined, date: new Date(sg.date).toISOString().slice(0, 10), event: "Tengen" });
  const blob = useMemo(() => URL.createObjectURL(new Blob([sgf], { type: "application/x-go-sgf" })), [sgf]);
  useEffect(() => () => URL.revokeObjectURL(blob), [blob]);

  return (
    <>
      <Header sub={`Analyse · ${data.size}×${data.size}`} back={() => go("parties")} />
      <div class="stack" style="gap:10px">
        {sg.result && <div class="result" style="font-size:18px">{sg.result}</div>}
        <Goban board={game.board} marks={marks} full coords={store.settings.coords} />
        <div class="field">
          <input type="range" min={0} max={total} value={n} onInput={(e) => setN(+(e.target as HTMLInputElement).value)} aria-label="Coup affiché" />
          <div class="toolbar">
            <button class="btn" onClick={() => setN(0)}>Début</button>
            <button class="btn" onClick={() => setN(Math.max(0, n - 1))}>Précédent</button>
            <button class="btn" onClick={() => setN(Math.min(total, n + 1))}>Suivant</button>
            <button class="btn" onClick={() => setN(total)}>Fin</button>
          </div>
          <div class="spread small muted num"><span>Coup {n} / {total}</span>{next && <span>Coup joué ensuite : {next[0] === BLACK ? "Noir" : "Blanc"} {game.board.name(next[1])}</span>}</div>
        </div>

        {review ? (
          <>
            {cur && <div class="small num">Chance de gain de Noir : <b>{Math.round(cur.winrateBlack * 100)} %</b> · avance estimée : <b>{cur.leadBlack >= 0 ? "Noir +" : "Blanc +"}{fr(Math.abs(cur.leadBlack))}</b>{marks.heat?.length ? " · A, B, C : coups préférés de KataGo" : ""}</div>}
            <WinChart review={review} n={n} onPick={setN} />
            <div class="spread"><h3>Moments clés</h3>{sg.human ? <label class="small muted row" style="gap:6px"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine((e.target as HTMLInputElement).checked)} /> Mes coups seulement</label> : null}</div>
            {mistakes.length === 0 && <p class="muted small">Aucune erreur marquante détectée.</p>}
            <div class="list">
              {mistakes.slice(0, 20).map((m) => (
                <button class="item" style="grid-template-columns:44px 1fr auto" key={m.i} onClick={() => setN(m.i)}>
                  <span class={"stone" + (data.moves[m.i][0] === BLACK ? "" : " w")}>{m.i + 1}</span>
                  <span class="t"><b>{data.moves[m.i][0] === BLACK ? "Noir" : "Blanc"} {game.board.name(data.moves[m.i][1])}</b><small>−{Math.round(m.drop * 100)} % de chances · ≈ {fr(Math.max(0, m.loss))} points perdus</small></span>
                  <span class={"chip " + (m.kind === "Gaffe" ? "warn" : m.kind === "Erreur" ? "copper" : "")}>{m.kind}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div class="card stack" style="gap:8px">
            <b>Analyse par KataGo</b>
            <p class="small muted">KataGo évalue chaque position de la partie : courbe des chances de gain, erreurs repérées et meilleurs coups. Tout se calcule sur ton téléphone.</p>
            {kata.status !== "ready" && kata.status !== "loading" ? <KataCard /> : null}
            {prog != null ? <><div class="progress"><i style={{ width: `${prog * 100}%` }} /></div><span class="small muted num">{Math.round(prog * 100)} %</span></> : <button class="btn primary" onClick={run} disabled={kata.status === "loading"}>Analyser la partie</button>}
          </div>
        )}

        <Coach game={game} context={review && n < total ? `Le coup suivant joué dans la partie était ${next?.[0] === BLACK ? "Noir" : "Blanc"} ${next ? game.board.name(next[1]) : ""}. KataGo évalue Noir à ${Math.round((review[n]?.winrateBlack ?? 0.5) * 100)} % avant ce coup et ${Math.round((review[n + 1]?.winrateBlack ?? 0.5) * 100)} % après.` : ""} />

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

function WinChart(props: { review: ReviewPoint[]; n: number; onPick: (i: number) => void }) {
  const r = props.review, W = 600, H = 120, N = Math.max(1, r.length - 1);
  const x = (i: number) => (i / N) * W, y = (v: number) => H - v * H;
  const pts = r.map((p, i) => `${x(i).toFixed(1)},${y(p.winrateBlack).toFixed(1)}`).join(" ");
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <div class="chart-wrap">
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Chance de gain de Noir au fil de la partie"
        onClick={(e) => { const rc = (e.currentTarget as SVGElement).getBoundingClientRect(); props.onPick(Math.round(((e.clientX - rc.left) / rc.width) * N)); }}>
        <rect x="0" y="0" width={W} height={H} fill="var(--surface)" />
        <polygon points={area} fill="var(--ink)" opacity="0.14" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--line)" stroke-dasharray="4 4" />
        <polyline points={pts} fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke" />
        <line x1={x(props.n)} x2={x(props.n)} y1="0" y2={H} stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="spread small muted"><span>Noir en haut, Blanc en bas</span><span>Touche la courbe pour y aller</span></div>
    </div>
  );
}
