import { useEffect, useState } from "preact/hooks";
import { ToastHost } from "./ui/common";
import { LearnScreen, LessonScreen } from "./screens/learn";
import { ProblemsScreen, ProblemScreen } from "./screens/problems";
import { PlayScreen } from "./screens/play";
import { GameScreen } from "./screens/game";
import { ReviewScreen } from "./screens/review";
import { LibraryScreen, ArticleScreen, GlossaryScreen, ProverbsScreen } from "./screens/library";
import { ProfileScreen, SettingsScreen, GamesScreen } from "./screens/profile";
import { engine } from "./engine/client";
import { store } from "./store";

function useRoute(): string[] {
  const get = () => (location.hash.replace(/^#\/?/, "") || "apprendre").split("/").map(decodeURIComponent);
  const [r, set] = useState(get);
  useEffect(() => { const f = () => { set(get()); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
}

const TABS = [
  { id: "apprendre", label: "Apprendre", match: ["apprendre", "lecon"], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2.4" /><circle cx="12" cy="11.5" r="2.4" fill="currentColor" /><circle cx="18" cy="5" r="2.4" /><path d="M7.7 16.3l2.6-3M13.7 9.8l2.6-3" /></svg> },
  { id: "problemes", label: "Problèmes", match: ["problemes", "probleme"], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16M8 4v16M16 4v16" /><circle cx="12" cy="12" r="2.6" fill="currentColor" /></svg> },
  { id: "jouer", label: "Jouer", match: ["jouer", "partie", "analyse"], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="9" cy="12" r="5" fill="currentColor" /><circle cx="16" cy="12" r="5" /></svg> },
  { id: "bibliotheque", label: "Bibliothèque", match: ["bibliotheque", "article", "glossaire", "proverbes"], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 5.5v14C9.5 18 6.5 18 4 19.5zM20 5.5C17.5 4 14.5 4 12 5.5v14c2.5-1.5 5.5-1.5 8 0z" /></svg> },
  { id: "profil", label: "Profil", match: ["profil", "reglages", "parties"], icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" /></svg> },
];

export function App() {
  const r = useRoute();
  useEffect(() => {
    // Précharge KataGo s'il est déjà sur l'appareil (aucun téléchargement imposé)
    if (store.settings.autoKatago) engine.isCached().then((c) => { if (c) engine.loadKatago(); });
  }, []);
  let screen;
  switch (r[0]) {
    case "lecon": screen = <LessonScreen id={r[1]} step={r[2] ? +r[2] : 0} />; break;
    case "problemes": screen = <ProblemsScreen filter={r[1]} />; break;
    case "probleme": screen = <ProblemScreen id={r[1]} queue={r[2]} />; break;
    case "jouer": screen = <PlayScreen />; break;
    case "partie": screen = <GameScreen />; break;
    case "analyse": screen = <ReviewScreen id={r[1]} />; break;
    case "bibliotheque": screen = <LibraryScreen />; break;
    case "article": screen = <ArticleScreen id={r[1]} />; break;
    case "glossaire": screen = <GlossaryScreen />; break;
    case "proverbes": screen = <ProverbsScreen />; break;
    case "profil": screen = <ProfileScreen />; break;
    case "reglages": screen = <SettingsScreen />; break;
    case "parties": screen = <GamesScreen />; break;
    default: screen = <LearnScreen />;
  }
  return (
    <>
      <div class="app">{screen}</div>
      <nav class="tabbar" aria-label="Sections">
        <div class="in">
          {TABS.map((t) => (
            <a key={t.id} href={"#/" + t.id} aria-current={t.match.includes(r[0]) ? "page" : undefined}>{t.icon}{t.label}</a>
          ))}
        </div>
      </nav>
      <ToastHost />
    </>
  );
}
