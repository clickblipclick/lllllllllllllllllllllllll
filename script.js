// 2 — A bit more
// The doorframe from 0 and 1, at night, from the bed. A door left ajar is a
// measurement as well: the exact width of what a child is afraid of, agreed
// again every evening and never quite the same as yesterday. You hold the
// door. You are not the one who decides where it stops.
//
// The agreed width is different each date, and a little narrower each date
// than the one before. About five years after the first mark on the frame
// it reaches nothing.

const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const say = document.getElementById("say");
const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---- tonight's width -------------------------------------------------------

const FIRST = new Date(2026, 10, 11); // the day of the first mark, in 0
const YEARS = 1826;                   // days until the door can be shut

function tonight() {
  const now = new Date();
  // a night belongs to the evening it began on
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getHours() < 6 ? 1 : 0));
  const days = Math.max(0, Math.round((d - FIRST) / 864e5));
  if (days >= YEARS) return 0;
  let h = (days + 1) * 2654435761 >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  const jitter = (h % 1000) / 1000 - 0.5;
  const base = 0.34 * (1 - days / YEARS);
  return Math.min(0.5, Math.max(0.03, base + jitter * 0.1));
}

const AGREED = tonight();
const TOL = 0.02;

// ---- state -----------------------------------------------------------------

let gap = 0.86;        // 0 shut, 1 standing fully open
let W = 0, H = 0, dpr = 1;
let geo = null;
let dirty = true;
let hall = 1;          // brightness of the hall, dips when someone walks off
let passing = 0;       // start time of the walk, 0 if none
let settled = false;   // the width has been accepted
let stillTimer = 0;
let chain = [];
let lastLine = "";
let turn = 0;

// ---- the voice -------------------------------------------------------------

function speak(text) {
  if (!text) { say.classList.remove("on"); return; }
  if (say.textContent === text && say.classList.contains("on")) return;
  say.classList.remove("on");
  setTimeout(() => {
    say.textContent = text;
    say.classList.add("on");
  }, say.textContent ? (calm.matches ? 120 : 500) : 0);
}

function pick(list) {
  let line = list[turn++ % list.length];
  if (line === lastLine && list.length > 1) line = list[turn++ % list.length];
  lastLine = line;
  return line;
}

function clearChain() {
  chain.forEach(clearTimeout);
  chain = [];
}

function later(fn, ms) { chain.push(setTimeout(fn, ms)); }

function verdict() {
  const off = gap - AGREED;

  if (AGREED === 0) {
    // years on
    if (gap < 0.004) { speak(""); settled = true; }
    else speak(pick(["you can shut it.", "it's fine. shut it."]));
    return;
  }

  if (Math.abs(off) <= TOL) {
    if (settled) return;
    settled = true;
    speak("there.");
    later(() => speak("leave it."), 3200);
    later(() => { passing = performance.now(); loop(); }, 6200);
    later(() => speak(""), 7200);
    return;
  }

  const was = settled;
  settled = false;
  if (was) { speak(pick(["no. put it back.", "you moved it."])); stillTimer = setTimeout(verdict, 2600); return; }

  if (gap < 0.004) speak(pick(["no.", "open it.", "i can't see."]));
  else if (off < -0.12) speak(pick(["more.", "more than that."]));
  else if (off < -0.05) speak(pick(["a bit more.", "more."]));
  else if (off < 0) speak(pick(["a tiny bit more.", "nearly. more."]));
  else if (off > 0.4) speak(pick(["not all the way.", "too bright."]));
  else if (off > 0.12) speak(pick(["less.", "less than that."]));
  else if (off > 0.05) speak(pick(["a bit less.", "less."]));
  else speak(pick(["a tiny bit less.", "nearly. less."]));
}

function moved() {
  dirty = true;
  clearChain();
  clearTimeout(stillTimer);
  stillTimer = setTimeout(verdict, 850);
  loop();
}

// ---- the hand on the door ---------------------------------------------------

let held = null;

canvas.addEventListener("pointerdown", (e) => {
  held = { id: e.pointerId, x: e.clientX, gap };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});

canvas.addEventListener("pointermove", (e) => {
  if (!held || e.pointerId !== held.id) return;
  const g = Math.min(1, Math.max(0, held.gap + (e.clientX - held.x) / geo.dw * -1));
  if (g !== gap) { gap = g; moved(); }
});

function release(e) {
  if (held && e.pointerId === held.id) held = null;
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

canvas.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 0.04 : 0.008;
  let g = gap;
  if (e.key === "ArrowLeft") g += step;        // the door's edge goes left: wider
  else if (e.key === "ArrowRight") g -= step;  // and right: narrower
  else return;
  e.preventDefault();
  g = Math.min(1, Math.max(0, g));
  if (g !== gap) { gap = g; moved(); }
});

// ---- the room ---------------------------------------------------------------

function measure() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const floorY = H * 0.66;
  let dh = H * 0.5;
  let dw = dh * 0.44;
  if (dw > W * 0.62) { dw = W * 0.62; dh = dw / 0.44; }
  const dx = Math.min(W - dw - 16, Math.max(16, W * 0.56 - dw / 2));
  geo = { floorY, dh, dw, dx, top: floorY - dh };
  dirty = true;
}

function mix(a, b, t) { return a + (b - a) * t; }

