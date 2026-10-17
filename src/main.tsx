import { render } from "preact";
import "./styles.css";
import { App } from "./app";
import { applyTheme } from "./store";
import { registerSW } from "virtual:pwa-register";

applyTheme();
registerSW({ immediate: true });
render(<App />, document.getElementById("app")!);
