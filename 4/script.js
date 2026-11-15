// About three seconds.
//
// The felt present, the stretch that seems to be "now" all at once, is
// usually put at about three seconds. This page is a sheet of paper whose ink
// lasts exactly that long. You are asked to write your name. Unless it is a
// very short name, the first letter has gone before the last is made, and you
// never see the whole of it. That is the piece.

const NOW = 3000;            // how long any mark lasts, in ms
const GOING = 450;           // the last part of that, spent leaving

const canvas = document.getElementById("page");
const say = document.getElementById("say");
const ctx = canvas.getContext("2d");
const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

let W = 0, H = 0, dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  draw(performance.now());
}

// ---- the marks ----------------------------------------------------------

// Each stroke is a list of points {x, y, t, w}. Each typed letter is
// {ch, x, y, t, tilt}. Everything is thrown away NOW ms after its own t.
let strokes = [];
let letters = [];
const pens = new Map();      // pointerId -> stroke being made

// One "attempt" runs from the first mark on an empty sheet until the sheet is
// empty again. What matters is whether it fitted inside the three seconds.
let began = 0, last = 0, attempts = 0, active = false;

function mark(t) {
  if (!active) {
    active = true;
    began = t;
    say.classList.add("away");
  }
  last = t;
  wake();
}

function nib(speed) {
  // a soft pen: slow is heavy, fast is thin
  const base = Math.max(2.2, Math.min(W, H) / 190);
  return base * (0.55 + 1.15 / (1 + speed * 1.4));
}

function penDown(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  canvas.focus({ preventScroll: true });
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const t = performance.now();
  const s = [{ x: e.clientX, y: e.clientY, t, w: nib(0.2) }];
  strokes.push(s);
  pens.set(e.pointerId, s);
  mark(t);
  e.preventDefault();
}

function penMove(e) {
  const s = pens.get(e.pointerId);
  if (!s) return;
  const t = performance.now();
  const p = s[s.length - 1];
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.2) return;
  const speed = d / Math.max(1, t - p.t);              // px per ms
  const w = p.w + (nib(speed) - p.w) * 0.35;           // the nib has some weight
  s.push({ x: e.clientX, y: e.clientY, t, w });
  mark(t);
}

function penUp(e) {
  pens.delete(e.pointerId);
}

canvas.addEventListener("pointerdown", penDown);
canvas.addEventListener("pointermove", penMove);
canvas.addEventListener("pointerup", penUp);
canvas.addEventListener("pointercancel", penUp);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Typing is the same act with a different hand. There is no backspace: a
// letter cannot be taken back, only outlasted.
let caretX = 0, caretY = 0;

function typeSize() {
  return Math.max(26, Math.min(54, W / 16));
}

function typeFont() {
  return `italic ${typeSize()}px "Iowan Old Style", Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif`;
}

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1 && e.key !== "Enter") return;
  const t = performance.now();
  const size = typeSize();
  const margin = Math.max(28, W * 0.12);
  if (!letters.length) {
    caretX = margin;
    caretY = H * 0.42;
  }
  if (e.key === "Enter") {
    caretX = margin;
    caretY += size * 1.35;
    e.preventDefault();
    return;
  }
  ctx.font = typeFont();
  const adv = ctx.measureText(e.key).width;
  if (caretX + adv > W - margin) {
    caretX = margin;
    caretY += size * 1.35;
  }
  if (caretY > H - size) caretY = H * 0.42;
  if (e.key !== " ") {
    letters.push({
      ch: e.key, x: caretX, y: caretY + (Math.random() - 0.5) * size * 0.07, t,
      tilt: (Math.random() - 0.5) * 0.05,
    });
    mark(t);
  }
  caretX += adv + size * 0.02;
  e.preventDefault();
});

// ---- drawing -------------------------------------------------------------

function alphaAt(age) {
  if (age >= NOW) return 0;
  const left = NOW - age;
  return left > GOING ? 1 : left / GOING;
}

function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#231c2b";
  ctx.fillStyle = "#231c2b";

  for (const s of strokes) {
    if (s.length === 1) {
      const p = s[0];
      const a = alphaAt(now - p.t);
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.w * 0.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Smoothed through the midpoints, one short curve per point so that each
    // can have its own weight and its own age.
    for (let i = 1; i < s.length; i++) {
      const p0 = s[i - 1], p1 = s[i];
      const a = alphaAt(now - p0.t);
      if (a <= 0) continue;
      const pp = s[i - 2] || p0;
      const ax = i === 1 ? p0.x : (pp.x + p0.x) / 2;
      const ay = i === 1 ? p0.y : (pp.y + p0.y) / 2;
      const last = i === s.length - 1;
      const bx = last ? p1.x : (p0.x + p1.x) / 2;
      const by = last ? p1.y : (p0.y + p1.y) / 2;
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = p1.w * (0.6 + 0.4 * a);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(p0.x, p0.y, bx, by);
      ctx.stroke();
    }
  }

  if (letters.length) {
    ctx.font = typeFont();
    ctx.textBaseline = "alphabetic";
    for (const l of letters) {
      const a = alphaAt(now - l.t);
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.9;
      ctx.setTransform(dpr, 0, 0, dpr, l.x * dpr, l.y * dpr);
      ctx.rotate(l.tilt);
      ctx.fillText(l.ch, 0, 0);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ctx.globalAlpha = 1;
}

function forget(now) {
  for (const s of strokes) {
    // keep one expired point as the start of the oldest living segment
    let k = 0;
    while (k < s.length - 1 && now - s[k + 1].t >= NOW) k++;
    if (k) s.splice(0, k);
  }
  strokes = strokes.filter((s) => {
    if (now - s[s.length - 1].t < NOW) return true;
    for (const held of pens.values()) if (held === s) return true;   // pen resting on the paper
    return false;
  });
  letters = letters.filter((l) => now - l.t < NOW);
}

// ---- the one line of type -------------------------------------------------

const after = [
  "you never saw all of it at once",
  "this is about how wide now is",
  "everything longer than this is memory",
];
const fitted = [
  "that fitted. write all of it",
  "anything that short, you can have whole",
];
let longs = 0, shorts = 0, sayTimer = 0;

function speak(text, delay) {
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => {
    say.textContent = text;
    say.classList.remove("away");
  }, delay);
}

function emptied() {
  active = false;
  attempts++;
  const span = last - began;
  if (span < 600) {
    speak("write your name", 500);                       // a dot is not an attempt
  } else if (span < NOW - 200) {
    speak(fitted[shorts++ % fitted.length], 700);
  } else {
    const line = after[longs++ % after.length];
    speak(line, 900);
    // and after a while, ask again
    const mine = attempts;
    setTimeout(() => {
      if (!active && attempts === mine) {
        say.classList.add("away");
        speak("write your name", 1400);
      }
    }, 9000);
  }
}

// ---- the clock -------------------------------------------------------------

let running = false;

function wake() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  forget(now);
  draw(now);
  if (strokes.length || letters.length) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    if (active) emptied();
  }
}

window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  // time went on while the page was not looked at; so did the ink
  if (!document.hidden && (strokes.length || letters.length)) wake();
});
if (calm.addEventListener) calm.addEventListener("change", () => draw(performance.now()));

resize();
