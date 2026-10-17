import { useEffect, useRef } from "preact/hooks";
import { Board, COLS, BLACK, WHITE } from "../go/board";

export type Shape = "tri" | "sq" | "circ" | "x";
export interface Marks {
  last?: number;
  ghost?: { p: number; col: 1 | 2; bad?: boolean };
  labels?: Record<number, string>;
  shapes?: Record<number, Shape>;
  terr?: Record<number, 1 | 2>;
  dead?: Set<number>;
  ko?: number;
  /** points mis en évidence (libertés) */
  dots?: number[];
  /** carte de chaleur : valeur 0..1 et texte */
  heat?: { p: number; v: number; text?: string; best?: boolean }[];
  /** propriété du point de vue de Noir (index y*n+x) */
  own?: Float32Array;
  numbers?: Record<number, number>;
}
export interface View { x0: number; y0: number; x1: number; y1: number; }

function hoshi(n: number): [number, number][] {
  const a = n === 9 ? [2, 6] : n === 13 ? [3, 9] : n === 19 ? [3, 9, 15] : n >= 15 ? [3, n - 4] : [];
  const pts: [number, number][] = [];
  a.forEach((x) => a.forEach((y) => pts.push([x, y])));
  if (n % 2 === 1 && n >= 9) pts.push([(n - 1) / 2, (n - 1) / 2]);
  if (n === 19) { pts.push([3, 9], [15, 9], [9, 3], [9, 15]); }
  return Array.from(new Set(pts.map((p) => p.join(",")))).map((s) => s.split(",").map(Number) as [number, number]);
}

function drawStone(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: number, alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  g.fillStyle = "rgba(0,0,0,.26)"; g.beginPath(); g.arc(x + r * 0.08, y + r * 0.12, r, 0, 7); g.fill();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  if (col === BLACK) { gr.addColorStop(0, "#6b6b6b"); gr.addColorStop(0.45, "#262626"); gr.addColorStop(1, "#0b0b0b"); }
  else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#efebe2"); gr.addColorStop(1, "#c6c0b3"); }
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.restore();
}

