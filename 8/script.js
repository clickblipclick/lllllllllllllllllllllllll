// By heart
// A bedroom seen from above. In the light it is a room; in the dark it is
// what you remember of the room, and the two are a few inches apart.
// No words on the page. Everything seen and heard is made here.
(() => {
  'use strict';

  const cv = document.getElementById('room');
  const ctx = cv.getContext('2d');
  const off = document.createElement('canvas');
  const lx = off.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  const RW = 160, RH = 100, BR = 3.2;
  const SW = { x: 1.2, y: 27.5 };          // the light switch, on the wall by the door
  const START = { x: 7.5, y: 28 };
  const WAKE = { x: 109, y: 26 };          // where your feet land when you get up
  const CLOCK = { x: 153, y: 54 };
  const RUG = { x: 50, y: 42, w: 40, h: 26 };
  const CREAK = { x: 95, y: 18, w: 6, h: 64 };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = Math.random;

  // ---------------------------------------------------------------- layout
  let vw = 1, vh = 1, dpr = 1, s = 1, ox = 0, oy = 0, portrait = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth; vh = window.innerHeight;
    portrait = vh > vw;
    const pad = Math.max(14, Math.min(vw, vh) * 0.035);
    const rw = portrait ? RH : RW, rh = portrait ? RW : RH;
    s = Math.min((vw - 2 * pad) / rw, (vh - 2 * pad) / rh);
    ox = (vw - rw * s) / 2; oy = (vh - rh * s) / 2;
    for (const c of [cv, off]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
  }
  // The room is described once, lying on its side; on a tall window it is
  // laid the other way by swapping the axes.
  const PX = (x, y) => (portrait ? ox + y * s : ox + x * s);
  const PY = (x, y) => (portrait ? oy + x * s : oy + y * s);
  const unP = (sx, sy) => (portrait ? { x: (sy - oy) / s, y: (sx - ox) / s } : { x: (sx - ox) / s, y: (sy - oy) / s });

  // ---------------------------------------------------------------- the room
  const O = {
    bed: { k: 'r', x: 114, y: 8, w: 45, h: 36, mat: 'soft' },
    table: { k: 'r', x: 147, y: 48, w: 12, h: 12, mat: 'wood' },
    desk: { k: 'r', x: 40, y: 1.5, w: 40, h: 16, mat: 'wood' },
    chair: { k: 'r', x: 54, y: 19.5, w: 11, h: 11, mat: 'wood', mov: 1 },
    wardrobe: { k: 'r', x: 60, y: 84.5, w: 40, h: 14, mat: 'hollow' },
    wdoor: { k: 'r', x: 62, y: 62.5, w: 2.4, h: 22, mat: 'hollow', on: false },
    armchair: { k: 'r', x: 12, y: 70, w: 22, h: 22, mat: 'soft', mov: 1 },
    basket: { k: 'c', x: 127, y: 78, r: 6, mat: 'wicker', mov: 1 },
    lamp: { k: 'c', x: 108, y: 92, r: 3, mat: 'metal' },
    shoeA: { k: 'c', x: 6.5, y: 60, r: 1.8, mat: 'shoe', kick: 1, vx: 0, vy: 0, a: 0.2 },
    shoeB: { k: 'c', x: 11.5, y: 60.6, r: 1.8, mat: 'shoe', kick: 1, vx: 0, vy: 0, a: 0.5 },
  };
  const list = [];
  for (const id in O) { const o = O[id]; o.id = id; if (o.on === undefined) o.on = true; list.push(o); }
  // The one thing in the room that is only ever there in the dark.
  const phantom = { id: 'phantom', k: 'c', x: 0, y: 0, r: 4.2, mat: 'none', on: false, touched: 0 };
  const walls = ['l', 'r', 't', 'b'].map((w) => ({ id: 'wall' + w, k: 'w', mat: 'wall' }));
  const cat = { id: 'cat', k: 'c', x: 70, y: 56, r: 3, tx: 70, ty: 56, moving: false, flee: false, wait: 6, touchT: -9, eyeAt: 5, a: 0 };

  const b = { x: START.x, y: START.y, vx: 0, vy: 0, a: 0, walked: 0, left: false };

  let T = 0;
  let lit = true, litA = 1;
  let goal = 'off';            // 'off' (turn it off) | 'bed' | 'switch'
  let phase = 'play';          // 'play' | 'sleep'
  let sleepT = 0, slept = false, night = 0;
  let fear = 0, pain = 0, beatT = -9;
  let ghost = [], ghostA = 0, lastSeen = [];
  let marks = [], trail = [], bumps = [];
  let neon = 1, neonOn = true;
  let creakT = -9, started = false;

  const memX = (q) => q.x + q.ex * q.em * q.sure;
  const memY = (q) => q.y + q.ey * q.em * q.sure;
  const snapshot = () => {
    // Not a copy of the room: a memory of it, already slightly out, and
    // drifting further for as long as the light stays off.
    const g = list.filter((o) => o.on).map((o) => ({ id: o.id, k: o.k, x: o.x, y: o.y, w: o.w, h: o.h, r: o.r }));
    g.push({ id: 'cat', k: 'c', x: cat.x, y: cat.y, r: cat.r });
    for (const q of g) {
      const a = rnd() * 6.2832;
      q.ex = Math.cos(a); q.ey = Math.sin(a); q.em = rnd() * 0.9;
      q.sure = q.id === 'bed' || q.id === 'desk' || q.id === 'wardrobe' ? 0.45 : 1;   // the big things you know best
    }
    return g;
  };

  // ---------------------------------------------------------------- sound
  let ac = null, master = null, noiseBuf = null, toneG = null, humG = null, nextBeat = 0;

  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    // the sound of a dark room: almost nothing
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170;
    toneG = ac.createGain(); toneG.gain.value = 0;
    n.connect(f); f.connect(toneG); toneG.connect(master); n.start();
    // the sound of a lit one: the light itself
    humG = ac.createGain(); humG.gain.value = 0; humG.connect(master);
    for (const [fr, g] of [[100, 1], [200, 0.35], [300, 0.12]]) {
      const o = ac.createOscillator(); o.frequency.value = fr;
      const og = ac.createGain(); og.gain.value = g;
      o.connect(og); og.connect(humG); o.start();
    }
  }
  function outNode(pan) {
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan || 0, -1, 1); p.connect(master); return p; }
    return master;
  }
  function env(g, t, gain, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  }
  function noise(o) {
    if (!ac) return;
    const t = ac.currentTime + (o.at || 0), dur = o.dur || 0.1, attack = o.attack || 0.004;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.value = o.f || 400; f.Q.value = o.q || 1;
    const g = ac.createGain(); env(g, t, o.gain || 0.2, attack, dur);
    src.connect(f); f.connect(g); g.connect(outNode(o.pan));
    src.start(t, rnd() * 1.5); src.stop(t + attack + dur + 0.05);
  }
  function ping(o) {
    if (!ac) return;
    const t = ac.currentTime + (o.at || 0), dur = o.dur || 0.2, attack = o.attack || 0.004;
    const osc = ac.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + attack + dur);
    const g = ac.createGain(); env(g, t, o.gain || 0.2, attack, dur);
    let head = osc;
    if (o.bp) { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = 5; osc.connect(f); head = f; }
    head.connect(g); g.connect(outNode(o.pan));
    osc.start(t); osc.stop(t + attack + dur + 0.05);
  }
  const panOf = (x, y) => (PX(x, y) - PX(b.x, b.y)) / (vw * 0.4);

  function thud(mat, v, pan) {
    if (!ac) return;
    if (mat === 'wood') { noise({ f: 240, q: 2, dur: 0.09, gain: 0.5 * v, pan }); ping({ f: 130, f1: 80, dur: 0.12, gain: 0.5 * v, pan }); }
    else if (mat === 'hollow') { noise({ f: 150, q: 1.5, dur: 0.17, gain: 0.5 * v, pan }); ping({ f: 86, f1: 60, dur: 0.28, gain: 0.6 * v, pan }); }
    else if (mat === 'soft') noise({ type: 'lowpass', f: 150, dur: 0.24, gain: 0.8 * v, attack: 0.02, pan });
    else if (mat === 'wall') { ping({ f: 72, f1: 50, dur: 0.15, gain: 0.7 * v, pan }); noise({ type: 'lowpass', f: 320, dur: 0.05, gain: 0.2 * v, pan }); }
    else if (mat === 'metal') { for (const f of [870, 1413, 2190]) ping({ f, dur: 1.1, gain: 0.1 * v, pan }); noise({ type: 'highpass', f: 3000, dur: 0.03, gain: 0.15 * v, pan }); }
    else if (mat === 'wicker') { for (const at of [0, 0.05, 0.12]) noise({ f: 1500, q: 3, dur: 0.045, gain: 0.25 * v, at, pan }); }
    else if (mat === 'shoe') { noise({ f: 900, q: 0.8, dur: 0.2, gain: 0.3 * v, pan }); noise({ f: 420, q: 1, dur: 0.08, gain: 0.2 * v, at: 0.16, pan }); }
  }
  function stepSound(soft) {
    if (soft) noise({ type: 'lowpass', f: 110, dur: 0.11, gain: lit ? 0.03 : 0.05, attack: 0.01 });
    else noise({ type: 'lowpass', f: 230, dur: 0.07, gain: lit ? 0.04 : 0.075 });
  }
  function creak() {
    ping({ type: 'sawtooth', f: 92 + rnd() * 12, f1: 150 + rnd() * 30, dur: 0.42, gain: 0.16, attack: 0.05, bp: 780 });
  }
  function click() { noise({ type: 'highpass', f: 2500, dur: 0.02, gain: 0.3, pan: -0.2 }); ping({ f: 1800, dur: 0.025, gain: 0.08 }); }
  function mrrp(pan) {
    ping({ type: 'triangle', f: 430, f1: 700, dur: 0.22, gain: 0.11, attack: 0.03, pan });
    for (let i = 0; i < 26; i++) noise({ type: 'lowpass', f: 120, dur: 0.03, gain: 0.07, at: 0.35 + i * 0.042, pan });
  }
  function breath() {
    for (const at of [0.2, 2.3]) {
      noise({ f: 520, q: 0.7, dur: 0.9, gain: 0.05, attack: 0.8, at });
    }
  }
  function hush() {                       // everything stops for a moment
    if (!ac) return;
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(0, t, 0.03);
    master.gain.setTargetAtTime(0.9, t + 1.9, 0.5);
    nextBeat = t + 2.1;
  }

  // ---------------------------------------------------------------- marks
  const jit = (v, n) => v + (rnd() - 0.5) * n;
  function perim(o, u) {
    const P = 2 * (o.w + o.h); u = ((u % P) + P) % P;
    if (u < o.w) return [o.x + u, o.y]; u -= o.w;
    if (u < o.h) return [o.x + o.w, o.y + u]; u -= o.h;
    if (u < o.w) return [o.x + o.w - u, o.y + o.h]; u -= o.w;
    return [o.x, o.y + o.h - u];
  }
  function perimU(o, qx, qy) {
    const e = 1e-3;
    if (Math.abs(qy - o.y) < e) return qx - o.x;
    if (Math.abs(qx - (o.x + o.w)) < e) return o.w + qy - o.y;
    if (Math.abs(qy - (o.y + o.h)) < e) return o.w + o.h + (o.x + o.w - qx);
    return 2 * o.w + o.h + (o.y + o.h - qy);
  }
  function addMark(o, c, col) {
    const pts = [];
    if (o.k === 'r') {
      const u = perimU(o, c.qx, c.qy), half = Math.min(4 + rnd() * 2, (o.w + o.h) * 0.9);
      for (let d = -half; d <= half; d += 0.6) { const p = perim(o, u + d); pts.push([jit(p[0], 0.3), jit(p[1], 0.3)]); }
    } else if (o.k === 'c') {
      const a0 = Math.atan2(c.qy - o.y, c.qx - o.x), span = Math.min(2.6, 5 / o.r), n = col === 'ph' ? 0 : 0.28;
      for (let d = -span; d <= span + 0.01; d += span / 9) pts.push([jit(o.x + Math.cos(a0 + d) * o.r, n), jit(o.y + Math.sin(a0 + d) * o.r, n)]);
    } else {
      const along = c.nx !== 0;           // a wall running along y
      for (let d = -5; d <= 5; d += 0.7) {
        const x = along ? c.qx : clamp(c.qx + d, 0, RW), y = along ? clamp(c.qy + d, 0, RH) : c.qy;
        pts.push([jit(x, 0.22), jit(y, 0.22)]);
      }
    }
    marks.push({ pts, t: T, col: col || 'chalk' });
    if (marks.length > 420) marks.shift();
  }

  // ---------------------------------------------------------------- touching things
  function collide(o) {
    if (o.k === 'c') {
      const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1e-6, pen = BR + o.r - d;
      if (pen <= 0) return null;
      return { nx: dx / d, ny: dy / d, pen, qx: o.x + dx / d * o.r, qy: o.y + dy / d * o.r };
    }
    const qx = clamp(b.x, o.x, o.x + o.w), qy = clamp(b.y, o.y, o.y + o.h);
    const dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
    if (d === 0) {
      const l = b.x - o.x, r = o.x + o.w - b.x, t = b.y - o.y, u = o.y + o.h - b.y, m = Math.min(l, r, t, u);
      if (m === l) return { nx: -1, ny: 0, pen: l + BR, qx: o.x, qy: b.y };
      if (m === r) return { nx: 1, ny: 0, pen: r + BR, qx: o.x + o.w, qy: b.y };
      if (m === t) return { nx: 0, ny: -1, pen: t + BR, qx: b.x, qy: o.y };
      return { nx: 0, ny: 1, pen: u + BR, qx: b.x, qy: o.y + o.h };
    }
    const pen = BR - d;
    if (pen <= 0) return null;
    return { nx: dx / d, ny: dy / d, pen, qx, qy };
  }

  function surprised(o) {
    if (o.k === 'w') return false;
    const g = ghost.find((q) => q.id === o.id);
    return !g || Math.hypot(memX(g) - o.x, memY(g) - o.y) > 2.4;
  }

  function touch(o, c, impact) {
    const st = o.st || (o.st = { last: -9, mx: 1e9, my: 0 });
    const fresh = T - st.last > 0.35;
    st.last = T;
    const pan = panOf(c.qx, c.qy);
    if (o === phantom) {
      if (fresh && !phantom.touched) { phantom.touched = T; fear = 1; hush(); catFlee(); }
      if (fresh || Math.hypot(b.x - st.mx, b.y - st.my) > 1.6) { addMark(o, c, 'ph'); st.mx = b.x; st.my = b.y; }
      return;
    }
    if (fresh) {
      if (!lit && goal === 'bed' && o === O.bed) { thud('soft', 0.35, pan); addMark(o, c); return startSleep(); }
      const str = clamp((impact - 5) / 12, 0, 1);
      if (lit) thud(o.mat, 0.12 + str * 0.2, pan);
      else if (impact > 5) {
        const sup = surprised(o);
        fear = Math.min(1, fear + (0.1 + 0.45 * str) * (sup ? 1.7 : 1));
        pain = Math.max(pain, 0.25 + str * 0.75);
        bumps.push([c.qx, c.qy]);
        thud(o.mat, 0.35 + str * 0.65, pan);
        if (o.mov && str > 0.4) { o.x = clamp(o.x - c.nx * (1 + 2 * str), 1, RW - (o.w || o.r) - 1); o.y = clamp(o.y - c.ny * (1 + 2 * str), 1, RH - (o.h || o.r) - 1); }
        if (str > 0.5) catFlee();
      } else { thud(o.mat, 0.13, pan); fear = Math.min(1, fear + 0.015); }
    }
    if (!lit && (fresh || Math.hypot(b.x - st.mx, b.y - st.my) > 2.4)) { addMark(o, c); st.mx = b.x; st.my = b.y; }
  }

  function catFlee() {
    let best = null, bd = -1;
    for (let i = 0; i < 7; i++) {
      const p = [8 + rnd() * (RW - 16), 8 + rnd() * (RH - 16)], d = Math.hypot(p[0] - b.x, p[1] - b.y);
      if (d > bd) { bd = d; best = p; }
    }
    cat.tx = best[0]; cat.ty = best[1]; cat.moving = true; cat.flee = true;
  }

  // ---------------------------------------------------------------- input
  const ptr = { down: false, id: null, x: 0, y: 0, armed: false };
  const keys = new Set();
  let keyTap = false, keyHold = 0;

  function setPtr(e) { const p = unP(e.clientX, e.clientY); ptr.x = p.x; ptr.y = p.y; }
  cv.addEventListener('pointerdown', (e) => {
    audio(); started = true;
    if (phase !== 'play') return;
    ptr.down = true; ptr.id = e.pointerId; ptr.armed = true; setPtr(e);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', (e) => {
    if (ptr.down && e.pointerId === ptr.id) setPtr(e);
    else if (e.pointerType === 'mouse') {
      const p = unP(e.clientX, e.clientY);
      cv.classList.toggle('at-switch', Math.hypot(p.x - SW.x, p.y - SW.y) < 6.5);
    }
  });
  const lift = (e) => { if (e.pointerId === ptr.id) ptr.down = false; };
  cv.addEventListener('pointerup', lift);
  cv.addEventListener('pointercancel', lift);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYS[k]) { keys.add(k); audio(); started = true; e.preventDefault(); }
    else if (k === ' ' || k === 'Enter') { if (!e.repeat) keyTap = true; audio(); started = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => { keys.clear(); ptr.down = false; });

  // ---------------------------------------------------------------- light, sleep, the night's changes
  function toggle() {
    click();
    ptr.armed = false;
    if (lit) {
      lit = false; goal = 'bed';
      ghost = snapshot(); lastSeen = ghost; ghostA = 0.6;
      marks = []; trail = []; bumps = [];
      fear = Math.max(fear, 0.12);
    } else {
      lit = true; goal = 'off';
      phantom.on = false;
      neonOn = true;
    }
  }

  function startSleep() {
    phase = 'sleep'; sleepT = 0; slept = false;
    ptr.down = false; keys.clear();
    b.vx = b.vy = 0;
    breath();
  }

  const bnd = (o) => (o.k === 'c' ? [o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r] : [o.x, o.y, o.x + o.w, o.y + o.h]);
  function free(o, pad) {
    const a = bnd(o);
    if (a[0] < 1 || a[1] < 1 || a[2] > RW - 1 || a[3] > RH - 1) return false;
    for (const p of [WAKE, START]) if (p.x > a[0] - 9 && p.x < a[2] + 9 && p.y > a[1] - 9 && p.y < a[3] + 9) return false;
    for (const q of list) {
      if (q === o || !q.on || q.kick) continue;
      const c = bnd(q);
      if (a[0] < c[2] + pad && a[2] > c[0] - pad && a[1] < c[3] + pad && a[3] > c[1] - pad) return false;
    }
    return true;
  }
  function place(o, x0, x1, y0, y1, pad) {
    const sx = o.x, sy = o.y;
    for (let i = 0; i < 50; i++) {
      o.x = x0 + rnd() * (x1 - x0); o.y = y0 + rnd() * (y1 - y0);
      if (free(o, pad === undefined ? 2 : pad)) return Math.hypot(o.x - sx, o.y - sy) > 2;
    }
    o.x = sx; o.y = sy; return false;
  }

  // While you sleep, the room is used by the day. It is put back nearly right.
  function rearrange(k) {
    const moved = [];
    O.wdoor.on = false;
    if (place(O.chair, 42, 80, 19.5, 44)) moved.push(O.chair);
    if (place(O.armchair, 6, 32, 58, 76)) moved.push(O.armchair);
    if (k >= 2 ? place(O.basket, 30, 140, 32, 90) : place(O.basket, 100, 142, 58, 90)) moved.push(O.basket);
    if (k >= 3 && place(O.lamp, 94, 124, 66, 95)) moved.push(O.lamp);
    if (k >= 2 && (k === 2 || rnd() < 0.6)) { O.wdoor.on = true; if (!free(O.wdoor, 1)) O.wdoor.on = false; else moved.push(O.wdoor); }
    for (const sh of [O.shoeA, O.shoeB]) {
      const t = 0.15 + rnd() * 0.7;
      const cx = WAKE.x + (START.x - WAKE.x) * t, cy = WAKE.y + (START.y - WAKE.y) * t;
      place(sh, cx - 6, cx + 6, cy - 12, cy + 16, 1);
      sh.a = rnd() * 6.3; sh.vx = sh.vy = 0;
    }
    phantom.on = false; phantom.touched = 0; phantom.st = null;
    if (k >= 3 && (k === 3 || rnd() < 0.5)) {
      phantom.on = true;
      const t = 0.35 + rnd() * 0.32;
      const cx = WAKE.x + (START.x - WAKE.x) * t;
      if (!place(phantom, cx - 4, cx + 4, 20, 36, 1.5)) phantom.on = false;
    }
    neonOn = k % 5 !== 0;
    cat.x = 20 + rnd() * 120; cat.y = 20 + rnd() * 60; cat.moving = false; cat.wait = 3 + rnd() * 5; cat.eyeAt = T + 3.5 + rnd() * 3;
    return moved;
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    T += dt;

    if (phase === 'sleep') {
      sleepT += dt;
      if (!slept && sleepT > 2.3) {
        slept = true; night++;
        const moved = rearrange(night);
        b.x = WAKE.x; b.y = WAKE.y; b.a = Math.PI;
        marks = []; trail = []; bumps = [];
        ghostA = 0.2; fear = 0.1;
        for (const q of ghost) q.em += 1.2 + rnd() * 1.6;     // sleep is hard on it
        sleepT = 2.3;
        // something in the room settles; that is what woke you
        const o = moved[(rnd() * moved.length) | 0];
        if (o && ac) setTimeout(() => thud(o.mat, 0.3, panOf(o.x, o.y)), 1700);
      }
      if (sleepT > 4.8) { phase = 'play'; goal = 'switch'; }
    }

    // walking
    if (phase === 'play') {
      const maxV = lit ? 27 : 21;
      let tx = 0, ty = 0;
      if (ptr.down) {
        const dx = ptr.x - b.x, dy = ptr.y - b.y, d = Math.hypot(dx, dy);
        if (d > 1.2) { const v = Math.min(maxV, d * 1.45); tx = dx / d * v; ty = dy / d * v; }
        keyHold = 0;
      } else if (keys.size) {
        let kx = 0, ky = 0;
        for (const k of keys) { kx += KEYS[k][0]; ky += KEYS[k][1]; }
        if (portrait) { const t = kx; kx = ky; ky = t; }
        const d = Math.hypot(kx, ky);
        if (d) { keyHold += dt; const v = maxV * Math.min(1, 0.3 + keyHold * 0.55); tx = kx / d * v; ty = ky / d * v; }
      } else keyHold = 0;
      const ease = Math.min(1, dt * 7);
      b.vx += (tx - b.vx) * ease; b.vy += (ty - b.vy) * ease;
      const px = b.x, py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;

      for (const o of list) {
        if (!o.on) continue;
        const c = collide(o);
        if (!c) continue;
        const impact = -(b.vx * c.nx + b.vy * c.ny);
        if (o.kick) {
          const st = o.st || (o.st = { last: -9 });
          if (T - st.last > 0.5) {
            thud('shoe', lit ? 0.3 : 0.8, panOf(o.x, o.y));
            if (!lit) { addMark(o, c); fear = Math.min(1, fear + (surprised(o) ? 0.16 : 0.05)); bumps.push([c.qx, c.qy]); }
          }
          st.last = T;
          const v = Math.max(9, impact * 1.4);
          o.vx = -c.nx * v; o.vy = -c.ny * v; o.x -= c.nx * c.pen; o.y -= c.ny * c.pen;
          continue;
        }
        b.x += c.nx * c.pen; b.y += c.ny * c.pen;
        if (impact > 0) { b.vx += c.nx * impact; b.vy += c.ny * impact; }
        touch(o, c, impact);
        if (phase !== 'play') break;
      }
      if (phantom.on && phase === 'play' && !lit) {
        const c = collide(phantom);
        if (c) {
          const impact = -(b.vx * c.nx + b.vy * c.ny);
          b.x += c.nx * c.pen; b.y += c.ny * c.pen;
          if (impact > 0) { b.vx += c.nx * impact; b.vy += c.ny * impact; }
          touch(phantom, c, impact);
        } else if (phantom.touched && T - phantom.st.last > 0.7) phantom.on = false;   // and then it is not there
      }
      if (phase === 'play') {
        if (b.x < BR) { touch(walls[0], { nx: 1, ny: 0, qx: 0, qy: b.y }, -b.vx); b.x = BR; b.vx = 0; }
        if (b.x > RW - BR) { touch(walls[1], { nx: -1, ny: 0, qx: RW, qy: b.y }, b.vx); b.x = RW - BR; b.vx = 0; }
        if (b.y < BR) { touch(walls[2], { nx: 0, ny: 1, qx: b.x, qy: 0 }, -b.vy); b.y = BR; b.vy = 0; }
        if (b.y > RH - BR) { touch(walls[3], { nx: 0, ny: -1, qx: b.x, qy: RH }, b.vy); b.y = RH - BR; b.vy = 0; }
      }

      const moved = Math.hypot(b.x - px, b.y - py);
      if (moved > 0.004) {
        const a = Math.atan2(b.y - py, b.x - px);
        let da = a - b.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        b.a += da * Math.min(1, dt * 9);
        b.walked += moved;
        if (b.walked > 4.2) {
          b.walked = 0; b.left = !b.left;
          const onRug = b.x > RUG.x && b.x < RUG.x + RUG.w && b.y > RUG.y && b.y < RUG.y + RUG.h;
          stepSound(onRug);
          if (!lit) { trail.push([b.x, b.y, b.a, b.left]); if (trail.length > 900) trail.shift(); }
          if (b.x > CREAK.x && b.x < CREAK.x + CREAK.w && b.y > CREAK.y && b.y < CREAK.y + CREAK.h && T - creakT > 0.9) { creakT = T; creak(); }
        }
      }

      // the switch
      const near = Math.hypot(b.x - SW.x, b.y - SW.y);
      const press = keyTap || (ptr.down && ptr.armed && Math.hypot(ptr.x - SW.x, ptr.y - SW.y) < 6.5);
      if (near < 8.5 && press) toggle();
      else if (!lit && goal === 'switch' && near < 6.2) toggle();
    }
    keyTap = false;

    // shoes slide and stop
    for (const sh of [O.shoeA, O.shoeB]) {
      if (!sh.vx && !sh.vy) continue;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.a += (sh.vx + sh.vy) * dt * 0.3;
      const k = Math.exp(-4.5 * dt); sh.vx *= k; sh.vy *= k;
      if (sh.x < 2 || sh.x > RW - 2) { sh.vx *= -0.4; sh.x = clamp(sh.x, 2, RW - 2); }
      if (sh.y < 2 || sh.y > RH - 2) { sh.vy *= -0.4; sh.y = clamp(sh.y, 2, RH - 2); }
      if (Math.hypot(sh.vx, sh.vy) < 0.3) sh.vx = sh.vy = 0;
    }

    // the cat goes where it likes, over and under everything
    if (cat.moving) {
      const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy), v = (cat.flee ? 46 : 7) * dt;
      if (d <= v) { cat.x = cat.tx; cat.y = cat.ty; cat.moving = false; cat.flee = false; cat.wait = 5 + rnd() * 11; cat.eyeAt = T + 1.5 + rnd() * 4; }
      else { cat.x += dx / d * v; cat.y += dy / d * v; cat.a = Math.atan2(dy, dx); }
    } else if (phase === 'play') {
      cat.wait -= dt;
      if (cat.wait <= 0) { cat.tx = 8 + rnd() * (RW - 16); cat.ty = 8 + rnd() * (RH - 16); cat.moving = true; }
      if (T > cat.eyeAt + 2.6) cat.eyeAt = T + 5 + rnd() * 8;
    }
    if (phase === 'play' && Math.hypot(b.x - cat.x, b.y - cat.y) < BR + cat.r && T - cat.touchT > 1.6) {
      cat.touchT = T;
      mrrp(panOf(cat.x, cat.y));
      if (!lit) {
        addMark(cat, { qx: cat.x + (b.x - cat.x) * 0.5, qy: cat.y + (b.y - cat.y) * 0.5 }, 'cat');
        fear = Math.max(0, fear * 0.45 - 0.05);       // oh. it's you.
      }
      catFlee();
    }

    // light, fear, memory
    litA = clamp(litA + (lit ? dt / 0.3 : -dt / 1.5), 0, 1);
    fear -= fear * dt / (lit ? 2.2 : 15);
    pain = Math.max(0, pain - dt * 1.1);
    ghostA += (0.11 - ghostA) * dt / 16;
    if (!lit) for (const q of ghost) q.em = Math.min(5, q.em + dt * (0.05 + fear * 0.09));
    neon += ((neonOn ? 1 : 0) - neon) * Math.min(1, dt / (neonOn ? 0.3 : 4));

    if (ac) {
      const t = ac.currentTime;
      toneG.gain.setTargetAtTime(lit ? 0 : 0.05, t, 0.4);
      humG.gain.setTargetAtTime(lit ? 0.011 : 0, t, 0.05);
      if (!lit && phase === 'play' && t >= nextBeat) {
        const per = 60 / (58 + fear * 80), g = 0.035 + 0.3 * fear;
        ping({ f: 58, f1: 42, dur: 0.11, gain: g });
        ping({ f: 72, f1: 50, dur: 0.09, gain: g * 0.65, at: per * 0.3 });
        nextBeat = t + per; beatT = T;
      }
    } else if (!lit && T - beatT > 60 / (58 + fear * 80)) beatT = T;
  }

  // ---------------------------------------------------------------- drawing
  function poly(g, pts, close) {
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const X = PX(pts[i][0], pts[i][1]), Y = PY(pts[i][0], pts[i][1]);
      if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
    }
    if (close) g.closePath();
  }
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  function disc(g, x, y, r) { g.beginPath(); g.arc(PX(x, y), PY(x, y), r * s, 0, 6.2832); }
  function oval(x, y, rx, ry, a) {
    const pts = [], ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < 20; i++) { const t = i / 20 * 6.2832, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry; pts.push([x + ex * ca - ey * sa, y + ex * sa + ey * ca]); }
    return pts;
  }
  function glow(g, x, y, r, rgb, a) {
    if (a <= 0.003) return;
    const X = PX(x, y), Y = PY(x, y), gr = g.createRadialGradient(X, Y, 0, X, Y, r * s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.25, `rgba(${rgb},${a * 0.35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(X - r * s, Y - r * s, 2 * r * s, 2 * r * s);
    g.fillStyle = `rgba(${rgb},${Math.min(1, a * 1.6)})`; g.beginPath(); g.arc(X, Y, Math.max(1, s * 0.35), 0, 6.2832); g.fill();
  }
  const pulse = () => (calm.matches ? 0.85 : 0.62 + 0.38 * Math.sin(T * 2.6));

  function drawMarks(g, always, vis) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const m of marks) {
      let a = always ? 0.85 : Math.pow(clamp(1 - (T - m.t) / 11, 0, 1), 1.4);
      a *= vis;
      if (a < 0.01) continue;
      const rgb = m.col === 'cat' ? '236,176,104' : m.col === 'ph' ? '255,255,255' : '176,226,255';
      g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = Math.max(1.6, s * 0.26);
      poly(g, m.pts); g.stroke();
      if (m.col !== 'ph') { g.strokeStyle = `rgba(${rgb},${a * 0.25})`; g.lineWidth = Math.max(2.5, s * 0.7); g.stroke(); }
    }
  }

  function outline(g, o, dx, dy) {
    if (o.k === 'c') disc(g, o.x + dx, o.y + dy, o.r);
    else poly(g, box(o.x + dx, o.y + dy, o.w, o.h), true);
    g.stroke();
  }

  function drawDark(g, vis) {
    const still = calm.matches;
    // what you remember
    const ga = ghostA * vis;
    if (ga > 0.004) {
      g.setLineDash([s * 1.0, s * 1.25]); g.lineWidth = Math.max(1.25, s * 0.17);
      g.strokeStyle = `rgba(152,142,222,${ga * 0.55})`;
      poly(g, box(0, 0, RW, RH), true); g.stroke();
      poly(g, box(0, SW.y - 1.6, 1.3, 3.2), true); g.stroke();
      g.strokeStyle = `rgba(152,142,222,${ga})`;
      const w = still ? 0 : fear * 1.9;     // fear makes the memory swim
      ghost.forEach((o, i) => outline(g, o, memX(o) - o.x + Math.sin(T * 0.9 + i * 1.7) * w, memY(o) - o.y + Math.cos(T * 1.1 + i * 2.3) * w));
      g.setLineDash([]);
    }
    // what you have just touched
    drawMarks(g, false, vis);
    // the two lights that stay on
    glow(g, SW.x, SW.y, 9, '255,136,56', neon * vis * (goal === 'switch' ? 0.25 + 0.7 * pulse() : 0.42));
    glow(g, CLOCK.x, CLOCK.y, 7, '92,255,160', vis * (goal === 'bed' ? 0.2 + 0.6 * pulse() : 0.3));
    // the cat, looking
    const e = T - cat.eyeAt;
    if (!cat.moving && e > 0 && e < 2.6) {
      const ea = Math.sin(e / 2.6 * Math.PI) * 0.8 * vis;
      const look = phantom.on && !phantom.touched ? phantom : b;
      const a = Math.atan2(look.y - cat.y, look.x - cat.x), nx = -Math.sin(a) * 0.75, ny = Math.cos(a) * 0.75;
      g.fillStyle = `rgba(198,255,176,${ea})`;
      for (const k of [-1, 1]) { disc(g, cat.x + nx * k, cat.y + ny * k, 0.3); g.fill(); }
    }
    // you: the one thing you are sure of
    const beat = still ? 0 : Math.exp(-(T - beatT) * 7) * (0.04 + fear * 0.1);
    g.strokeStyle = `rgba(200,220,245,${0.26 * vis})`; g.lineWidth = Math.max(1, s * 0.16);
    disc(g, b.x, b.y, BR * (1 + beat)); g.stroke();
    g.fillStyle = `rgba(200,220,245,${0.2 * vis})`; disc(g, b.x, b.y, 0.5); g.fill();
  }

  const INK = 'rgba(203,222,243,0.78)';
  function shape(g, pts, fill, close) { poly(g, pts, close !== false); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); }

  function drawLit(g) {
    g.fillStyle = '#0a0e15'; g.fillRect(0, 0, vw, vh);
    // floor
    const cx = PX(80, 50), cy = PY(80, 50), fg = g.createRadialGradient(cx, cy, 0, cx, cy, 95 * s);
    fg.addColorStop(0, '#3a475c'); fg.addColorStop(0.45, '#262f3f'); fg.addColorStop(1, '#131822');
    poly(g, box(0, 0, RW, RH), true); g.fillStyle = fg; g.fill();
    g.strokeStyle = 'rgba(10,14,22,0.45)'; g.lineWidth = Math.max(1, s * 0.12);
    for (let y = 6.25; y < RH; y += 6.25) { poly(g, [[0, y], [RW, y]]); g.stroke(); }
    for (let i = 0, x = 11; i < 40; i++, x = (x * 37 + 23) % RW) { const y = (i % 16) * 6.25; poly(g, [[x, y], [x, y + 6.25]]); g.stroke(); }
    // the board that creaks is a board like any other. rug:
    g.lineWidth = Math.max(1, s * 0.18); g.strokeStyle = 'rgba(126,170,190,0.55)';
    shape(g, box(RUG.x, RUG.y, RUG.w, RUG.h), '#213646');
    shape(g, box(RUG.x + 2.5, RUG.y + 2.5, RUG.w - 5, RUG.h - 5), null);
    shape(g, [[RUG.x + RUG.w / 2, RUG.y + 6], [RUG.x + RUG.w - 8, RUG.y + RUG.h / 2], [RUG.x + RUG.w / 2, RUG.y + RUG.h - 6], [RUG.x + 8, RUG.y + RUG.h / 2]], '#27445a');
    for (let y = RUG.y + 1; y < RUG.y + RUG.h; y += 2) { poly(g, [[RUG.x - 1.6, y], [RUG.x, y]]); g.stroke(); poly(g, [[RUG.x + RUG.w, y], [RUG.x + RUG.w + 1.6, y]]); g.stroke(); }

    // shadows thrown outward from the one bulb in the middle of the ceiling
    g.fillStyle = 'rgba(6,9,15,0.42)';
    for (const q of list) {
      if (!q.on || q.kick) continue;
      const qx = q.k === 'c' ? q.x : q.x + q.w / 2, qy = q.k === 'c' ? q.y : q.y + q.h / 2;
      const dx = (qx - 80) * 0.035, dy = (qy - 50) * 0.035;
      if (q.k === 'c') disc(g, q.x + dx, q.y + dy, q.r + 0.4); else poly(g, box(q.x + dx, q.y + dy, q.w, q.h), true);
      g.fill();
    }
    g.strokeStyle = INK; g.lineWidth = Math.max(1.1, s * 0.22); g.lineJoin = 'round'; g.lineCap = 'round';
    // bed
    let o = O.bed;
    shape(g, box(o.x, o.y, o.w, o.h), '#3f556b');
    shape(g, box(o.x + 35, o.y + 3, 8, o.h - 6), '#a9bccf');
    shape(g, box(o.x, o.y, 31, o.h), '#4b667f');
    shape(g, [[o.x + 31, o.y], [o.x + 26, o.y + 9], [o.x + 31, o.y + 16]], '#5d7b96');
    // bedside table and its clock
    o = O.table; shape(g, box(o.x, o.y, o.w, o.h), '#394658');
    shape(g, box(CLOCK.x - 3, CLOCK.y - 2, 6, 4), '#10151d');
    glow(g, CLOCK.x, CLOCK.y, 3, '92,255,160', 0.5);
    g.strokeStyle = INK;
    // desk
    o = O.desk; shape(g, box(o.x, o.y, o.w, o.h), '#394658');
    shape(g, [[o.x + 6, o.y + 4], [o.x + 16, o.y + 3], [o.x + 17, o.y + 12], [o.x + 7, o.y + 13]], '#93a6ba');
    disc(g, o.x + 32, o.y + 8, 2.2); g.fillStyle = '#566a80'; g.fill(); g.stroke();
    disc(g, o.x + 32, o.y + 8, 1.3); g.stroke();
    // chair
    o = O.chair; shape(g, box(o.x, o.y, o.w, o.h), '#465870');
    shape(g, box(o.x, o.y + o.h - 2.4, o.w, 2.4), '#647b96');
    // wardrobe
    o = O.wardrobe; shape(g, box(o.x, o.y, o.w, o.h), '#333f50');
    poly(g, [[o.x + o.w / 2, o.y], [o.x + o.w / 2, o.y + o.h]]); g.stroke();
    if (O.wdoor.on) { const d = O.wdoor; shape(g, box(d.x, d.y, d.w, d.h), '#4a5a70'); }
    // armchair
    o = O.armchair; shape(g, box(o.x, o.y, o.w, o.h), '#3e5368');
    shape(g, box(o.x + 5.5, o.y + 4.5, o.w - 5.5, o.h - 9), '#4d6780');
    poly(g, [[o.x, o.y + 4.5], [o.x + 5.5, o.y + 4.5]]); g.stroke(); poly(g, [[o.x, o.y + o.h - 4.5], [o.x + 5.5, o.y + o.h - 4.5]]); g.stroke();
    // basket
    o = O.basket; disc(g, o.x, o.y, o.r); g.fillStyle = '#4a5566'; g.fill(); g.stroke();
    disc(g, o.x, o.y, o.r - 1.3); g.fillStyle = '#7f93a8'; g.fill(); g.stroke();
    shape(g, [[o.x - 3, o.y - 1], [o.x + 1, o.y - 3], [o.x + 3, o.y + 1], [o.x - 1, o.y + 3]], '#a9bccf');
    // lamp
    o = O.lamp; disc(g, o.x, o.y, o.r); g.fillStyle = '#8fa3b8'; g.fill(); g.stroke(); disc(g, o.x, o.y, 0.8); g.stroke();
    // shoes
    for (const sh of [O.shoeA, O.shoeB]) shape(g, oval(sh.x, sh.y, 2.3, 1.1, sh.a), '#0f141c');

    // walls, door, window, switch
    g.strokeStyle = '#5a6b82'; g.lineWidth = Math.max(2, s * 1.5);
    poly(g, box(-0.75, -0.75, RW + 1.5, RH + 1.5), true); g.stroke();
    g.strokeStyle = '#2a3342'; poly(g, [[-0.75, 35], [-0.75, 55]]); g.stroke();
    g.strokeStyle = '#9fb6cf'; g.lineWidth = Math.max(1, s * 0.5); poly(g, [[-0.75, 35.6], [-0.75, 54.4]]); g.stroke();
    g.strokeStyle = '#0a0e15'; g.lineWidth = Math.max(2, s * 1.5); poly(g, [[118, -0.75], [150, -0.75]]); g.stroke();
    g.strokeStyle = '#9fb6cf'; g.lineWidth = Math.max(1, s * 0.3);
    poly(g, [[118, -1.2], [150, -1.2]]); g.stroke(); poly(g, [[118, -0.3], [150, -0.3]]); g.stroke();
    g.strokeStyle = INK; g.lineWidth = Math.max(1.1, s * 0.22);
    shape(g, box(0, SW.y - 1.6, 1.3, 3.2), '#c7d6e6');
    glow(g, SW.x, SW.y, 3, '255,136,56', 0.6);
    if (goal === 'off') {
      const ph = calm.matches ? 0.5 : (T * 0.55) % 1;
      g.strokeStyle = `rgba(255,150,70,${(1 - ph) * 0.8})`; g.lineWidth = Math.max(1.2, s * 0.25);
      disc(g, SW.x, SW.y, 1.5 + ph * 5.5); g.stroke();
    }

    // what the night was, now that you can see it
    if (lastSeen.length && (trail.length || marks.length)) {
      g.setLineDash([s * 1.0, s * 1.25]); g.lineWidth = Math.max(1, s * 0.17);
      for (const q of lastSeen) {
        const now = O[q.id];
        if (!now) continue;
        const mx = memX(q), my = memY(q);
        const gap = Math.hypot(now.x - mx, now.y - my);
        if (!now.on || gap < 1.2) continue;
        g.strokeStyle = `rgba(170,158,240,${clamp(0.3 + gap * 0.07, 0.3, 0.9)})`; outline(g, q, mx - q.x, my - q.y);
        if (gap < 6) continue;
        const c0 = q.k === 'c' ? [mx, my] : [mx + q.w / 2, my + q.h / 2], c1 = now.k === 'c' ? [now.x, now.y] : [now.x + now.w / 2, now.y + now.h / 2];
        g.strokeStyle = 'rgba(170,158,240,0.5)'; poly(g, [c0, c1]); g.stroke();
      }
      g.setLineDash([]);
    }
    g.fillStyle = 'rgba(203,226,250,0.42)';
    for (const f of trail) {
      const k = f[3] ? 1 : -1, x = f[0] - Math.sin(f[2]) * 1.15 * k, y = f[1] + Math.cos(f[2]) * 1.15 * k;
      poly(g, oval(x, y, 1.25, 0.55, f[2]), true); g.fill();
    }
    g.strokeStyle = 'rgba(232,128,96,0.9)'; g.lineWidth = Math.max(1.2, s * 0.25);
    for (const p of bumps) {
      poly(g, [[p[0] - 1, p[1] - 1], [p[0] + 1, p[1] + 1]]); g.stroke(); poly(g, [[p[0] - 1, p[1] + 1], [p[0] + 1, p[1] - 1]]); g.stroke();
    }
    drawMarks(g, true, 1);

    // cat
    g.strokeStyle = INK; g.lineWidth = Math.max(1, s * 0.18);
    const ca = cat.a, cxh = Math.cos(ca), syh = Math.sin(ca);
    const tail = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; tail.push([cat.x - cxh * (2.6 + t * 4) - syh * Math.sin(t * 3 + (cat.moving ? T * 6 : 1)) * 1.2, cat.y - syh * (2.6 + t * 4) + cxh * Math.sin(t * 3 + (cat.moving ? T * 6 : 1)) * 1.2]); }
    g.strokeStyle = '#0d1118'; g.lineWidth = Math.max(1.5, s * 0.8); poly(g, tail); g.stroke();
    g.fillStyle = '#0d1118';
    poly(g, oval(cat.x, cat.y, 3.4, 2.1, ca), true); g.fill();
    disc(g, cat.x + cxh * 3.3, cat.y + syh * 3.3, 1.6); g.fill();
    for (const k of [-1, 1]) {
      const hx = cat.x + cxh * 3.6, hy = cat.y + syh * 3.6;
      poly(g, [[hx - syh * 1.5 * k, hy + cxh * 1.5 * k], [hx - syh * 0.4 * k, hy + cxh * 0.4 * k], [hx + cxh * 0.6 - syh * 1.9 * k + cxh * 0.2, hy + syh * 0.6 + cxh * 1.9 * k]], true); g.fill();
    }

    // you
    g.strokeStyle = INK; g.lineWidth = Math.max(1.1, s * 0.22);
    shape(g, oval(b.x, b.y, 1.9, BR, b.a), '#7d92a8');
    disc(g, b.x + Math.cos(b.a) * 0.5, b.y + Math.sin(b.a) * 0.5, 1.7); g.fillStyle = '#d5e2ef'; g.fill(); g.stroke();
  }

  function frame(now) {
    const t = now / 1000;
    const dt = Math.min(0.034, Math.max(0.001, t - (frame.last || t)));
    frame.last = t;
    update(dt);

    let vis = 1;
    if (phase === 'sleep') vis = sleepT < 2.3 ? clamp(1 - sleepT / 1.4, 0, 1) : clamp((sleepT - 3.2) / 1.6, 0, 1);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, vw, vh);
    if (litA >= 1) drawLit(ctx);
    else {
      drawDark(ctx, (1 - litA * 0.6) * vis);
      if (litA > 0) {
        lx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawLit(lx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = litA * litA; ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    if (pain > 0.01 && !lit) {
      const r = Math.hypot(vw, vh) / 2, gr = ctx.createRadialGradient(vw / 2, vh / 2, r * 0.35, vw / 2, vh / 2, r);
      gr.addColorStop(0, 'rgba(120,34,22,0)'); gr.addColorStop(1, `rgba(120,34,22,${pain * 0.45})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
