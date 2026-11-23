// Two in a bed
// The sleeper on the left breathes on their own clock. The right side is the
// visitor: hold to breathe in, let go to breathe out. Left alone, the right
// side breathes by itself and is pulled, slowly, into the sleeper's rhythm.
(() => {
  'use strict';
  const cv = document.getElementById('bed');
  const g = cv.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  let W = 0, H = 0, dpr = 1;

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', size);
  size();

  // ---- state -------------------------------------------------------------
  const wrap = (p) => p - Math.floor(p);
  const near = (d) => d - Math.round(d);            // phase difference in [-0.5, 0.5]
  const shape = (p) => p < 0.4 ? 0.5 - 0.5 * Math.cos(Math.PI * p / 0.4)
                               : 0.5 + 0.5 * Math.cos(Math.PI * (p - 0.4) / 0.6);

  const them = { p: 0.55, T: 4.9, v: 0, deep: 0, away: 0, awayTo: 0, wob: 0 };
  const you = { p: 0.1, T: 3.3, v: 0, held: false, manual: false, last: -99, lastDown: -99, touched: false };
  let sync = 0, drowsy = 0, restless = 0, t = 0, labelA = 0, label = 'hold', labelNext = 'hold';

  // ---- sound: two breaths made of filtered noise ---------------------------
  let ac = null, vThem = null, vYou = null, master = null, noise = null;
  function voice(pan) {
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
    src.loopStart = Math.random() * 2;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.value = 600;
    const a = ac.createGain(); a.gain.value = 0;
    const p = ac.createStereoPanner(); p.pan.value = pan;
    src.connect(f); f.connect(a); a.connect(p); p.connect(master);
    src.start();
    return { f, a };
  }
  function startSound() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b; }
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    vThem = voice(-0.55); vYou = voice(0.5);
  }
  function rustle() {
    if (!ac) return;
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const a = ac.createGain(); const n = ac.currentTime;
    a.gain.setValueAtTime(0, n);
    a.gain.linearRampToValueAtTime(0.5, n + 0.25);
    a.gain.linearRampToValueAtTime(0.12, n + 0.7);
    a.gain.linearRampToValueAtTime(0.4, n + 1.1);
    a.gain.linearRampToValueAtTime(0, n + 2.2);
    const p = ac.createStereoPanner(); p.pan.value = -0.5;
    src.connect(f); f.connect(a); a.connect(p); p.connect(master);
    src.start(n, Math.random()); src.stop(n + 2.4);
  }
  function breathe(vc, dv, loud) {
    if (!vc) return;
    const n = ac.currentTime;
    const amt = Math.min(1, Math.abs(dv) * 1.6);
    vc.a.gain.setTargetAtTime(amt * loud, n, 0.12);
    vc.f.frequency.setTargetAtTime(dv > 0 ? 1150 : 520, n, 0.2);
  }

  // ---- input ---------------------------------------------------------------
  function stir() {
    restless = 0; sync = 0; drowsy = Math.max(0, drowsy - 0.55);
    them.p = 0; them.deep = 1; them.wob = 1;
    them.awayTo = Math.min(1, them.awayTo + 0.55);
    rustle();
  }
  function down() {
    startSound();
    if (you.held) return;
    you.held = true; you.manual = true; you.touched = true;
    const gap = t - you.lastDown;
    if (gap < 1.5) { if (++restless >= 3) stir(); }
    else {
      restless = Math.max(0, restless - 1);
      if (gap < 12) {                           // a breath, not a first touch
        const d = near(them.p);                 // how far their in-breath is from yours
        sync += (Math.max(0, Math.cos(TAU * d)) ** 2 - sync) * 0.4;
        them.p = wrap(them.p - d * 0.22);       // they lean a little toward you, too
      }
    }
    if (drowsy > 0.5) drowsy = Math.max(0.5, drowsy - 0.12);
    you.lastDown = t; you.last = t;
  }
  function up() { if (!you.held) return; you.held = false; you.last = t; }

  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} down(); });
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) down(); } });
  addEventListener('keyup', (e) => { if (e.code === 'Space' || e.key === ' ') up(); });
  addEventListener('blur', up);

  // ---- simulation ----------------------------------------------------------
  function step(dt) {
    t += dt;
    // the sleeper
    const slow = 1 + them.deep * 0.7;
    const before = them.p;
    them.p = wrap(them.p + dt / (them.T * slow));
    if (them.p < before) them.deep = Math.max(0, them.deep - 1);
    const tv = shape(them.p) * (1 + them.deep * 0.9);
    const dThem = (tv - them.v) / dt; them.v = tv;
    them.wob = Math.max(0, them.wob - dt / 3.5);
    them.awayTo = Math.max(0, them.awayTo - dt / 90);
    them.away += (them.awayTo - them.away) * Math.min(1, dt * 0.8);

    // you
    const patience = 7 - 4 * drowsy;
    if (you.manual && !you.held && t - you.last > patience) {
      you.manual = false; you.p = 0; you.T = Math.max(2.6, Math.min(4.2, you.T));
    }
    const prev = you.v;
    if (you.manual) {
      const heavy = 1 - 0.45 * drowsy;
      if (you.held) you.v += (1.04 - you.v) * Math.min(1, dt * 1.5 * heavy);
      else you.v += (-0.03 - you.v) * Math.min(1, dt * 1.15 * heavy);
      you.v = Math.max(0, Math.min(1, you.v));
      sync = Math.max(0, sync - dt * 0.035);
    } else {
      const d = near(them.p - you.p);
      you.p = wrap(you.p + dt / you.T + dt * 0.055 * Math.sin(TAU * d));
      you.T += (them.T - you.T) * Math.min(1, dt * 0.035);
      you.v += (shape(you.p) - you.v) * Math.min(1, dt * 6);
      const s = (0.5 + 0.5 * Math.cos(TAU * d)) ** 3;
      sync += (s - sync) * Math.min(1, dt * 0.25);
    }
    const dYou = (you.v - prev) / dt;

    drowsy += (sync > 0.62 ? dt / 50 : -dt / 35);
    drowsy = Math.max(0, Math.min(1, drowsy));

    const hush = 1 - 0.55 * drowsy;
    breathe(vThem, dThem, 0.36 * hush);
    breathe(vYou, dYou, 0.3 * hush);

    // the word over your side
    labelNext = !you.touched ? 'hold' : you.manual ? (you.held ? 'in' : 'out') : '';
    if (labelNext !== label) { labelA -= dt * 5; if (labelA <= 0) { label = labelNext; labelA = 0; } }
    else labelA = Math.min(1, labelA + dt * 2.5);
  }

  // ---- drawing -------------------------------------------------------------
  function rr(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  function draw() {
    const tall = H > W * 1.15;
    const bedL = tall ? -W * 0.06 : W * 0.5 - Math.min(W * 0.44, H * 0.95);
    const bedR = W - bedL, bedW = bedR - bedL, cx = W / 2;
    const top = H * (tall ? 0.66 : 0.68);
    const HH = Math.min(H * 0.19, bedW * 0.24);
    const wd = bedW * 0.118;
    const sway = calm ? 0 : Math.sin(t * 9) * them.wob * them.wob * bedW * 0.012;
    const gap = bedW * (0.40 - 0.11 * drowsy);
    const x1 = cx - gap / 2 - them.away * bedW * 0.07 + sway;
    const x2 = cx + gap / 2;
    const a1 = HH * (0.92 + 0.13 * them.v + (calm ? 0 : 0.06 * them.wob));
    const a2 = HH * (0.86 + 0.13 * you.v);
    const w1 = wd * (1 + 0.05 * them.v), w2 = wd * (1 + 0.05 * you.v);
    const hump = (x) => {
      const u1 = (x - x1) / w1, u2 = (x - x2) / w2;
      const e = Math.min(1, (x - bedL) / (bedW * 0.05), (bedR - x) / (bedW * 0.05));
      return (a1 * Math.exp(-u1 * u1) + a2 * Math.exp(-u2 * u2)) + HH * 0.1 * Math.sqrt(Math.max(0, e)) - HH * 0.1;
    };

    // wall
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#171a36'); wall.addColorStop(1, '#232850');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);

    // street light through a window somewhere behind us, on the wall
    g.save();
    g.globalAlpha = 0.07 + 0.015 * Math.sin(t * 0.21);
    g.fillStyle = '#c9d2ff';
    const lx = W * 0.6, lw = Math.min(W * 0.26, 260), lh = lw * 1.25, ly = top - HH * 2.1 - lh * 0.75;
    g.transform(1, 0, -0.32, 1, 0, 0);
    const ox = ly * 0.32;
    g.fillRect(lx + ox, ly, lw * 0.47, lh * 0.47); g.fillRect(lx + ox + lw * 0.53, ly, lw * 0.47, lh * 0.47);
    g.fillRect(lx + ox, ly + lh * 0.53, lw * 0.47, lh * 0.47); g.fillRect(lx + ox + lw * 0.53, ly + lh * 0.53, lw * 0.47, lh * 0.47);
    g.restore();

    // headboard
    g.fillStyle = '#0f1126';
    rr(bedL + bedW * 0.02, top - HH * 1.75, bedW * 0.96, H, bedW * 0.03); g.fill();

    // pillows
    const pw = bedW * 0.36, ph = HH * 0.95;
    g.fillStyle = '#8f96bb';
    rr(cx - bedW * 0.2 - pw / 2 - them.away * bedW * 0.02, top - HH * 1.32, pw, ph, ph * 0.42); g.fill();
    g.fillStyle = '#9aa1c4';
    rr(cx + bedW * 0.2 - pw / 2, top - HH * 1.3, pw, ph, ph * 0.42); g.fill();
    // hair
    g.fillStyle = '#0b0a16';
    g.beginPath(); g.ellipse(x1 - sway * 0.5, top - HH * 0.86, wd * 0.62, HH * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a1a1c';
    g.beginPath(); g.ellipse(x2, top - HH * 0.8, wd * 0.6, HH * 0.3, 0, 0, TAU); g.fill();

    // the quilt
    const N = 90;
    g.beginPath();
    g.moveTo(bedL, H + 2);
    for (let i = 0; i <= N; i++) { const x = bedL + bedW * i / N; g.lineTo(x, top - hump(x)); }
    g.lineTo(bedR, H + 2); g.closePath();
    const q = g.createLinearGradient(0, top - HH, 0, H);
    q.addColorStop(0, '#b55f41'); q.addColorStop(1, '#7f3a2a');
    g.fillStyle = q; g.fill();

    g.save(); g.clip();
    // light falling across it
    g.globalAlpha = 0.09;
    g.fillStyle = '#dfe4ff';
    g.beginPath();
    g.moveTo(cx + bedW * 0.02, top - HH * 1.3); g.lineTo(cx + bedW * 0.2, top - HH * 1.3);
    g.lineTo(cx - bedW * 0.02, H); g.lineTo(cx - bedW * 0.28, H); g.closePath(); g.fill();
    g.globalAlpha = 1;
    // folds: the same outline, sinking and flattening down the bed
    g.lineWidth = Math.max(1.2, bedW * 0.0028); g.lineCap = 'round';
    const rows = 7, room = H - top;
    for (let k = 1; k <= rows; k++) {
      const f = k / (rows + 1);
      g.strokeStyle = `rgba(74,30,24,${0.55 - 0.3 * f})`;
      g.beginPath();
      for (let i = 2; i <= N - 2; i++) {
        const x = bedL + bedW * i / N;
        const y = top + room * f * f * 1.05 + HH * 0.2 * f - hump(x) * (1 - f) * (1 - f)
          + Math.sin(x / bedW * 21 + k * 2.4) * HH * 0.022 * (0.5 + f);
        if (i === 2) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();

    // falling asleep
    if (drowsy > 0) { g.fillStyle = `rgba(6,7,22,${0.72 * drowsy})`; g.fillRect(0, 0, W, H); }

    // the one word
    const la = labelA * (1 - drowsy * 0.9) * (label === 'hold' ? 0.55 + 0.2 * Math.sin(t * 1.3) : 0.85);
    if (label && la > 0.01) {
      const fs = Math.max(19, Math.min(30, bedW * 0.034));
      g.font = `italic ${fs}px "Snell Roundhand", "Apple Chancery", "Segoe Script", "URW Chancery L", cursive`;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = `rgba(244,220,198,${la})`;
      g.fillText(label, x2, top - hump(x2) - HH * 0.75 - fs * 0.6);
    }
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt > 0) { step(dt); draw(); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden) up(); });
  step(0.016); draw();
  requestAnimationFrame(frame);
})();
