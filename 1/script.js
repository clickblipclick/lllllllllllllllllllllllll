// 1 — Under the paint
// The doorframe from 0, closer. Nobody rubs out a height mark; they paint
// over it, and it stays where it was, sealed between two coats. Scrolling
// sands the frame back. Each coat gives up the marks that were pencilled on
// it, and the same sanding that finds them takes them off. It does not go
// back on.

const jamb = document.getElementById("jamb");
const swatch = document.getElementById("swatch");
const nameEl = document.getElementById("name");
const noteEl = document.getElementById("note");
const NS = "http://www.w3.org/2000/svg";

const DARK = "rgba(52,54,62,0.82)";

// newest first. `under` is what was put on before the colour.
// marks: [text, height as a fraction up from the floor]
const COATS = [
  { name: "Pebble white", year: "2019", colour: "#ece6d6", under: "#f7f5ee", pencil: DARK, hand: 7, marks: [] },
  { name: "Dove grey", year: "2011", colour: "#b6b8b2", under: "#f2f0e9", pencil: DARK, hand: 21,
    marks: [["M 4.9.14", 0.33], ["M 2.3.16", 0.42], ["M 1.1.18", 0.5]] },
  { name: "Magnolia", year: "1998", colour: "#f0e2bf", under: "#f6f3ea", pencil: DARK, hand: 33,
    marks: [["J 7.6.99", 0.3], ["S 7.6.99", 0.47], ["J 3.8.01", 0.385], ["S 3.8.01", 0.56]] },
  { name: "Avocado", year: "1974", colour: "#8e9a5a", under: "#e7e1cd", pencil: "rgba(40,44,40,0.85)", hand: 48,
    marks: [["K 76", 0.35], ["K 77", 0.43], ["K 79", 0.57]] },
  { name: "Buttermilk", year: "1958", colour: "#e5cf8e", under: "#e2d9c6", pencil: DARK, hand: 59,
    marks: [["A 1959", 0.37], ["A 1961", 0.5]] },
  { name: "Brunswick green", year: "1931", colour: "#2e4838", under: "#c99e93", pencil: "rgba(196,206,200,0.72)", hand: 64,
    marks: [["W 1934", 0.39], ["W 1935", 0.455]] },
  { name: "Bare pine", year: "1931", colour: "#c9a474", wood: true, pencil: "rgba(58,48,40,0.78)", hand: 80, marks: [] },
];
const DEPTH = COATS.length - 1;

// single-stroke letters on a 10 x 16 grid
const GLYPH = {
  "0": "M5 1C1 1 1 15 5 15C9 15 9 1 5 1",
  "1": "M3 4L6 1L6 15",
  "2": "M2 4C2 0 9 0 8 5C7 9 3 12 2 15L9 15",
  "3": "M2 2C8 0 9 7 4 8C10 8 9 16 2 14",
  "4": "M7 15L7 1L1 10L9 10",
  "5": "M8 1L3 1L2 7C8 5 10 14 2 15",
  "6": "M8 1C3 3 1 9 2 12C3 16 9 15 8 11C7 7 3 8 2 11",
  "7": "M2 1L9 1L4 15",
  "8": "M5 8C1 6 2 1 5 1C8 1 9 6 5 8C0 10 1 15 5 15C9 15 10 10 5 8",
  "9": "M8 6C7 9 2 9 2 5C2 0 8 0 8 5L7 15",
  ".": "M5 14L5.5 14.7",
  "'": "M5 1L4.4 4.5",
  '"': "M4 1L3.4 4.5M7 1L6.4 4.5",
  M: "M1 15L2 1L5 9L8 1L9 15",
  J: "M3 1L8 1M6 1L6 12C6 16 2 15 1 12",
  K: "M2 1L2 15M8 1L2 9L9 15",
  A: "M1 15L5 1L9 15M3 10L7 10",
  W: "M1 1L3 15L5 6L7 15L9 1",
  S: "M8 3C6 0 1 1 2 5C3 8 8 8 8 12C8 16 2 15 1 12",
};

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------- the top coat carries the marks from 0, yours included

