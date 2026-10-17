import { useState } from "preact/hooks";
import { Header, Rich, Progress, go } from "../ui/common";
import { TaskBoard } from "../ui/TaskBoard";
import { MODULES, findLesson, nextLesson, ALL_LESSONS } from "../content";
import { PROBLEMS } from "../content/problems";
import { useStore, store } from "../store";

export function LearnScreen() {
  const s = useStore();
  const done = ALL_LESSONS.filter((l) => s.progress.lessons[l.id]).length;
  const next = ALL_LESSONS.find((l) => !s.progress.lessons[l.id]);
  const due = PROBLEMS.filter((p) => { const st = s.progress.problems[p.id]; return st && st.due <= Date.now(); }).length;
  const [open, setOpen] = useState<string | null>(() => MODULES.find((m) => m.lessons.some((l) => !s.progress.lessons[l.id]))?.id ?? MODULES[0].id);
  return (
    <>
      <Header sub="Apprendre le go pas à pas" />
      <div class="stack">
        <div class="card stack" style="gap:10px">
          <div class="spread"><span class="eyebrow">Ton parcours</span><span class="muted small num">{done} / {ALL_LESSONS.length} leçons</span></div>
          <Progress value={done / ALL_LESSONS.length} />
          {next ? (
            <div class="spread" style="flex-wrap:wrap">
              <div style="min-width:0"><div class="muted small">Prochaine leçon</div><b>{next.title}</b></div>
              <a class="btn primary" href={`#/lecon/${next.id}`}>{done ? "Continuer" : "Commencer"}</a>
            </div>
          ) : <p>Parcours terminé. Bravo ! Entretiens ta lecture avec les problèmes et les parties.</p>}
          {due > 0 && <a class="btn" href="#/problemes/revisions">{due} problème{due > 1 ? "s" : ""} à réviser aujourd'hui</a>}
        </div>

        {MODULES.map((m, mi) => {
          const md = m.lessons.filter((l) => s.progress.lessons[l.id]).length;
          const isOpen = open === m.id;
          return (
            <section class="module" key={m.id}>
              <header>
                <span class="kanji" aria-hidden="true">{m.kanji}</span>
                <button style="all:unset;cursor:pointer;flex:1;min-width:0" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.id)}>
                  <span class="eyebrow">Module {mi + 1}</span>
                  <h3>{m.title}</h3>
                  <span class="muted small">{m.sub}</span>
                </button>
                <span class={"chip" + (md === m.lessons.length ? " ok" : "")}>{md}/{m.lessons.length}</span>
              </header>
              {isOpen && (
                <div class="body list">
                  {m.lessons.map((l, i) => {
                    const ok = !!s.progress.lessons[l.id];
                    return (
                      <a class="item" key={l.id} href={`#/lecon/${l.id}`}>
                        <span class={"stone" + (ok ? " w" : "")}>{i + 1}</span>
                        <span class="t"><b>{l.title}</b><small>{l.sub}</small></span>
                        {ok ? <span class="chip ok">Fait</span> : <span class="chip">{l.steps.length} étape{l.steps.length > 1 ? "s" : ""}</span>}
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <div class="card">
          <h3>Les règles en cinq lignes</h3>
          <ol style="margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
            <li>Noir commence, puis chacun pose une pierre sur une intersection.</li>
            <li>Une chaîne sans liberté est capturée et retirée.</li>
            <li>Le suicide est interdit, sauf s'il capture.</li>
            <li>Ko : pas de reprise immédiate d'une seule pierre.</li>
            <li>Deux passes de suite : on compte pierres + espace entouré. Blanc reçoit 7,5 de komi.</li>
          </ol>
        </div>
      </div>
    </>
  );
}

export function LessonScreen(props: { id: string; step: number }) {
  useStore();
  const f = findLesson(props.id);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  if (!f) return <><Header sub="Leçon introuvable" back="apprendre" /><p>Cette leçon n'existe pas.</p></>;
  const { lesson, module } = f;
  const si = Math.min(props.step, lesson.steps.length - 1);
  const step = lesson.steps[si];
  const key = `${lesson.id}#${si}`;
  const last = si === lesson.steps.length - 1;
  const finished = props.step >= lesson.steps.length;
  if (finished) return <LessonDone id={lesson.id} />;
  const canNext = !!solved[key] || !step.task || step.task.type === "read";
  return (
    <>
      <Header sub={`${module.title} · ${lesson.title}`} back={() => go("apprendre")} />
      <div class="stack">
        <div class="stack" style="gap:8px">
          <h2>{lesson.title}</h2>
          <div class="steps" aria-label={`Étape ${si + 1} sur ${lesson.steps.length}`}>{lesson.steps.map((_, k) => <i key={k} class={k <= si ? "on" : ""} />)}</div>
        </div>
        <Rich text={step.text} />
        {step.board && step.task && (
          <TaskBoard key={key} input={{ key, rows: step.board, toPlay: step.toPlay ?? 1, task: step.task, koAt: step.koAt, marks: step.marks, view: step.view, ok: step.ok, show: step.show }}
            onDone={() => setSolved((x) => ({ ...x, [key]: true }))} />
        )}
        <div class="row">
          {si > 0 && <a class="btn" href={`#/lecon/${lesson.id}/${si - 1}`}>Précédent</a>}
          <button class="btn primary" disabled={!canNext} onClick={() => {
            if (last) { store.lessonDone(lesson.id); go(`lecon/${lesson.id}/${lesson.steps.length}`); }
            else go(`lecon/${lesson.id}/${si + 1}`);
          }}>{last ? "Terminer la leçon" : "Étape suivante"}</button>
        </div>
      </div>
    </>
  );
}

function LessonDone(props: { id: string }) {
  const f = findLesson(props.id)!;
  const nx = nextLesson(props.id);
  const related = PROBLEMS.filter((p) => p.level <= 2).slice(0, 0);
  void related;
  return (
    <>
      <Header sub="Leçon terminée" back={() => go("apprendre")} />
      <div class="stack">
        <h2>{f.lesson.title} : acquis</h2>
        <p class="muted">{nx ? `Leçon suivante : ${nx.title}.` : "Tu as terminé tout le parcours."}</p>
        <div class="row">
          {nx && <a class="btn primary" href={`#/lecon/${nx.id}`}>Continuer</a>}
          <a class="btn" href="#/problemes">Faire des problèmes</a>
          <a class="btn" href="#/jouer">Jouer une partie</a>
        </div>
      </div>
    </>
  );
}