function draw() {
  const { floorY, dh, dw, dx, top } = geo;
  const lit = hall;
  // how much of the hall has got into the room
  const amb = Math.pow(gap, 0.7) * lit;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // wall
  const wv = Math.round(mix(8, 30, amb));
  ctx.fillStyle = `rgb(${wv},${wv + 1},${wv + 4})`;
  ctx.fillRect(0, 0, W, floorY);
  // floor
  const fv = Math.round(mix(6, 22, amb));
  ctx.fillStyle = `rgb(${fv + 2},${fv + 1},${fv + 2})`;
  ctx.fillRect(0, floorY, W, H - floorY);

  // the door's free edge
  const edgeX = dx + dw * (1 - gap);
  const swing = Math.sqrt(Math.max(0, 1 - (1 - gap) * (1 - gap))); // sin of the angle
  const reach = dh * 0.13 * swing;

  // light the wall catches around the opening
  if (gap > 0.001) {
    const cx = (edgeX + dx + dw) / 2;
    const r = dh * (0.5 + gap * 1.1);
    const glow = ctx.createRadialGradient(cx, top + dh * 0.5, 0, cx, top + dh * 0.5, r);
    glow.addColorStop(0, `rgba(240,205,140,${0.10 * amb})`);
    glow.addColorStop(1, "rgba(240,205,140,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, floorY);
  }

  // the architrave, only ever seen by what leaks round it
  ctx.strokeStyle = `rgba(210,190,150,${0.05 + 0.16 * amb})`;
  ctx.lineWidth = Math.max(3, dw * 0.035);
  ctx.strokeRect(dx - ctx.lineWidth / 2, top - ctx.lineWidth / 2, dw + ctx.lineWidth, dh + ctx.lineWidth / 2 + 1);

  // the hall
  ctx.fillStyle = "#050506";
  ctx.fillRect(dx, top, dw, dh);
  if (gap > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(edgeX, top, dx + dw - edgeX, dh);
    ctx.clip();
    const hw = ctx.createLinearGradient(0, top, 0, floorY);
    const k = lit;
    hw.addColorStop(0, `rgb(${Math.round(250 * k)},${Math.round(226 * k)},${Math.round(172 * k)})`);
    hw.addColorStop(0.86, `rgb(${Math.round(236 * k)},${Math.round(196 * k)},${Math.round(128 * k)})`);
    hw.addColorStop(0.86, `rgb(${Math.round(250 * k)},${Math.round(240 * k)},${Math.round(214 * k)})`);
    hw.addColorStop(0.915, `rgb(${Math.round(244 * k)},${Math.round(230 * k)},${Math.round(200 * k)})`);
    hw.addColorStop(0.915, `rgb(${Math.round(150 * k)},${Math.round(104 * k)},${Math.round(62 * k)})`);
    hw.addColorStop(1, `rgb(${Math.round(176 * k)},${Math.round(124 * k)},${Math.round(74 * k)})`);
    ctx.fillStyle = hw;
    ctx.fillRect(dx, top, dw, dh);
    ctx.restore();
  }

  // light across the bedroom floor
  if (gap > 0.001) {
    const sx = dx + dw * 0.8;
    const spread = 1 + 2.4 * (H - floorY) / dh;
    const fall = ctx.createLinearGradient(0, floorY, 0, H);
    fall.addColorStop(0, `rgba(238,196,124,${0.20 * lit})`);
    fall.addColorStop(1, `rgba(238,196,124,${0.035 * lit})`);
    ctx.fillStyle = fall;
    for (let i = 0; i < 4; i++) {
      const soft = i * Math.max(2, dw * 0.012);
      ctx.beginPath();
      ctx.moveTo(edgeX - soft * 0.3, floorY);
      ctx.lineTo(dx + dw + soft * 0.3, floorY);
      ctx.lineTo(sx + (dx + dw - sx) * spread + soft * 3, H);
      ctx.lineTo(sx + (edgeX - sx) * spread - soft * 3, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  // the door itself, swung in towards the bed
  if (edgeX > dx + 0.5) {
    const dv = Math.round(mix(11, 26, amb * 0.6));
    const face = ctx.createLinearGradient(dx, 0, edgeX, 0);
    face.addColorStop(0, `rgb(${dv},${dv},${dv + 2})`);
    face.addColorStop(1, `rgb(${dv - 3},${dv - 3},${dv - 1})`);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(dx, top);
    ctx.lineTo(edgeX, top - reach);
    ctx.lineTo(edgeX, floorY + reach);
    ctx.lineTo(dx, floorY);
    ctx.closePath();
    ctx.fill();
  }
  // its edge, the one bright line in the room
  if (gap > 0.001) {
    const t = Math.max(1.5, dw * 0.022 * (0.4 + 0.6 * (1 - gap)));
    const rim = ctx.createLinearGradient(edgeX - t, 0, edgeX, 0);
    rim.addColorStop(0, `rgba(250,220,160,0)`);
    rim.addColorStop(1, `rgba(250,220,160,${0.75 * lit})`);
    ctx.fillStyle = rim;
    ctx.fillRect(edgeX - t, top - reach, t, dh + reach * 2);
  }
}

// someone goes down the hall: the light is interrupted once, slowly
function walk(now) {
  if (!passing) return false;
  const span = calm.matches ? 2600 : 1900;
  const p = (now - passing) / span;
  if (p >= 1) { passing = 0; hall = 1; return true; }
  const depth = calm.matches ? 0.22 : 0.5;
  hall = 1 - depth * Math.pow(Math.sin(Math.PI * p), 2);
  return true;
}

let running = false;
function loop() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

function frame(now) {
  const walking = walk(now);
  if (dirty || walking) { draw(); dirty = false; }
  if (walking) requestAnimationFrame(frame);
  else running = false;
}

window.addEventListener("resize", () => { measure(); loop(); });
measure();
loop();

// said once, if nobody has touched the door yet
stillTimer = setTimeout(verdict, 2400);
