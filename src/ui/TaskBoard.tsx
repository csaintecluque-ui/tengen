import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Board, Color, BLACK, WHITE, PASS, areaScore } from "../go/board";
import { Goban, Marks, Shape, View } from "./Goban";
import type { Task } from "../content/types";
import TREES from "../content/trees.json";
import { store } from "../store";

interface Solution { win: string[]; refute: Record<string, string>; pv: Record<string, string[]>; }
const trees = TREES as unknown as Record<string, Solution>;

export interface TaskInput {
  key: string;            // clé de l'arbre de solution (« lecon#2 » ou id de problème)
  rows: string[];
  toPlay: Color;
  task: Task;
  koAt?: string;
  marks?: Record<string, Shape | string>;
  view?: View;
  ok?: string;
  show?: { libs?: string; terr?: boolean; marks?: Record<string, Shape | string> };
}

export type Outcome = "solved" | "failed-then-solved";

function libsOf(b: Board, p: number): number[] { return b.group(p).libs; }
function toMarks(b: Board, m?: Record<string, Shape | string>): Pick<Marks, "shapes" | "labels"> {
  if (!m) return {};
  const shapes: Record<number, Shape> = {}, labels: Record<number, string> = {};
  for (const [k, v] of Object.entries(m)) { const p = b.parse(k); if (["tri", "sq", "circ", "x"].includes(v)) shapes[p] = v as Shape; else labels[p] = v; }
  return { shapes, labels };
}

/**
 * Plateau interactif pour une tâche (leçon ou problème) : coups attendus, quiz, objectifs résolus par arbre de solution.
 * Appelle onDone quand la tâche est réussie (avec l'information « réussi du premier coup » ou non).
 */
