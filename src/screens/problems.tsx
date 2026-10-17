import { useMemo, useState } from "preact/hooks";
import { Header, go } from "../ui/common";
import { TaskBoard } from "../ui/TaskBoard";
import { PROBLEMS, THEMES } from "../content/problems";
import { useStore, store } from "../store";
import type { Problem, Task } from "../content/types";

const LEVEL_NAMES = ["", "Facile", "Abordable", "Moyen", "Difficile", "Expert"];

export function ProblemsScreen(props: { filter?: string }) {
  const s = useStore();
  const [theme, setTheme] = useState<string>(props.filter && props.filter !== "revisions" ? props.filter : "Tous");
  const revisions = props.filter === "revisions";
  const list = useMemo(() => {
    let l = PROBLEMS;
    if (revisions) l = l.filter((p) => { const st = s.progress.problems[p.id]; return st && st.due <= Date.now(); });
    else if (theme !== "Tous") l = l.filter((p) => p.theme === theme);
    return l;
  }, [theme, revisions, s.progress]);
  const solved = PROBLEMS.filter((p) => s.progress.problems[p.id]?.ok).length;
  const due = PROBLEMS.filter((p) => { const st = s.progress.problems[p.id]; return st && st.due <= Date.now(); }).length;
  const firstUnsolved = PROBLEMS.find((p) => !s.progress.problems[p.id]);
  const queue = list.map((p) => p.id).join(",");
  return (
    <>
      <Header sub="Problèmes · tsumego" back={revisions ? "problemes" : undefined} />
      <div class="stack">
        <div class="card stack" style="gap:10px">
          <div class="spread"><span class="eyebrow">{revisions ? "Révisions du jour" : "Entraînement"}</span><span class="muted small num">{solved} / {PROBLEMS.length} résolus</span></div>
          <p class="muted small">Chaque problème est vérifié par un solveur : l'adversaire répond avec la meilleure défense, et une erreur est réfutée sur le plateau. Les problèmes ratés reviennent en révision les jours suivants.</p>
          <div class="row">
            {firstUnsolved && !revisions && <a class="btn primary" href={`#/probleme/${firstUnsolved.id}/${PROBLEMS.filter((p) => !s.progress.problems[p.id]).map((p) => p.id).join(",")}`}>Enchaîner les nouveaux</a>}
            {due > 0 && !revisions && <a class="btn" href="#/problemes/revisions">Réviser ({due})</a>}
          </div>
        </div>
        {!revisions && (
          <div class="row" role="group" aria-label="Thèmes" style="gap:6px">
            {["Tous", ...THEMES].map((t) => <button key={t} class={"chip" + (t === theme ? " accent" : "")} style="border:0;min-height:34px;font-size:13px" onClick={() => setTheme(t)}>{t}</button>)}
          </div>
        )}
        {list.length === 0 && <p class="muted">{revisions ? "Rien à réviser pour l'instant." : "Aucun problème."}</p>}
        <div class="grid">
          {list.map((p) => {
            const st = s.progress.problems[p.id];
            return (
              <a class="tile" key={p.id} href={`#/probleme/${p.id}/${queue}`}>
                <span class="eyebrow">{p.theme} · {LEVEL_NAMES[p.level]}</span>
                <b>{p.title}</b>
                {st?.ok ? <span class={"chip " + (st.ko ? "warn" : "ok")} style="align-self:flex-start">{st.ko ? "Résolu après erreur" : "Résolu"}</span> : <small>{p.prompt}</small>}
              </a>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function ProblemScreen(props: { id: string; queue?: string }) {
  useStore();
  const p = PROBLEMS.find((x) => x.id === props.id);
  const [state, setState] = useState<"idle" | "ok" | "late">("idle");
  const [recorded, setRecorded] = useState(false);
  if (!p) return <><Header sub="Problème" back="problemes" /><p>Problème introuvable.</p></>;
  const queue = (props.queue || "").split(",").filter(Boolean);
  const idx = queue.indexOf(p.id);
  const next = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  const task: Task = p.goal ? { type: "goal", prompt: p.prompt, goal: p.goal, hint: p.hint } : { type: "move", prompt: p.prompt, accept: p.accept || [], hint: p.hint };
  const col = p.toPlay === 1 ? "Noir" : "Blanc";
  return (
    <>
      <Header sub={`${p.theme} · ${LEVEL_NAMES[p.level]}`} back={() => go("problemes")} />
      <div class="stack">
        <div class="spread"><h2>{p.title}</h2><span class="chip">{col} joue</span></div>
        <TaskBoard key={p.id} input={{ key: p.id, rows: p.rows, toPlay: p.toPlay, task, view: p.view, ok: p.explain }}
          onFail={() => { if (!recorded) { store.problemResult(p.id, false); setRecorded(true); } }}
          onDone={(o) => {
            setState(o === "solved" ? "ok" : "late");
            if (!recorded) { store.problemResult(p.id, o === "solved"); setRecorded(true); }
            else if (o !== "solved") { const st = store.progress.problems[p.id]; if (st && !st.ok) { st.ok = 1; store.saveProgress(); } }
          }} />
        {state !== "idle" && (
          <div class="row">
            {next && <a class="btn primary" href={`#/probleme/${next}/${props.queue}`}>Problème suivant</a>}
            <a class="btn" href="#/problemes">Tous les problèmes</a>
          </div>
        )}
      </div>
    </>
  );
}

export type { Problem };
