// 0 — Come back when you are taller
// The edge of a doorframe. One pencil mark is already on it: the day this
// site began. Hold still against the frame and a mark is drawn for you, with
// today's date. It is kept in this browser, so the next time you come the
// frame remembers how tall you were.

const canvas = document.getElementById("door");
const g = canvas.getContext("2d");
const say = document.getElementById("say");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const KEY = "lllll-0-doorframe";
const SITE_MARK = { f: 0.37, date: "11.11.26", seed: 7, site: true };

// ---------- small helpers

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function today() {
  const d = new Date();
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((m) => m && typeof m.f === "number" && m.f > 0 && m.f < 1 && /^[0-9.]{5,10}$/.test(m.date))
      .slice(-60)
      .map((m) => ({ f: m.f, date: m.date, seed: (m.seed | 0) || 1 }));
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mine.map(({ f, date, seed }) => ({ f, date, seed }))));
  } catch { /* the frame forgets; that is allowed */ }
}

const mine = load();
const cameBack = mine.some((m) => m.date !== today());

// ---------- layout

let W = 0, H = 0, dpr = 1;
let jx = 0, jw = 0, topY = 0, floorY = 0;
let back = null; // the room, painted once per size

function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  jw = Math.max(110, Math.min(260, W * 0.34));
  jx = Math.round(W * 0.42 - jw / 2);
  topY = 0;
  floorY = Math.round(H * 0.91);
  paintRoom();
  draw();
}

function light() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  // 0 at night, 1 at midday
  const day = Math.max(0, Math.min(1, (Math.cos(((h - 13) / 12) * Math.PI) + 0.35) / 1.1));
  return day;
}

function mix(a, b, t) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

function paintRoom() {
  back = document.createElement("canvas");
  back.width = canvas.width;
  back.height = canvas.height;
  const c = back.getContext("2d");
  c.scale(dpr, dpr);
  const day = light();
  const r = rng(41);

  // wall
  c.fillStyle = "#a7b19f";
  c.fillRect(0, 0, jx, H);
  // skirting board
  const sk = Math.max(34, H * 0.075);
  c.fillStyle = "#e3dccb";
  c.fillRect(0, floorY - sk, jx, sk);
  c.fillStyle = "rgba(40,40,30,0.22)";
  c.fillRect(0, floorY - sk, jx, 1.5);
  c.fillStyle = "rgba(255,255,255,0.35)";
  c.fillRect(0, floorY - sk + 1.5, jx, 3);

  // the doorway: whatever hour it is in the next room
  const open = c.createLinearGradient(0, 0, 0, floorY);
  open.addColorStop(0, mix([13, 15, 22], [226, 222, 204], day));
  open.addColorStop(1, mix([24, 24, 32], [201, 190, 160], day));
  c.fillStyle = open;
  c.fillRect(jx + jw, 0, W - jx - jw, floorY);

  // the jamb: old gloss paint over wood
  const face = c.createLinearGradient(jx, 0, jx + jw, 0);
  face.addColorStop(0, "#d8d1bf");
  face.addColorStop(0.05, "#efe9d9");
  face.addColorStop(0.16, "#f1ebdc");
  face.addColorStop(0.2, "#ddd6c4");
  face.addColorStop(0.23, "#eee8d8");
  face.addColorStop(0.84, "#ebe5d4");
  face.addColorStop(0.86, "#cfc8b5");
  face.addColorStop(1, "#c3bca9");
  c.fillStyle = face;
  c.fillRect(jx, 0, jw, floorY);
  // brush streaks
  for (let i = 0; i < 46; i++) {
    const x = jx + jw * (0.24 + r() * 0.58);
    c.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(90,80,55,0.045)";
    c.fillRect(x, r() * floorY * 0.6, 0.6 + r() * 1.4, floorY * (0.3 + r() * 0.7));
  }
  // a few chips and scuffs, lower down where life happens
  for (let i = 0; i < 9; i++) {
    const x = jx + jw * (0.25 + r() * 0.55);
    const y = floorY * (0.55 + r() * 0.43);
    c.fillStyle = "rgba(120,105,80,0.16)";
    c.beginPath();
    c.ellipse(x, y, 1 + r() * 3, 0.8 + r() * 2, r() * 3, 0, 7);
    c.fill();
  }
  // shadow the jamb throws on the wall
  const sh = c.createLinearGradient(jx - 14, 0, jx, 0);
  sh.addColorStop(0, "rgba(30,35,25,0)");
  sh.addColorStop(1, "rgba(30,35,25,0.2)");
  c.fillStyle = sh;
  c.fillRect(jx - 14, 0, 14, floorY);

  // floor
  c.fillStyle = "#6b5644";
  c.fillRect(0, floorY, W, H - floorY);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.fillRect(0, floorY, W, 2);
  c.strokeStyle = "rgba(30,20,10,0.25)";
  c.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = W * (i / 6) + (r() - 0.5) * 30;
    c.beginPath();
    c.moveTo(x, floorY + 2);
    c.lineTo(x + (x - W * 0.42) * 0.35, H);
    c.stroke();
  }

  // the hour falls over everything on this side too
  c.fillStyle = `rgba(14,18,40,${(0.42 * (1 - day)).toFixed(3)})`;
  c.fillRect(0, 0, jx + jw, H);
  c.fillRect(jx + jw, floorY, W - jx - jw, H - floorY);
}

