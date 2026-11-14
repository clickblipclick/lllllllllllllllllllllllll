// 3 — No one in particular
// The doorway of 0, 1 and 2, handed to a surveyor. The height marks on the
// jamb were made one person at a time, with a name and a date. The sill was
// marked by all of them at once and kept nobody: a hollow that is only the
// sum of where feet came down. Nothing here moves. It is a drawing, revised
// by the calendar and, very slightly, by being opened.

const NS = "http://www.w3.org/2000/svg";
const fig = document.getElementById("figure");

// ---- the survey ------------------------------------------------------------

const LAID = new Date(1931, 3, 6);  // the year of the bare pine in 1
const PER_DAY = 40;                 // a household, in and out
const LOSS = 0.0000081;             // mm of pine per footfall
const WIDTH = 810;                  // mm between the jambs
const THICK = 40;                   // mm of sill
const EXAG = 6;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const days = Math.max(1, Math.round((today - LAID) / 864e5));
const crossings = days * PER_DAY + Math.round(PER_DAY * Math.max(0, now.getHours() - 6) / 18) + 1;
const depth = crossings * LOSS;

// Where feet come down, across the opening. Two habits added together: the
// ordinary stride, and the tighter one of someone coming round the door's
// edge. Both sit toward the latch, because the hinge side is where the door is.
function feet(x) {
  const g = (m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  return 0.5 * g(55, 150) + 0.5 * g(135, 85);
}
let peak = 0, peakX = 0;
for (let x = -WIDTH / 2; x <= WIDTH / 2; x++) {
  const f = feet(x);
  if (f > peak) { peak = f; peakX = x; }
}
const wear = (x) => depth * feet(x) / peak; // mm lost at x

const pad = (n) => String(n).padStart(2, "0");
document.getElementById("depth").textContent = depth.toFixed(4);
document.getElementById("off").textContent = String(peakX);
document.getElementById("count").textContent = crossings.toLocaleString("en-GB");
document.getElementById("date").textContent =
  `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
document.getElementById("rev").textContent = days.toLocaleString("en-GB");

// ---- the drawing -----------------------------------------------------------

function el(parent, name, attrs) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}

function label(parent, str, x, y, anchor, faint) {
  const t = el(parent, "text", { x, y, "text-anchor": anchor || "start" });
  if (faint) t.setAttribute("fill-opacity", "0.5");
  t.textContent = str;
  return t;
}

// a dimension line with a tick at each end, the way a draughtsman closes one
function dim(parent, x1, y1, x2, y2) {
  el(parent, "line", { x1, y1, x2, y2 });
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    el(parent, "line", { x1: x - 3.5, y1: y + 3.5, x2: x + 3.5, y2: y - 3.5, "stroke-width": 1.4 });
  }
}

function draw() {
  const W = fig.clientWidth, H = fig.clientHeight;
  if (!W || !H) return;
  fig.textContent = "";
  const narrow = W < 520;

  const svg = el(fig, "svg", {
    viewBox: `0 0 ${W} ${H}`, fill: "none", stroke: "#17283a",
    "stroke-width": 1, "stroke-linecap": "butt", "aria-hidden": "true",
  });

  // scale: the sill and a stub of each jamb must fit the width, and the
  // exaggerated section plus its dimensions must fit the height
  const jamb = narrow ? 14 : 34; // px of jamb drawn each side
  const k = Math.min((W - 2 * jamb - (narrow ? 8 : 60)) / WIDTH, (H - 150) / (THICK * EXAG), 1.3);
  const sw = WIDTH * k;
  const kv = k * EXAG;
  const cx = Math.round(W / 2) + 0.5;
  const x0 = cx - sw / 2, x1 = cx + sw / 2;
  const th = THICK * kv;
  const y0 = Math.round((H - th) / 2 + 14) + 0.5; // datum
  const yb = y0 + th;
  const px = (mm) => cx + mm * k;
  const py = (mm) => y0 + wear(mm) * kv;

  // the worn top, as a path
  let top = "";
  for (let mm = -WIDTH / 2; mm <= WIDTH / 2; mm += 3) {
    top += `${top ? "L" : "M"}${px(mm).toFixed(2)} ${py(mm).toFixed(2)}`;
  }
  const body = `${top}L${x1} ${yb}L${x0} ${yb}Z`;

  // timber in section: hatched, and the hatch stops where the wood stops
  const defs = el(svg, "defs", {});
  const clip = el(defs, "clipPath", { id: "wood" });
  el(clip, "path", { d: body });
  const hatch = el(svg, "g", { "clip-path": "url(#wood)", "stroke-opacity": 0.3, "stroke-width": 0.75 });
  const step = narrow ? 7 : 9;
  for (let x = x0 - th; x < x1; x += step) {
    el(hatch, "line", { x1: x, y1: yb, x2: x + th, y2: y0 });
  }

  // what is gone: the space between the datum and the wood, left blank
  el(svg, "line", { x1: x0, y1: y0, x2: x1, y2: y0, "stroke-dasharray": "7 4", "stroke-opacity": 0.6 });
  el(svg, "path", { d: body, "stroke-width": 1.5, "stroke-linejoin": "miter" });

  // jambs, cut short with a break line
  const jh = Math.min(70, y0 - 30);
  for (const [xa, dir] of [[x0, -1], [x1, 1]]) {
    const xo = xa + dir * jamb;
    el(svg, "path", {
      d: `M${xa} ${y0}V${y0 - jh}M${xo} ${yb}V${y0 - jh}M${xa} ${yb}H${xo}`, "stroke-width": 1.5,
    });
    const xm = (xa + xo) / 2, yj = y0 - jh;
    el(svg, "path", {
      d: `M${Math.min(xa, xo) - 4} ${yj}H${xm - 4}L${xm - 1.5} ${yj - 6}L${xm + 1.5} ${yj + 6}L${xm + 4} ${yj}H${Math.max(xa, xo) + 4}`,
      "stroke-width": 0.75,
    });
  }
  label(svg, "Hinge", x0 + 7, y0 - jh + 14, "start", true);
  label(svg, "Latch", x1 - 7, y0 - jh + 14, "end", true);

  // centre line, chain-dashed, and the line through the deepest point
  const xp = px(peakX), yp = py(peakX);
  el(svg, "line", {
    x1: cx, y1: y0 - jh - 4, x2: cx, y2: yb + 14,
    "stroke-dasharray": "14 3 2 3", "stroke-width": 0.75, "stroke-opacity": 0.7,
  });
  label(svg, "CL", cx, y0 - jh - 10, "middle", true);

  // datum note
  label(svg, sw < 420 ? "As laid" : "As laid, 1931", x0 + 7, y0 - 6, "start", true);

  // depth: witness lines out to the right of the hollow, then the dimension
  const xd = Math.min(x1 - 12, xp + Math.max(46, sw * 0.2));
  el(svg, "line", { x1: xp + 4, y1: yp, x2: xd + 6, y2: yp, "stroke-width": 0.75, "stroke-opacity": 0.7 });
  dim(svg, xd, y0, xd, yp);
  // leader from the dimension up into clear paper
  const ly = y0 - Math.min(34, jh * 0.5);
  el(svg, "path", { d: `M${xd} ${y0}V${ly}`, "stroke-width": 0.75, "stroke-opacity": 0.7 });
  label(svg, depth.toFixed(4), xd - 5, ly + 9, "end");

  // offset of the deepest point from the centre line
  const yo = y0 - Math.min(56, jh * 0.8);
  el(svg, "line", { x1: xp, y1: yp, x2: xp, y2: yo - 5, "stroke-width": 0.75, "stroke-opacity": 0.7 });
  dim(svg, cx, yo, xp, yo);
  label(svg, String(peakX), (cx + xp) / 2, yo - 6, "middle");

  // overall width
  const yw = yb + 26;
  el(svg, "path", { d: `M${x0} ${yb + 6}V${yw + 5}M${x1} ${yb + 6}V${yw + 5}`, "stroke-width": 0.75, "stroke-opacity": 0.7 });
  dim(svg, x0, yw, x1, yw);
  label(svg, String(WIDTH), cx + 8, yw - 6, "start");

  // section marks
  label(svg, "A", x0 - (narrow ? 2 : 14), yw + 18, "middle");
  label(svg, "A", x1 + (narrow ? 2 : 14), yw + 18, "middle");
  label(svg, "All dimensions in millimetres", cx, yw + 34, "middle", true);
}

draw();
let pending = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(draw);
});
