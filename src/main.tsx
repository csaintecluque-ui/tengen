import { render } from "preact";
import "./styles.css";
import { App } from "./app";
import { applyTheme } from "./store";
import { registerSW } from "virtual:pwa-register";

applyTheme();
registerSW({
  immediate: true,
  // Sur iPhone, l'appli installée reste souvent en mémoire : on vérifie s'il existe une nouvelle version à chaque retour au premier plan.
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => { if (document.visibilityState === "visible" && navigator.onLine) reg.update().catch(() => {}); };
    document.addEventListener("visibilitychange", check);
    setInterval(check, 30 * 60 * 1000);
  },
});
render(<App />, document.getElementById("app")!);