// ---------- pencil

const DIGITS = {
  0: [[.5, 0], [.15, .3], [.1, .9], [.3, 1.5], [.6, 1.55], [.9, 1.1], [.9, .5], [.7, .05], [.42, .03]],
  1: [[.22, .42], [.55, 0], [.5, 1.6]],
  2: [[.1, .35], [.4, 0], [.8, .2], [.75, .7], [.1, 1.6], [.95, 1.55]],
  3: [[.15, .15], [.6, 0], [.8, .35], [.4, .75], [.85, 1.1], [.6, 1.6], [.1, 1.4]],
  4: [[.65, 1.6], [.7, 0], [.05, 1.05], [.95, 1.05]],
  5: [[.85, 0], [.25, .05], [.15, .7], [.6, .6], [.9, 1.05], [.6, 1.6], [.1, 1.45]],
  6: [[.75, 0], [.25, .6], [.1, 1.2], [.4, 1.6], [.8, 1.3], [.7, .85], [.2, 1.0]],
  7: [[.05, .05], [.9, 0], [.4, 1.6]],
  8: [[.5, .75], [.15, .4], [.5, 0], [.85, .35], [.5, .75], [.1, 1.2], [.5, 1.6], [.9, 1.2], [.5, .75]],
  9: [[.85, .5], [.5, .8], [.15, .45], [.5, 0], [.85, .4], [.75, 1.6]],
  ".": [[.4, 1.5], [.5, 1.6]],
};
const SHARP = { 1: 1, 4: 1, 7: 1 };

function scribble(pts, sharp) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  if (sharp || pts.length < 3) {
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const l = pts[pts.length - 1];
    g.lineTo(l[0], l[1]);
  }
  g.stroke();
}

function markY(m) {
  return floorY - m.f * (floorY - topY);
}

// p: 0..1 how much of it has been drawn
function drawMark(m, p) {
  const r = rng(m.seed);
  const y = markY(m);
  const x0 = jx + jw * (0.27 + r() * 0.05);
  const len = jw * (0.34 + r() * 0.12);
  const tilt = (r() - 0.5) * 7;
  const lineP = Math.min(1, p / 0.45);
  const textP = Math.max(0, (p - 0.5) / 0.5);
  const alpha = m.site ? 0.5 : 0.74;

  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = `rgba(52,54,62,${alpha})`;

  // the line: two passes, like a pencil gone over once more to be sure
  for (let pass = 0; pass < 2; pass++) {
    const pts = [];
    const n = 9;
    const oy = pass ? (r() - 0.5) * 1.6 : 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t > lineP + 1e-6) { r(); continue; }
      pts.push([x0 + len * t + (pass ? 2 : 0), y + oy + tilt * (t - 0.5) + (r() - 0.5) * 1.3]);
    }
    g.lineWidth = pass ? 0.9 : 1.5;
    if (pts.length > 1) scribble(pts, false);
  }

  // the date
  const s = Math.max(6.5, Math.min(9, jw * 0.05));
  let cx = x0 + 2;
  const cy = y - s * 1.6 - 7 + tilt * -0.3;
  const chars = m.date.split("");
  const shown = Math.ceil(chars.length * textP);
  g.lineWidth = 1.05;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const glyph = DIGITS[ch];
    const lift = (r() - 0.5) * 1.6;
    const lean = 0.12 + (r() - 0.5) * 0.08;
    const pts = glyph.map(([px, py]) => [
      cx + (px + (1.6 - py) * lean) * s + (r() - 0.5) * 0.7,
      cy + lift + py * s + (r() - 0.5) * 0.7,
    ]);
    if (i < shown) scribble(pts, SHARP[ch]);
    cx += s * (ch === "." ? 0.75 : ch === "1" ? 0.95 : 1.22);
  }
}

// ---------- drawing the whole thing

let drawing = null; // { mark, t0 }
let tip = null;     // { y, a } pencil point resting on the paint
let raf = 0;

