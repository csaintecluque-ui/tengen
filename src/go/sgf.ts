/** Lecture et écriture du format SGF (Smart Game Format), le standard des fichiers de parties de go. */
import { Game } from "./game";
import { BLACK, WHITE, PASS, Color } from "./board";
import type { GameData } from "../engine/serial";
import { fromData, toData } from "../engine/serial";

const L = "abcdefghijklmnopqrs";
function coord(g: Game, p: number) { return p === PASS ? "" : L[g.board.x(p)] + L[g.board.y(p)]; }

export function toSgf(d: GameData, meta: { black?: string; white?: string; result?: string; date?: string; event?: string } = {}): string {
  const g = fromData({ ...d, moves: [] });
  let s = `(;GM[1]FF[4]CA[UTF-8]AP[Tengen]SZ[${d.size}]KM[${d.komi}]RU[Chinese]`;
  if (meta.event) s += `EV[${esc(meta.event)}]`;
  if (meta.date) s += `DT[${meta.date}]`;
  if (meta.black) s += `PB[${esc(meta.black)}]`;
  if (meta.white) s += `PW[${esc(meta.white)}]`;
  if (meta.result) s += `RE[${esc(meta.result)}]`;
  if (d.handicap) s += `HA[${d.handicap}]`;
  if (d.setupBlack.length) s += "AB" + d.setupBlack.map((p) => `[${coord(g, p)}]`).join("");
  if (d.setupWhite.length) s += "AW" + d.setupWhite.map((p) => `[${coord(g, p)}]`).join("");
  if (!d.moves.length && d.start === WHITE) s += "PL[W]";
  for (const [c, p] of d.moves) s += `;${c === BLACK ? "B" : "W"}[${coord(g, p)}]`;
  return s + ")";
}
function esc(t: string) { return t.replace(/\\/g, "\\\\").replace(/]/g, "\\]"); }

/** Lit la branche principale d'un SGF. */
export function fromSgf(text: string): { data: GameData; meta: Record<string, string> } {
  const props: { key: string; vals: string[] }[][] = [];
  let i = text.indexOf("(");
  if (i < 0) throw new Error("Ce n'est pas un fichier SGF.");
  let node: { key: string; vals: string[] }[] | null = null, depth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") { depth++; if (depth > 1 && props.length) { /* variante : on ne garde que la branche principale */ let d = 1; i++; while (i < text.length && d > 0) { if (text[i] === "\\") i++; else if (text[i] === "[") { i++; while (i < text.length && text[i] !== "]") { if (text[i] === "\\") i++; i++; } } else if (text[i] === "(") d++; else if (text[i] === ")") d--; i++; } depth--; continue; } i++; continue; }
    if (ch === ")") { depth--; i++; if (depth <= 0) break; continue; }
    if (ch === ";") { node = []; props.push(node); i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      let key = ""; while (i < text.length && /[A-Za-z]/.test(text[i])) { if (/[A-Z]/.test(text[i])) key += text[i]; i++; }
      const vals: string[] = [];
      while (true) {
        while (i < text.length && /\s/.test(text[i])) i++;
        if (text[i] !== "[") break;
        i++; let v = "";
        while (i < text.length && text[i] !== "]") { if (text[i] === "\\") { i++; } v += text[i]; i++; }
        i++; vals.push(v);
      }
      node?.push({ key, vals });
      continue;
    }
    i++;
  }
  if (!props.length) throw new Error("SGF vide.");
  const root = props[0], get = (k: string) => root.find((p) => p.key === k)?.vals[0];
  const size = parseInt(get("SZ") || "19", 10);
  if (!(size >= 5 && size <= 19)) throw new Error("Taille de plateau non prise en charge : " + size);
  const komi = parseFloat(get("KM") || "6.5");
  const g = new Game(size, isNaN(komi) ? 6.5 : komi);
  const pt = (v: string) => (v === "" || v === "tt" ? PASS : g.board.idx(L.indexOf(v[0]), L.indexOf(v[1])));
  const expand = (v: string): string[] => {
    if (!v.includes(":")) return [v];
    const [a, b] = v.split(":"), out: string[] = [];
    for (let x = L.indexOf(a[0]); x <= L.indexOf(b[0]); x++) for (let y = L.indexOf(a[1]); y <= L.indexOf(b[1]); y++) out.push(L[x] + L[y]);
    return out;
  };
  const setupBlack: number[] = [], setupWhite: number[] = [];
  for (const p of root) {
    if (p.key === "AB") for (const v of p.vals) for (const e of expand(v)) setupBlack.push(pt(e));
    if (p.key === "AW") for (const v of p.vals) for (const e of expand(v)) setupWhite.push(pt(e));
  }
  const moves: [Color, number][] = [];
  for (const nd of props) for (const p of nd) {
    if (p.key === "B") moves.push([BLACK, pt(p.vals[0] ?? "")]);
    if (p.key === "W") moves.push([WHITE, pt(p.vals[0] ?? "")]);
  }
  const pl = get("PL");
  const start: Color = moves.length ? moves[0][0] : pl === "W" ? WHITE : setupBlack.length > 1 && !setupWhite.length ? WHITE : BLACK;
  const data: GameData = { size, komi: g.komi, handicap: parseInt(get("HA") || "0", 10) || 0, setupBlack, setupWhite, start, moves };
  // vérifie la légalité en rejouant
  const check = fromData(data);
  if (check.moves.length !== moves.length) data.moves = toData(check).moves;
  const meta: Record<string, string> = {};
  for (const k of ["PB", "PW", "RE", "DT", "EV", "GN"]) { const v = get(k); if (v) meta[k] = v; }
  return { data, meta };
}