(function topCoat() {
  const marks = [["11.11.26", 0.37, 0]];
  try {
    const raw = JSON.parse(localStorage.getItem("lllll-0-doorframe") || "[]");
    if (Array.isArray(raw)) {
      raw
        .filter((m) => m && typeof m.f === "number" && m.f > 0 && m.f < 1 && /^[0-9.]{5,10}$/.test(m.date))
        .slice(-12)
        .forEach((m, i) => marks.push([m.date, m.f, (i % 2 ? -1 : 1) * 0.5]));
    }
  } catch { /* a frame with only the one mark */ }
  COATS[0].marks = marks;
})();

// ---------- build: each older coat sits inside the hole worn in the one above

const layers = []; // { outer, inner, svg } for coats 1..DEPTH
const svgs = [];

function el(tag, parent, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent.appendChild(e);
  return e;
}

jamb.className = "coat";
jamb.style.backgroundColor = COATS[0].colour;
svgs[0] = jamb.appendChild(document.createElementNS(NS, "svg"));
let parent = jamb;
for (let i = 1; i <= DEPTH; i++) {
  const outer = el("div", parent);
  outer.style.backgroundColor = COATS[i - 1].under;
  const inner = el("div", outer, COATS[i].wood ? "wood" : "coat");
  if (!COATS[i].wood) inner.style.backgroundColor = COATS[i].colour;
  svgs[i] = inner.appendChild(document.createElementNS(NS, "svg"));
  layers[i] = { outer, inner };
  parent = inner;
}

// ---------- geometry

let W = 0, H = 0, cx = 0, cy = 0, RX = 0, RY = 0, k = 1;
const POINTS = 80;
const sharedPh = [0.7, 2.1, 4.4];
const ownPh = COATS.map((_, i) => { const r = rng(90 + i); return [r() * 7, r() * 7, r() * 7]; });

function base(i) { return 0.9 - (i - 1) * 0.085; }

function wobble(a, i) {
  const o = ownPh[i];
  return 1
    + 0.07 * Math.sin(2 * a + sharedPh[0])
    + 0.045 * Math.sin(3 * a + sharedPh[1])
    + 0.02 * Math.sin(7 * a + sharedPh[2])
    + 0.03 * Math.sin(4 * a + o[0])
    + 0.018 * Math.sin(6 * a + o[1])
    + 0.008 * Math.sin(13 * a + o[2]);
}

function hole(i, s, inset) {
  if (s <= 0) return "polygon(0 0, 0 0, 0 0)";
  const b = base(i) * s;
  const shrink = Math.max(0, 1 - inset / Math.max(1, RX * b));
  let out = "polygon(";
  for (let j = 0; j < POINTS; j++) {
    const a = (j / POINTS) * Math.PI * 2;
    const r = b * wobble(a, i) * shrink;
    out += (j ? "," : "") + (cx + Math.cos(a) * RX * r).toFixed(1) + "px " + (cy + Math.sin(a) * RY * r).toFixed(1) + "px";
  }
  return out + ")";
}

// ---------- pencil

function path(parent, d, stroke, width) {
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", width);
  parent.appendChild(p);
  return p;
}

function write(svg, text, x, y, size, r, colour, weight, slant) {
  const sc = size / 16;
  for (const ch of text) {
    if (ch === " ") { x += size * 0.42; continue; }
    const g = document.createElementNS(NS, "g");
    const rot = (r() - 0.5) * 9;
    const dy = (r() - 0.5) * size * 0.12;
    g.setAttribute("transform",
      `translate(${x.toFixed(1)} ${(y - size * 0.5 + dy).toFixed(1)}) scale(${sc.toFixed(3)}) skewX(${slant}) rotate(${rot.toFixed(1)} 5 8)`);
    path(g, GLYPH[ch], colour, (weight / sc).toFixed(2));
    svg.appendChild(g);
    x += size * (ch === "." || ch === "'" ? 0.4 : ch === "1" ? 0.56 : 0.7);
  }
  return x;
}

function widthOf(text, size) {
  let w = 0;
  for (const ch of text) w += size * (ch === " " ? 0.42 : ch === "." || ch === "'" ? 0.4 : ch === "1" ? 0.56 : 0.7);
  return w;
}