function draw(now) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(back, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawMark(SITE_MARK, 1);
  for (const m of mine) {
    if (drawing && drawing.mark === m) continue;
    drawMark(m, 1);
  }

  let again = false;
  if (drawing) {
    const p = still.matches ? 1 : Math.min(1, ((now || performance.now()) - drawing.t0) / 1500);
    drawMark(drawing.mark, p);
    if (p >= 1) { drawing = null; afterMark(); } else again = true;
  }
  if (tip) {
    g.fillStyle = `rgba(52,54,62,${0.7 * tip.a})`;
    g.beginPath();
    g.arc(jx + jw * 0.29, tip.y, 1.6, 0, 7);
    g.fill();
    // a faint level line, so you can see where the top of your head is
    g.fillStyle = `rgba(52,54,62,${0.07 * tip.a})`;
    g.fillRect(jx + jw * 0.24, tip.y - 0.5, jw * 0.58, 1);
  }
  if (again) raf = requestAnimationFrame(draw);
}

// ---------- sound: graphite on gloss paint

let ac = null;
function wake() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch { ac = null; }
}

function scratch(dur) {
  if (!ac || ac.state !== "running") return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = v * 0.6 + (Math.random() * 2 - 1) * 0.4;
    d[i] = v;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 0.8;
  const amp = ac.createGain();
  const t = ac.currentTime;
  // one long stroke, then the short ticks of a date
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.11, t + 0.05);
  amp.gain.linearRampToValueAtTime(0.07, t + dur * 0.4);
  amp.gain.linearRampToValueAtTime(0, t + dur * 0.45);
  for (let i = 0; i < 8; i++) {
    const a = t + dur * (0.52 + i * 0.058);
    amp.gain.setValueAtTime(0, a);
    amp.gain.linearRampToValueAtTime(0.06, a + 0.015);
    amp.gain.linearRampToValueAtTime(0, a + dur * 0.04);
  }
  src.connect(bp).connect(amp).connect(ac.destination);
  src.start();
}

// ---------- being measured

const HOLD = 750;
let holdTimer = 0;
let down = null; // { id, x, y }

function clampY(y) {
  return Math.max(topY + 34, Math.min(floorY - 14, y));
}

function settle(y) {
  clearTimeout(holdTimer);
  tip = { y: clampY(y), a: 1 };
  draw();
  holdTimer = setTimeout(() => makeMark(tip.y), HOLD);
}

function makeMark(y) {
  if (drawing) return;
  const m = {
    f: (floorY - y) / (floorY - topY),
    date: today(),
    seed: 2 + Math.floor(Math.random() * 1e6),
  };
  mine.push(m);
  if (mine.length > 60) mine.shift();
  save();
  tip = null;
  down = null;
  drawing = { mark: m, t0: performance.now() };
  if (!still.matches) scratch(1.5); else scratch(0.9);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

function letGo() {
  clearTimeout(holdTimer);
  down = null;
  if (tip) { tip = null; draw(); }
}

canvas.addEventListener("pointerdown", (e) => {
  if (e.button > 0 || drawing) return;
  wake();
  canvas.focus({ preventScroll: true });
  down = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
  settle(e.clientY);
  e.preventDefault();
});

canvas.addEventListener("pointermove", (e) => {
  if (!down || e.pointerId !== down.id) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) {
    // fidgeting: the pencil follows and waits for you to stop
    down.x = e.clientX;
    down.y = e.clientY;
    settle(e.clientY);
  }
});

for (const type of ["pointerup", "pointercancel"]) {
  canvas.addEventListener(type, (e) => {
    wake();
    if (down && e.pointerId === down.id) letGo();
  });
}
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// keyboard: arrows move the pencil, Enter or Space makes the mark
let keyY = null;
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || drawing) return;
  const step = e.shiftKey ? 24 : 6;
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    if (keyY === null) keyY = floorY - (floorY - topY) * 0.6;
    keyY = clampY(keyY + (e.key === "ArrowUp" ? -step : step));
    clearTimeout(holdTimer);
    tip = { y: keyY, a: 1 };
    draw();
    e.preventDefault();
  } else if (e.key === "Enter" || e.key === " ") {
    wake();
    if (keyY === null) keyY = floorY - (floorY - topY) * 0.6;
    clearTimeout(holdTimer);
    makeMark(keyY);
    e.preventDefault();
  }
});

// ---------- the one voice in the room

let sayTimer = 0;
function speak(text, delay) {
  clearTimeout(sayTimer);
  say.classList.remove("on");
  sayTimer = setTimeout(() => {
    say.textContent = text;
    say.classList.add("on");
  }, delay);
}

function afterMark() {
  speak("now come back when you are taller.", 500);
}

speak(cameBack ? "you came back. stand up straight. hold still." : "back against the frame. hold still.", 900);

// ---------- keep up with the window and the hour

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { keyY = null; letGo(); layout(); }, 80);
});
setInterval(() => { if (!drawing && !document.hidden) { paintRoom(); draw(); } }, 5 * 60 * 1000);

layout();