export function TaskBoard(props: { input: TaskInput; onDone: (o: Outcome) => void; onFail?: () => void; showPrompt?: boolean }) {
  const { input } = props;
  const initial = useMemo(() => { const b = Board.fromRows(input.rows); if (input.koAt) b.ko = b.parse(input.koAt); return b; }, [input.key, input.rows.join("|")]);
  const [board, setBoard] = useState(() => initial.clone());
  const [msg, setMsg] = useState<{ kind: "ok" | "ko" | "info"; text: string } | null>(null);
  const [done, setDone] = useState(input.task.type === "read");
  const [failed, setFailed] = useState(false);
  const [extra, setExtra] = useState<Marks>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const [quizPick, setQuizPick] = useState<{ i: number; right: boolean }[]>([]);
  const timer = useRef<number>(0);
  const user = input.toPlay, opponent: Color = user === BLACK ? WHITE : BLACK;

  useEffect(() => { reset(); return () => clearTimeout(timer.current); }, [input.key]);
  useEffect(() => { if (input.task.type === "read") props.onDone("solved"); }, [input.key]);

  function reset() {
    clearTimeout(timer.current);
    setBoard(initial.clone()); setMsg(null);
    setDone(input.task.type === "read"); setExtra(input.koAt ? { ko: initial.ko } : {}); setBusy(false); setPending(null); setQuizPick([]);
  }

  function succeed(b: Board, text?: string) {
    setDone(true);
    const m: Marks = {};
    if (input.show?.libs) { const p = b.parse(input.show.libs); if (b.c[p]) m.dots = libsOf(b, p); }
    if (input.show?.terr) { const s = areaScore(b); const t: Record<number, 1 | 2> = {}; for (const p of b.points()) if (!b.c[p] && s.owner[p]) t[p] = s.owner[p] as 1 | 2; m.terr = t; }
    if (input.show?.marks) Object.assign(m, toMarks(b, input.show.marks));
    if (input.koAt === undefined && input.task.type === "move" && b.ko >= 0) m.ko = b.ko;
    setExtra((e) => ({ ...e, ...m }));
    setMsg({ kind: "ok", text: text ?? input.ok ?? "Bravo !" });
    props.onDone(failed ? "failed-then-solved" : "solved");
  }
  function fail(text: string) { setFailed(true); setTries((t) => t + 1); setMsg({ kind: "ko", text }); props.onFail?.(); }

  function onTap(p: number) {
    if (done || busy) return;
    const t = input.task;
    if (t.type === "quiz" || t.type === "read") return;
    if (t.type === "illegal") {
      if (board.name(p) === t.at) { setExtra({ ghost: { p, col: user, bad: true } }); succeed(board); }
      else setMsg({ kind: "info", text: `Essaie plutôt en ${t.at}.` });
      return;
    }
    if (!board.isLegal(p, user)) {
      setExtra((e) => ({ ...e, ghost: { p, col: user, bad: true } }));
      setMsg({ kind: "ko", text: board.c[p] ? "Il y a déjà une pierre ici." : p === board.ko ? "Ko : on ne peut pas reprendre tout de suite." : "Coup interdit : ta pierre n'aurait aucune liberté." });
      return;
    }
    if (store.settings.confirmTap && pending !== p && board.n > 9) { setPending(p); setExtra((e) => ({ ...e, ghost: { p, col: user } })); return; }
    setPending(null);
    const name = board.name(p);
    if (t.type === "free") { const nb = board.clone(); nb.play(p, user); setBoard(nb); setExtra({ last: p }); succeed(nb); return; }
    if (t.type === "move") {
      if (t.accept.includes(name)) {
        const nb = board.clone(); nb.play(p, user); setBoard(nb); setExtra({ last: p });
        const reply = t.replies?.[name];
        if (reply) { setBusy(true); timer.current = window.setTimeout(() => { const rb = nb.clone(); const rp = rb.parse(reply); rb.play(rp, opponent); setBoard(rb); setExtra({ last: rp }); setBusy(false); succeed(rb); }, 450); }
        else succeed(nb);
      } else {
        setExtra((e) => ({ ...e, ghost: { p, col: user, bad: true } }));
        fail(tries >= 1 ? "Pas ici. " + t.hint : "Ce n'est pas le meilleur coup. Réessaie.");
        timer.current = window.setTimeout(() => setExtra((e) => ({ ...e, ghost: undefined })), 900);
      }
      return;
    }
    if (t.type === "goal") {
      const sol = trees[input.key];
      const nb = board.clone(); nb.play(p, user);
      if (sol && sol.win.includes(name)) {
        setBoard(nb); setExtra({ last: p });
        const pv = sol.pv[name] || [];
        if (!pv.length) { succeed(nb); return; }
        setBusy(true); setMsg({ kind: "ok", text: "Bon coup ! Voici la suite…" });
        playSeq(nb, pv, opponent, () => { setBusy(false); });
        return;
      }
      const ref = sol?.refute[name];
      if (ref) {
        setBoard(nb); setExtra({ last: p }); setBusy(true);
        timer.current = window.setTimeout(() => { const rb = nb.clone(); const rp = rb.parse(ref); rb.play(rp, opponent); setBoard(rb); setExtra({ last: rp }); setBusy(false);
          fail(`Raté : la réponse en ${ref} réfute ton coup. ` + (tries >= 1 ? t.hint : "Recommence et cherche mieux.")); }, 450);
        return;
      }
      setExtra((e) => ({ ...e, ghost: { p, col: user, bad: true } }));
      fail(tries >= 1 ? "Ce coup ne résout pas le problème. " + t.hint : "Ce coup ne résout pas le problème. Réessaie.");
      timer.current = window.setTimeout(() => setExtra((e) => ({ ...e, ghost: undefined })), 900);
    }
  }

  /** Joue une suite de coups en alternance, en commençant par `first`, puis valide. */
  function playSeq(start: Board, seq: string[], first: Color, end: () => void) {
    let b = start, col = first, i = 0;
    const stepFn = () => {
      if (i >= seq.length) { end(); succeed(b); return; }
      b = b.clone(); const q = b.parse(seq[i]); b.play(q, col); setBoard(b); setExtra({ last: q });
      col = col === BLACK ? WHITE : BLACK; i++;
      timer.current = window.setTimeout(stepFn, 650);
    };
    timer.current = window.setTimeout(stepFn, 500);
  }

  async function showSolution() {
    const t = input.task; reset(); await new Promise((r) => setTimeout(r, 50));
    setFailed(true);
    if (t.type === "move") { const p = initial.parse(t.accept[0]); setExtra({ labels: { [p]: "✓" } }); setMsg({ kind: "info", text: "Solution : " + t.accept.join(" ou ") + "." }); return; }
    if (t.type === "goal") {
      const sol = trees[input.key]; if (!sol?.win.length) return;
      const first = sol.win[0], b = initial.clone(); const p = b.parse(first); b.play(p, user); setBoard(b); setExtra({ last: p });
      setBusy(true);
      const pv = sol.pv[first] || [];
      let bb = b, col: Color = opponent, i = 0;
      const stepFn = () => {
        if (i >= pv.length) { setBusy(false); setMsg({ kind: "info", text: "Solution : " + [first, ...pv].join(", ") + ". Recommence pour la jouer toi-même." }); return; }
        bb = bb.clone(); const q = bb.parse(pv[i]); bb.play(q, col); setBoard(bb); setExtra({ last: q }); col = col === BLACK ? WHITE : BLACK; i++;
        timer.current = window.setTimeout(stepFn, 650);
      };
      timer.current = window.setTimeout(stepFn, 650);
    }
  }

  const t = input.task;
  const marks: Marks = { ...toMarks(board, input.marks), ...extra };
  return (
    <div class="stack">
      {t.type !== "read" && <Goban board={board} marks={marks} onTap={onTap} view={input.view} coords={store.settings.coords} />}
      {t.type === "read" && (input.rows.some((r) => /[XO]/.test(r)) || input.marks) && <Goban board={board} marks={marks} view={input.view} coords={store.settings.coords} />}
      {t.type !== "read" && (
        <div class="task">
          {props.showPrompt !== false && <div class="prompt">{"prompt" in t ? t.prompt : ""}</div>}
          {t.type === "quiz" && (
            <div class="opts">
              {t.options.map((o, i) => {
                const pick = quizPick.find((q) => q.i === i);
                return <button key={i} class={"opt" + (pick ? (pick.right ? " right" : " wrong") : "")} disabled={done}
                  onClick={() => { const right = i === t.answer; setQuizPick((q) => [...q, { i, right }]); if (right) succeed(board); else fail("Pas tout à fait. Regarde bien le plateau et réessaie."); }}>{o}</button>;
              })}
            </div>
          )}
          {msg && <div class={"fb " + msg.kind} role="status">{msg.text}</div>}
          {(t.type === "move" || t.type === "goal" || t.type === "illegal" || t.type === "free") && (
            <div class="row">
              <button class="btn small" onClick={reset} disabled={busy}>Recommencer</button>
              {(t.type === "move" || t.type === "goal") && !done && tries >= 1 && <button class="btn small ghost" onClick={showSolution} disabled={busy}>Voir la solution</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { PASS };