function pencil() {
  COATS.forEach((coat, i) => {
    const svg = svgs[i];
    svg.textContent = "";
    const r = rng(coat.hand);
    // one hand per coat: its own size, pressure, lean and length of line
    const size = (13 + r() * 5) * k;
    const weight = (1.1 + r() * 0.5) * k;
    const slant = Math.round((r() - 0.65) * 22);
    const len = (34 + r() * 22) * k;
    coat.marks.forEach(([text, f, side]) => {
      const y = (0.91 - 0.91 * f) * H;
      const total = len + 8 * k + widthOf(text, size);
      const x0 = cx - total / 2 + (r() - 0.5) * 22 * k + (side || 0) * RX * 0.5;
      const tilt = (r() - 0.5) * 5 * k;
      const bow = (r() - 0.5) * 4 * k;
      const line = `M${x0.toFixed(1)} ${y.toFixed(1)}Q${(x0 + len / 2).toFixed(1)} ${(y + bow).toFixed(1)} ${(x0 + len).toFixed(1)} ${(y + tilt).toFixed(1)}`;
      path(svg, line, coat.pencil, weight.toFixed(2));
      path(svg, line, coat.pencil, (weight * 0.6).toFixed(2)).setAttribute("transform", `translate(${(r() * 2 - 1).toFixed(1)} ${(r() * 1.6 - 0.8).toFixed(1)})`);
      write(svg, text, x0 + len + 8 * k, y + tilt, size, r, coat.pencil, weight, slant);
    });
  });

  // the wood: one ruled line and a figure. The first thing measured
  // against this frame was the door.
  const svg = svgs[DEPTH];
  const col = COATS[DEPTH].pencil;
  const r = rng(80);
  const half = RX * 0.3;
  const y = cy - RY * 0.06;
  path(svg, `M${(cx - half).toFixed(1)} ${y.toFixed(1)}L${(cx + half).toFixed(1)} ${(y - 0.6).toFixed(1)}`, col, (0.9 * k).toFixed(2));
  // crow's foot
  const vx = cx - half * 0.35;
  path(svg, `M${(vx - 5 * k).toFixed(1)} ${(y + 11 * k).toFixed(1)}L${vx.toFixed(1)} ${y.toFixed(1)}L${(vx + 5 * k).toFixed(1)} ${(y + 11 * k).toFixed(1)}`, col, (0.9 * k).toFixed(2));
  write(svg, "6' 6\"", cx - half * 0.1, y - 13 * k, 14 * k, r, col, 1 * k, -8);
}

// ---------- sanding

let deepest = 0;   // how far the paper has ever gone, 0..DEPTH
let shown = -1;
let queued = false;

function ease(t) { return 1 - (1 - t) * (1 - t); }

function render() {
  queued = false;
  for (let i = 1; i <= DEPTH; i++) {
    const s = ease(Math.max(0, Math.min(1, deepest - (i - 1))));
    layers[i].outer.style.clipPath = hole(i, s, 0);
    layers[i].inner.style.clipPath = hole(i, s, 3 * k);
  }
  const at = Math.min(DEPTH, Math.floor(deepest + 0.75));
  if (at !== shown) {
    shown = at;
    swatch.style.backgroundColor = COATS[at].colour;
    nameEl.textContent = `${COATS[at].name} ${COATS[at].year}`;
  }
  noteEl.textContent = deepest < 0.02 ? "scroll to sand it back" : "";
}

function ask() {
  if (!queued) { queued = true; requestAnimationFrame(render); }
}

function onScroll() {
  const room = document.documentElement.scrollHeight - window.innerHeight;
  const p = room > 0 ? (window.scrollY / room) * (DEPTH + 0.12) : 0;
  const d = Math.max(0, Math.min(DEPTH, p));
  if (d > deepest) { deepest = d; ask(); }
}

function layout() {
  W = jamb.clientWidth || window.innerWidth;
  H = jamb.clientHeight || window.innerHeight;
  cx = W * 0.5;
  cy = H * 0.47;
  RX = Math.min(W * 0.5, H * 0.45);
  RY = H * 0.46;
  k = Math.max(0.85, Math.min(1.5, Math.min(W, H * 0.8) / 375));
  pencil();
  ask();
}

try { history.scrollRestoration = "manual"; } catch { /* then it opens already sanded */ }
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { layout(); onScroll(); });
layout();
onScroll();