export function Goban(props: { board: Board; marks?: Marks; onTap?: (p: number) => void; coords?: boolean; view?: View; full?: boolean; label?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const geo = useRef({ cell: 0, pad: 0, x0: 0, y0: 0 });
  const propsRef = useRef(props); propsRef.current = props;

  const draw = () => {
    const c = cv.current; if (!c) return;
    const { board: b, marks: m = {}, coords = true, view } = propsRef.current;
    const n = b.n;
    const v = view || { x0: 0, y0: 0, x1: n - 1, y1: n - 1 };
    const cols = v.x1 - v.x0 + 1, rows = v.y1 - v.y0 + 1;
    const W = c.clientWidth; if (!W) return;
    const padF = coords ? 1.05 : 0.62;
    const cell = W / (cols - 1 + 2 * padF);
    const H = cell * (rows - 1 + 2 * padF);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.aspectRatio = `${W} / ${H}`; }
    const g = c.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = cell * padF;
    geo.current = { cell, pad, x0: v.x0, y0: v.y0 };
    const cs = getComputedStyle(document.documentElement);
    const woodA = cs.getPropertyValue("--wood-a").trim() || "#E7C27C", woodB = cs.getPropertyValue("--wood-b").trim() || "#D2A35A";
    const line = cs.getPropertyValue("--wood-line").trim() || "#3A2913", grain = cs.getPropertyValue("--wood-grain").trim();
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, woodA); bg.addColorStop(1, woodB);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = grain; g.lineWidth = 1;
    let s = 7; for (let i = 0; i < 30; i++) { s = (s * 9301 + 49297) % 233280; const yy = (s / 233280) * H; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(W * 0.3, yy + 6, W * 0.6, yy - 7, W, yy + 3); g.stroke(); }
    const PX = (x: number) => pad + (x - v.x0) * cell, PY = (y: number) => pad + (y - v.y0) * cell;
    g.strokeStyle = line; g.globalAlpha = 0.85; g.lineWidth = Math.max(0.8, cell / 32);
    g.beginPath();
    for (let y = v.y0; y <= v.y1; y++) { g.moveTo(PX(v.x0 === 0 ? 0 : v.x0 - 0.45), PY(y)); g.lineTo(PX(v.x1 === n - 1 ? n - 1 : v.x1 + 0.45), PY(y)); }
    for (let x = v.x0; x <= v.x1; x++) { g.moveTo(PX(x), PY(v.y0 === 0 ? 0 : v.y0 - 0.45)); g.lineTo(PX(x), PY(v.y1 === n - 1 ? n - 1 : v.y1 + 0.45)); }
    g.stroke();
    g.lineWidth = Math.max(1.4, cell / 18); g.beginPath();
    if (v.y0 === 0) { g.moveTo(PX(v.x0 === 0 ? 0 : v.x0 - 0.45), PY(0)); g.lineTo(PX(v.x1 === n - 1 ? n - 1 : v.x1 + 0.45), PY(0)); }
    if (v.y1 === n - 1) { g.moveTo(PX(v.x0 === 0 ? 0 : v.x0 - 0.45), PY(n - 1)); g.lineTo(PX(v.x1 === n - 1 ? n - 1 : v.x1 + 0.45), PY(n - 1)); }
    if (v.x0 === 0) { g.moveTo(PX(0), PY(v.y0 === 0 ? 0 : v.y0 - 0.45)); g.lineTo(PX(0), PY(v.y1 === n - 1 ? n - 1 : v.y1 + 0.45)); }
    if (v.x1 === n - 1) { g.moveTo(PX(n - 1), PY(v.y0 === 0 ? 0 : v.y0 - 0.45)); g.lineTo(PX(n - 1), PY(v.y1 === n - 1 ? n - 1 : v.y1 + 0.45)); }
    g.stroke(); g.globalAlpha = 1;
    g.fillStyle = line;
    for (const [hx, hy] of hoshi(n)) if (hx >= v.x0 && hx <= v.x1 && hy >= v.y0 && hy <= v.y1) { g.beginPath(); g.arc(PX(hx), PY(hy), Math.max(2, cell * 0.09), 0, 7); g.fill(); }
    if (coords) {
      g.globalAlpha = 0.75; g.font = `700 ${Math.max(9, Math.min(14, cell * 0.36))}px "Atkinson Hyperlegible", sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      for (let x = v.x0; x <= v.x1; x++) { g.fillText(COLS[x], PX(x), pad * 0.42); g.fillText(COLS[x], PX(x), H - pad * 0.42); }
      for (let y = v.y0; y <= v.y1; y++) { g.fillText(String(n - y), pad * 0.42, PY(y)); g.fillText(String(n - y), W - pad * 0.42, PY(y)); }
      g.globalAlpha = 1;
    }
    const r = cell * 0.47;
    const inView = (p: number) => { const x = b.x(p), y = b.y(p); return x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1; };
    // propriété
    if (m.own) {
      for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
        const o = m.own[y * n + x]; if (Math.abs(o) < 0.15) continue;
        const p = b.idx(x, y); const stone = b.c[p];
        if (stone && ((stone === BLACK && o > 0) || (stone === WHITE && o < 0))) continue;
        const sz = cell * (0.18 + 0.32 * Math.min(1, Math.abs(o)));
        g.fillStyle = o > 0 ? `rgba(15,15,15,${0.25 + 0.55 * Math.abs(o)})` : `rgba(252,250,245,${0.3 + 0.6 * Math.abs(o)})`;
        g.fillRect(PX(x) - sz / 2, PY(y) - sz / 2, sz, sz);
      }
    }
    if (m.terr) for (const k in m.terr) {
      const p = +k; if (!inView(p)) continue; const o = m.terr[p], sz = cell * 0.34;
      g.fillStyle = o === BLACK ? "rgba(20,20,20,.8)" : "rgba(250,248,242,.95)"; g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
      g.fillRect(PX(b.x(p)) - sz / 2, PY(b.y(p)) - sz / 2, sz, sz); if (o === WHITE) g.strokeRect(PX(b.x(p)) - sz / 2, PY(b.y(p)) - sz / 2, sz, sz);
    }
    for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
      const p = b.idx(x, y), col = b.c[p]; if (col !== BLACK && col !== WHITE) continue;
      const dead = m.dead?.has(p);
      drawStone(g, PX(x), PY(y), r, col, dead ? 0.4 : 1);
      if (dead) { g.strokeStyle = col === BLACK ? "#fff" : "#222"; g.lineWidth = 2; const k = r * 0.45; g.beginPath(); g.moveTo(PX(x) - k, PY(y) - k); g.lineTo(PX(x) + k, PY(y) + k); g.moveTo(PX(x) + k, PY(y) - k); g.lineTo(PX(x) - k, PY(y) + k); g.stroke(); }
    }
    if (m.numbers) {
      g.textAlign = "center"; g.textBaseline = "middle";
      for (const k in m.numbers) { const p = +k; if (!inView(p) || !b.c[p]) continue;
        g.fillStyle = b.c[p] === BLACK ? "#f4f1ea" : "#1a1a1a"; const t = String(m.numbers[p]);
        g.font = `700 ${cell * (t.length > 2 ? 0.34 : 0.42)}px "Atkinson Hyperlegible", sans-serif`; g.fillText(t, PX(b.x(p)), PY(b.y(p)) + 0.5); }
    }
    if (m.heat) {
      g.textAlign = "center"; g.textBaseline = "middle";
      for (const h of m.heat) { if (!inView(h.p)) continue; const X = PX(b.x(h.p)), Y = PY(b.y(h.p));
        const a = 0.35 + 0.6 * Math.min(1, h.v);
        g.fillStyle = h.best ? `rgba(43,122,75,${a})` : `rgba(44,74,120,${a})`;
        g.beginPath(); g.arc(X, Y, r * (0.55 + 0.4 * Math.min(1, h.v)), 0, 7); g.fill();
        if (h.text) { g.fillStyle = "#fff"; g.font = `700 ${cell * 0.32}px "Atkinson Hyperlegible", sans-serif`; g.fillText(h.text, X, Y + 0.5); } }
    }
    if (m.ghost && inView(m.ghost.p)) {
      const X = PX(b.x(m.ghost.p)), Y = PY(b.y(m.ghost.p)); drawStone(g, X, Y, r, m.ghost.col, 0.55);
      if (m.ghost.bad) { g.strokeStyle = "#C0392B"; g.lineWidth = 3; const k = r * 0.5; g.beginPath(); g.moveTo(X - k, Y - k); g.lineTo(X + k, Y + k); g.moveTo(X + k, Y - k); g.lineTo(X - k, Y + k); g.stroke(); }
    }
    if (m.last != null && m.last >= 0 && inView(m.last) && (b.c[m.last] === BLACK || b.c[m.last] === WHITE) && !(m.numbers && m.numbers[m.last])) {
      g.strokeStyle = b.c[m.last] === BLACK ? "#f4f1ea" : "#1a1a1a"; g.lineWidth = Math.max(1.6, cell / 17);
      g.beginPath(); g.arc(PX(b.x(m.last)), PY(b.y(m.last)), r * 0.42, 0, 7); g.stroke();
    }
    if (m.dots) for (const p of m.dots) { if (!inView(p)) continue; g.fillStyle = "rgba(44,74,120,.9)"; g.beginPath(); g.arc(PX(b.x(p)), PY(b.y(p)), cell * 0.17, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.stroke(); }
    if (m.ko != null && m.ko >= 0 && inView(m.ko)) { const ks = cell * 0.44; g.strokeStyle = "#B03A2E"; g.lineWidth = 2.5; g.strokeRect(PX(b.x(m.ko)) - ks / 2, PY(b.y(m.ko)) - ks / 2, ks, ks); }
    if (m.shapes) for (const k in m.shapes) {
      const p = +k; if (!inView(p)) continue; const X = PX(b.x(p)), Y = PY(b.y(p)), sh = m.shapes[p];
      g.strokeStyle = b.c[p] === BLACK ? "#f4f1ea" : b.c[p] === WHITE ? "#1a1a1a" : "#B03A2E"; g.lineWidth = Math.max(1.8, cell / 16);
      const k2 = r * 0.5; g.beginPath();
      if (sh === "tri") { g.moveTo(X, Y - k2); g.lineTo(X + k2 * 0.9, Y + k2 * 0.6); g.lineTo(X - k2 * 0.9, Y + k2 * 0.6); g.closePath(); }
      else if (sh === "sq") g.rect(X - k2 * 0.75, Y - k2 * 0.75, k2 * 1.5, k2 * 1.5);
      else if (sh === "circ") g.arc(X, Y, k2 * 0.8, 0, 7);
      else { g.moveTo(X - k2 * 0.7, Y - k2 * 0.7); g.lineTo(X + k2 * 0.7, Y + k2 * 0.7); g.moveTo(X + k2 * 0.7, Y - k2 * 0.7); g.lineTo(X - k2 * 0.7, Y + k2 * 0.7); }
      g.stroke();
    }
    if (m.labels) for (const k in m.labels) {
      const p = +k; if (!inView(p)) continue; const X = PX(b.x(p)), Y = PY(b.y(p)), t = m.labels[p];
      if (!b.c[p]) { g.fillStyle = "rgba(44,74,120,.93)"; g.beginPath(); g.arc(X, Y, r * 0.86, 0, 7); g.fill(); g.fillStyle = "#fff"; }
      else g.fillStyle = b.c[p] === BLACK ? "#f4f1ea" : "#1a1a1a";
      g.font = `700 ${cell * (t.length > 1 ? 0.38 : 0.46)}px "Atkinson Hyperlegible", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, X, Y + 0.5);
    }
  };

  useEffect(() => { draw(); });
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ro = new ResizeObserver(() => draw()); ro.observe(c);
    const mq = matchMedia("(prefers-color-scheme: dark)"); const f = () => draw(); mq.addEventListener?.("change", f);
    document.fonts?.ready.then(() => draw());
    return () => { ro.disconnect(); mq.removeEventListener?.("change", f); };
  }, []);

  const onClick = (ev: MouseEvent) => {
    const { board: b, onTap } = propsRef.current; if (!onTap || !cv.current) return;
    const rect = cv.current.getBoundingClientRect(), G = geo.current;
    const fx = (ev.clientX - rect.left - G.pad) / G.cell, fy = (ev.clientY - rect.top - G.pad) / G.cell;
    const x = Math.round(fx) + G.x0, y = Math.round(fy) + G.y0;
    if (x < 0 || y < 0 || x >= b.n || y >= b.n) return;
    if (Math.hypot(fx + G.x0 - x, fy + G.y0 - y) > 0.72) return;
    onTap(b.idx(x, y));
  };
  return (
    <div class={"goban-wrap" + (props.full ? " full" : "")}>
      <canvas ref={cv} class="goban" role="img" aria-label={props.label || "Plateau de go"} onClick={onClick} />
    </div>
  );
}
