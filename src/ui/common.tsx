import type { ComponentChildren, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";

export const BASE = import.meta.env.BASE_URL;

export function go(path: string) { location.hash = "#/" + path.replace(/^\/+/, ""); }
export function back(fallback = "") { if (history.length > 1) history.back(); else go(fallback); }

const SEAL = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#1B1512"/><circle cx="50" cy="50" r="38" fill="none" stroke="#C9804F" stroke-width="4"/><path d="M35.16 62.29Q33.05 62.29 31.73 61.58Q30.41 60.87 29.74 59.72Q29.07 58.57 28.91 57.19Q28.75 55.81 28.99 54.44Q29.33 52.64 30.19 51.21Q31.06 49.78 32.31 48.79Q33.55 47.79 35.01 47.26Q36.46 46.74 37.95 46.74Q38.93 46.74 39.94 46.95Q40.95 47.17 41.5 47.48Q41.67 47.58 41.69 47.67Q41.71 47.77 41.69 48.03L41.35 51.06Q41.35 51.15 41.23 51.15Q41.11 51.15 41.09 51.06Q40.75 49.26 39.67 48.3Q38.59 47.34 36.99 47.34Q35.57 47.34 34.39 48.1Q33.22 48.87 32.44 50.3Q31.66 51.73 31.35 53.7Q31.08 55.35 31.25 56.83Q31.42 58.3 31.93 59.43Q32.45 60.56 33.3 61.21Q34.15 61.86 35.31 61.86Q36.55 61.86 37.83 60.97Q39.1 60.08 40.37 58.23Q40.44 58.14 40.55 58.2Q40.66 58.26 40.63 58.3L39.96 61.02Q39.87 61.3 39.81 61.41Q39.75 61.52 39.53 61.57Q38.35 61.98 37.23 62.13Q36.1 62.29 35.16 62.29Z M48.4 62.43Q47.14 62.43 45.86 62.16Q44.58 61.89 43.18 61.21Q43.03 61.1 42.96 60.94Q42.89 60.78 42.96 60.52L43.9 55.56Q43.9 55.38 44.1 55.38Q44.29 55.38 44.29 55.56Q44.62 57.46 45.27 58.83Q45.91 60.2 46.92 60.94Q47.93 61.68 49.33 61.68Q50.38 61.68 51.26 61.23Q52.14 60.78 52.75 59.93Q53.37 59.08 53.55 57.79Q53.83 56.2 53.31 55.05Q52.79 53.9 51.82 52.98Q50.85 52.06 49.73 51.27Q48.61 50.44 47.61 49.54Q46.6 48.64 46.08 47.47Q45.55 46.3 45.84 44.68Q46.24 42.78 47.43 41.55Q48.61 40.33 50.25 39.72Q51.89 39.1 53.62 39.1Q54.55 39.1 55.6 39.3Q56.64 39.5 57.72 39.97Q58.23 40.22 58.15 40.58L57.65 45.01Q57.61 45.15 57.43 45.15Q57.25 45.15 57.22 45.01Q56.97 43.5 56.37 42.33Q55.78 41.16 54.9 40.47Q54.01 39.79 52.79 39.79Q51.6 39.79 50.81 40.33Q50.02 40.87 49.57 41.68Q49.12 42.49 48.97 43.28Q48.72 44.72 49.23 45.75Q49.73 46.77 50.68 47.6Q51.64 48.43 52.68 49.26Q53.87 50.12 54.95 51.09Q56.03 52.06 56.62 53.32Q57.22 54.58 56.93 56.28Q56.61 57.97 55.53 59.37Q54.45 60.78 52.66 61.6Q50.88 62.43 48.4 62.43Z M66.06 62.29Q63.95 62.29 62.63 61.58Q61.31 60.87 60.64 59.72Q59.97 58.57 59.81 57.19Q59.65 55.81 59.89 54.44Q60.23 52.64 61.09 51.21Q61.96 49.78 63.21 48.79Q64.45 47.79 65.91 47.26Q67.36 46.74 68.85 46.74Q69.83 46.74 70.84 46.95Q71.85 47.17 72.4 47.48Q72.57 47.58 72.59 47.67Q72.61 47.77 72.59 48.03L72.25 51.06Q72.25 51.15 72.13 51.15Q72.01 51.15 71.99 51.06Q71.65 49.26 70.57 48.3Q69.49 47.34 67.89 47.34Q66.47 47.34 65.29 48.1Q64.12 48.87 63.34 50.3Q62.56 51.73 62.25 53.7Q61.98 55.35 62.15 56.83Q62.32 58.3 62.83 59.43Q63.35 60.56 64.2 61.21Q65.05 61.86 66.21 61.86Q67.45 61.86 68.73 60.97Q70 60.08 71.27 58.23Q71.34 58.14 71.45 58.2Q71.56 58.26 71.53 58.3L70.86 61.02Q70.77 61.3 70.71 61.41Q70.65 61.52 70.43 61.57Q69.25 61.98 68.13 62.13Q67 62.29 66.06 62.29Z" fill="#EAD9B8"/></svg>`;

export function Header(props: { sub: string; back?: string | (() => void); actions?: ComponentChildren }) {
  const onBack = () => { if (typeof props.back === "function") props.back(); else back(props.back); };
  return (
    <header class="top">
      <span class="seal" dangerouslySetInnerHTML={{ __html: SEAL }} />
      <div class="brand"><b>Tengen</b><span>{props.sub}</span></div>
      <div class="actions">
        {props.actions}
        {props.back !== undefined && <button class="iconbtn" onClick={onBack}>Retour</button>}
      </div>
    </header>
  );
}

/** Texte enrichi minimal : **gras**, *italique*, paragraphes, listes « - » et « 1. ». */
export function Rich(props: { text: string; class?: string }) {
  const blocks = props.text.split(/\n\s*\n/);
  return (
    <div class={"prose " + (props.class || "")}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*(-|\d+\.)\s/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const items = lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*(-|\d+\.)\s/, ""))}</li>);
          return ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
        }
        const head = lines.filter((l) => !/^\s*(-|\d+\.)\s/.test(l));
        const list = lines.filter((l) => /^\s*(-|\d+\.)\s/.test(l));
        return (
          <div key={i} style="display:flex;flex-direction:column;gap:6px">
            {head.length > 0 && <p>{inline(head.join(" "))}</p>}
            {list.length > 0 && <ul>{list.map((l, j) => <li key={j}>{inline(l.replace(/^\s*(-|\d+\.)\s/, ""))}</li>)}</ul>}
          </div>
        );
      })}
    </div>
  );
}
function inline(s: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g; let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[1] ? <b key={k++}>{m[1]}</b> : <i key={k++}>{m[2]}</i>);
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Seg<T extends string | number | boolean>(props: { label: string; value: T; options: [T, string, boolean?][]; onChange: (v: T) => void }) {
  return (
    <div class="field">
      <span class="label">{props.label}</span>
      <div class="seg" role="group" aria-label={props.label}>
        {props.options.map(([v, l, dis]) => (
          <button key={String(v)} aria-pressed={v === props.value} disabled={!!dis} onClick={() => props.onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function Progress(props: { value: number }) {
  return <div class="progress" role="progressbar" aria-valuenow={Math.round(props.value * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(0, Math.min(1, props.value)) * 100}%` }} /></div>;
}

let toastSet: ((s: string | null) => void) | null = null;
export function toast(s: string) { toastSet?.(s); setTimeout(() => toastSet?.(null), 2600); }
export function ToastHost() {
  const [t, set] = useState<string | null>(null);
  useEffect(() => { toastSet = set; return () => { toastSet = null; }; }, []);
  return t ? <div class="toast" role="status">{t}</div> : null;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function fr(n: number, digits = 1) { return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(".", ","); }
export function plural(n: number, w: string) { return `${n} ${w}${Math.abs(n) >= 2 ? "s" : ""}`; }
