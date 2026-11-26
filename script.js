// Nobody starts on the same note.
// Each tap brings a singer into the room. They sing the birthday song (the
// tune is in the public domain), each in their own key and a little late,
// lean toward each other as it goes on, and agree only on the last note.
(() => {
  'use strict';

  const canvas = document.getElementById('room');
  const g = canvas.getContext('2d');
  const sheet = document.getElementById('sheet');
  const hint = document.getElementById('hint');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = '"Arial Rounded MT Bold","Varela Round","Nunito",ui-rounded,"Trebuchet MS","Verdana",sans-serif';

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- the song -----------------------------------------------------------
  // [semitones from the tonic, beats, syllable, vowel, flags]
  const N = [
    [-5, .75, 'Hap', 'a'], [-5, .25, 'py ', 'i'], [-3, 1, 'birth', 'er'], [-5, 1, 'day ', 'e'], [0, 1, 'to ', 'u'], [-1, 2, 'you', 'u', 'b'],
    [-5, .75, 'Hap', 'a'], [-5, .25, 'py ', 'i'], [-3, 1, 'birth', 'er'], [-5, 1, 'day ', 'e'], [2, 1, 'to ', 'u'], [0, 2, 'you', 'u', 'b'],
    [-5, .75, 'Hap', 'a'], [-5, .25, 'py ', 'i'], [7, 1, 'birth', 'er', 'l'], [4, 1, 'day ', 'e'], [0, 1, 'dear ', 'i'], [-1, 1, '____', 'a', 'n'], [-3, 3, '__', 'er', 'nb'],
    [5, .75, 'Hap', 'a'], [5, .25, 'py ', 'i'], [4, 1, 'birth', 'er'], [0, 1, 'day ', 'e'], [2, 1, 'to ', 'u'], [0, 3, 'you', 'u', 'f']
  ].map((n) => ({ semi: n[0], beats: n[1], syl: n[2], vowel: n[3], flags: n[4] || '' }));
  const LINES = [[0, 5], [6, 11], [12, 18], [19, 24]];
  const BEAT = 0.62;
  let acc = 0;
  for (const n of N) { n.at = acc; acc += n.beats; }
  const LAST = N.length - 1;
  const HOLD = 1.5; // extra seconds on the last note

  const FORM = {
    a: [750, 1200, 2500], i: [300, 2250, 2900], er: [480, 1350, 2500],
    e: [450, 1900, 2550], u: [340, 850, 2300]
  };
  const MOUTH = { a: [.36, .36], i: [.44, .14], er: [.3, .24], e: [.4, .22], u: [.2, .24] };
  const NAMES = ['Sam', 'Sammy', 'Sa-am', 'Samuel', 'Grandad', 'Dad', 'mate', 'you-ou', 'mm-mm', 'him', 'Stan?', 'Sam', 'Pam', 'Mr S', 'dar-ling', 'Sam', 'Uncle Sam', 'thingy'];
  const COLOURS = ['#ffd23f', '#ff6b9d', '#ff8c42', '#4cc9f0', '#f4f1de', '#b8f35d', '#ff5a4f', '#9be7d8'];
  const CHORD = [0, 4, 7, 0, -5, 4, 12, 0, 7, -8];

  // ---- state --------------------------------------------------------------
  let W = 0, H = 0, D = 1;
  const singers = [];
  const MAX = 28;
  let state = 'idle'; // idle | singing | after
  let song = null;
  let candles = 1;
  let lit = true, light = 1;
  let afterUntil = 0;
  let puffs = [];
  let ctx = null, master = null, fx = null, noise = null;
  const baseHz = 261.63 * Math.pow(2, Math.floor(rnd(-2, 3)) / 12);

  const now = () => (ctx ? ctx.currentTime : performance.now() / 1000);

  function size() {
    D = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * D); canvas.height = Math.round(H * D);
  }
  window.addEventListener('resize', size);
  size();

  const headR = () => clamp(Math.min(W, H) * 0.06, 21, 40);
  const cake = () => {
    const w = Math.min(W * 0.5, 250);
    return { x: W / 2, y: H - 34, w, h: w * 0.3 };
  };

  // ---- audio --------------------------------------------------------------
  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.01; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(comp);
    fx = ctx.createGain(); fx.gain.value = 0.5; fx.connect(comp);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const s of singers) voice(s);
  }

  function voice(s) {
    if (!ctx || s.osc) return;
    const t = ctx.currentTime;
    s.osc = ctx.createOscillator(); s.osc.type = 'sawtooth'; s.osc.frequency.value = baseHz * Math.pow(2, s.reg);
    const lfo = ctx.createOscillator(); lfo.frequency.value = rnd(4.6, 6.2);
    s.vib = ctx.createGain(); s.vib.gain.value = rnd(5, 14);
    lfo.connect(s.vib); s.vib.connect(s.osc.detune);
    s.out = ctx.createGain(); s.out.gain.value = 0;
    s.f = [6, 9, 12].map((q, i) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.value = FORM.a[i] * s.tract;
      const a = ctx.createGain(); a.gain.value = [1, 0.55, 0.22][i];
      s.osc.connect(f); f.connect(a); a.connect(s.out); return f;
    });
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 520;
    const bg = ctx.createGain(); bg.gain.value = 0.16;
    s.osc.connect(body); body.connect(bg); bg.connect(s.out);
    const pan = ctx.createStereoPanner(); pan.pan.value = clamp((s.fx - 0.5) * 1.7, -0.9, 0.9);
    s.out.connect(pan); pan.connect(master);
    s.osc.start(t); lfo.start(t);
  }

  function level() {
    if (!ctx) return;
    master.gain.setTargetAtTime(0.75 / Math.sqrt(Math.max(1, singers.length)), ctx.currentTime, 0.2);
  }

  function hz(s, semi) { return baseHz * Math.pow(2, s.reg + semi / 12); }

  function sing(s, i, t) {
    const n = N[i];
    const dur = n.beats * BEAT;
    const ev = { t, end: t + dur, vowel: n.vowel, name: n.flags.includes('n') && i === 17, final: false };
    if (i === 18) ev.nameTail = true;
    if (s.osc) {
      let semi = n.semi + s.off + rnd(-0.12, 0.12);
      if (n.flags.includes('l') && s.weak) semi -= s.weak;
      const t0 = Math.max(t, ctx.currentTime);
      s.osc.frequency.setTargetAtTime(hz(s, semi), t0, 0.035);
      FORM[n.vowel].forEach((F, k) => s.f[k].frequency.setTargetAtTime(F * s.tract, t0, 0.025));
      if (t - 0.05 > ctx.currentTime) s.out.gain.setTargetAtTime(s.vol * 0.08, t - 0.05, 0.014);
      s.out.gain.setTargetAtTime(s.vol, t0, 0.03);
      if (n.flags.includes('b')) s.out.gain.setTargetAtTime(0, t + dur * 0.8, 0.06);
      if (n.flags === 'f') {
        // the one note everybody finds
        s.osc.frequency.setTargetAtTime(hz(s, s.chord), t0 + 0.3, 0.2);
        s.vib.gain.setTargetAtTime(22, t0 + 0.6, 0.5);
        s.out.gain.setTargetAtTime(s.vol * 1.15, t0 + 0.5, 0.3);
        s.out.gain.setTargetAtTime(0, song.rel + s.tail, 0.11);
        s.vib.gain.setTargetAtTime(s.vib0, song.rel + s.tail + 0.5, 0.1);
      }
    }
    if (n.flags.includes('b')) ev.end = t + dur * 0.86;
    if (n.flags === 'f') { ev.final = true; ev.end = song.rel + s.tail + 0.1; }
    s.ev.push(ev);
    if (s.ev.length > 6) s.ev.shift();
    s.off *= 0.87;
    s.lag *= 0.9;
  }

  function schedule() {
    if (state !== 'singing' || !song) return;
    const t = now();
    for (const s of singers) {
      while (s.next <= LAST) {
        const nt = song.t0 + N[s.next].at * BEAT + s.lag + s.jit;
        if (nt > t + 0.3) break;
        sing(s, s.next, nt);
        s.jit = rnd(-0.025, 0.03);
        s.next++;
      }
    }
  }
  setInterval(schedule, 40);

  function clap(t, x) {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(900, 2600); f.Q.value = 1.4;
    const a = ctx.createGain(); a.gain.setValueAtTime(rnd(0.25, 0.6), t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    const p = ctx.createStereoPanner(); p.pan.value = x;
    src.connect(f); f.connect(a); a.connect(p); p.connect(fx);
    src.start(t, Math.random() * 0.9, 0.08);
  }

  function blow(t) {
    if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const a = ctx.createGain(); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.9, t + 0.12); a.gain.linearRampToValueAtTime(0, t + 0.55);
    src.connect(f); f.connect(a); a.connect(fx); src.start(t, 0, 0.6);
    const n = Math.min(220, singers.length * 14 + 6);
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      clap(t + 0.55 + u * u * 3.2 + Math.random() * 0.3, rnd(-0.9, 0.9));
    }
  }

  // ---- people -------------------------------------------------------------
  function reroll(s, solo) {
    const o = rnd(0.7, 3.4) * (Math.random() < 0.5 ? -1 : 1);
    s.off = solo ? 0 : o;
    s.lag = solo ? 0 : rnd(-0.06, 0.3);
    s.jit = 0;
    s.tail = rnd(0, 0.28);
    s.ev = [];
    s.name = pick(NAMES);
  }

  function place(x, y) {
    const r = headR(), c = cake();
    x = clamp(x, r + 6, W - r - 6);
    y = clamp(y, Math.min(H * 0.45, 96 + r * 2.6), H - r * 1.4 - 8);
    for (let k = 0; k < 14; k++) {
      for (const o of singers) {
        const dx = x - o.fx * W, dy = y - o.fy * H, d = Math.hypot(dx, dy) || 1, m = r * 1.75;
        if (d < m) { x += dx / d * (m - d) * 0.6 + rnd(-1, 1); y += dy / d * (m - d) * 0.6; }
      }
      const cx = x - c.x, cy = y - (c.y - c.h * 0.9), rx = c.w * 0.62 + r, ry = c.h * 1.5 + r;
      const e = (cx * cx) / (rx * rx) + (cy * cy) / (ry * ry);
      if (e < 1) { const s = 1 / Math.sqrt(e || 0.01); x = c.x + cx * s; y = c.y - c.h * 0.9 + cy * s; if (y > H - r) y = H - r * 2; }
      if (x < 78 + r && y > H - 78 - r) { x += 8; y -= 8; }
      x = clamp(x, r + 6, W - r - 6);
      y = clamp(y, Math.min(H * 0.45, 96 + r * 2.6), H - r * 1.4 - 8);
    }
    return [x, y];
  }

  function add(x, y) {
    audio();
    if (singers.length < MAX) {
      const p = place(x, y);
      const kind = Math.random();
      const reg = kind < 0.4 ? -1 : kind < 0.88 ? 0 : 1;
      const i = singers.length;
      const s = {
        fx: p[0] / W, fy: p[1] / H, reg,
        tract: reg < 0 ? 0.9 : reg > 0 ? 1.22 : 1.04,
        scale: reg < 0 ? 1.1 : reg > 0 ? 0.74 : 1,
        vol: rnd(0.5, 0.95), weak: Math.random() < 0.35 ? rnd(0.8, 2) : 0,
        chord: reg > 0 ? 0 : CHORD[i % CHORD.length] - (reg === 0 && CHORD[i % CHORD.length] === 12 ? 0 : 0),
        colour: COLOURS[(i * 3 + Math.floor(rnd(0, 2))) % COLOURS.length],
        hat: Math.random() < 0.45 ? pick(COLOURS) : null,
        born: now(), seed: Math.random() * 10, ev: [], next: LAST + 1
      };
      if (s.reg === 0 && s.chord === 12) s.chord = 0;
      reroll(s, false);
      singers.push(s);
      voice(s);
      s.vib0 = s.vib ? s.vib.gain.value : 8;
      level();
      if (state === 'singing') join(s);
    }
    if (state === 'idle') start();
    hint.classList.add('off');
  }

  function join(s) {
    const t = now() + 0.3;
    let i = 0;
    while (i <= LAST && song.t0 + N[i].at * BEAT + s.lag < t) i++;
    if (i > LAST) {
      // too late for anything but the good bit
      if (t < song.rel - 0.4) { s.lag = 0; sing(s, LAST, t); }
      s.next = LAST + 1;
    } else s.next = i;
  }

  function start() {
    const t = now();
    const solo = singers.length === 1;
    song = { t0: t + 0.85, rel: 0 };
    song.rel = song.t0 + (N[LAST].at + N[LAST].beats) * BEAT + HOLD;
    let longest = singers[Math.floor(rnd(0, singers.length))];
    for (const s of singers) { reroll(s, solo); s.next = 0; }
    if (singers.length > 2) longest.tail = 0.95; // one never knows when to stop
    state = 'singing';
    drawnLine = -2;
  }

  // ---- lyric sheet --------------------------------------------------------
  let drawnLine = -2, drawnIdx = -2, spans = [];
  function showLine(li) {
    sheet.textContent = '';
    spans = [];
    const [a, b] = LINES[li];
    for (let i = a; i <= b; i++) {
      const sp = document.createElement('span');
      sp.textContent = N[i].syl;
      if (N[i].flags.includes('n')) sp.className = 'blank';
      sheet.appendChild(sp); spans.push(sp);
    }
    drawnLine = li; drawnIdx = -2;
  }
  function lyric(t) {
    let idx = -1;
    if (state === 'singing') {
      const b = (t - song.t0) / BEAT;
      for (let i = 0; i <= LAST; i++) if (N[i].at <= b) idx = i;
    }
    let li = 0;
    if (state === 'after') { li = 3; idx = LAST + 1; }
    else for (let k = 0; k < 4; k++) if (idx >= LINES[k][0]) li = k;
    if (li !== drawnLine) showLine(li);
    if (idx !== drawnIdx) {
      const a = LINES[li][0];
      spans.forEach((sp, k) => {
        const blank = sp.classList.contains('blank');
        sp.className = (a + k < idx ? 'sung' : a + k === idx ? 'now' : '') + (blank ? ' blank' : '');
      });
      drawnIdx = idx;
    }
  }
  showLine(0);

  // ---- drawing ------------------------------------------------------------
  function shade(hex, k) {
    const v = parseInt(hex.slice(1), 16);
    const c = [v >> 16, (v >> 8) & 255, v & 255].map((x) => Math.round(x * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function drawCake(t) {
    const c = cake();
    const top = c.y - c.h;
    // plate
    g.fillStyle = '#e8efe9';
    g.beginPath(); g.ellipse(c.x, c.y, c.w * 0.62, c.h * 0.2, 0, 0, 7); g.fill();
    // sponge
    g.fillStyle = '#c9773d';
    g.beginPath(); g.roundRect(c.x - c.w / 2, top, c.w, c.h, [8, 8, 14, 14]); g.fill();
    // icing with drips
    g.fillStyle = '#fff3f6';
    g.beginPath();
    g.moveTo(c.x - c.w / 2, top + c.h * 0.3);
    g.lineTo(c.x - c.w / 2, top + 6); g.quadraticCurveTo(c.x - c.w / 2, top - 4, c.x - c.w / 2 + 10, top - 4);
    g.lineTo(c.x + c.w / 2 - 10, top - 4); g.quadraticCurveTo(c.x + c.w / 2, top - 4, c.x + c.w / 2, top + 6);
    g.lineTo(c.x + c.w / 2, top + c.h * 0.3);
    const drips = 7;
    for (let i = drips; i > 0; i--) {
      const x1 = c.x - c.w / 2 + (c.w * i) / drips, x0 = x1 - c.w / drips;
      const dp = c.h * (0.38 + 0.2 * Math.abs(Math.sin(i * 2.3)));
      g.bezierCurveTo(x1 - 2, top + dp, x0 + 2, top + dp, x0, top + c.h * 0.3);
    }
    g.fill();
    g.fillStyle = '#ff6b9d';
    g.beginPath(); g.roundRect(c.x - c.w / 2, c.y - c.h * 0.2, c.w, c.h * 0.09, 3); g.fill();
    // candles
    const n = candles, gap = c.w * 0.84 / Math.max(n, 5);
    const ch = c.h * 0.62, cw = Math.max(4, Math.min(8, gap * 0.4));
    for (let i = 0; i < n; i++) {
      const x = c.x + (i - (n - 1) / 2) * gap;
      g.fillStyle = COLOURS[(i * 3 + 3) % COLOURS.length];
      g.fillRect(x - cw / 2, top - 4 - ch, cw, ch);
      g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, top - 4 - ch); g.lineTo(x, top - 9 - ch); g.stroke();
      if (light > 0.5 && lit) {
        const fl = calm ? 0 : Math.sin(t * 5.1 + i * 1.9) * 0.5 + Math.sin(t * 8.3 + i) * 0.3;
        const fh = c.h * 0.3 * (1 + fl * 0.12), fy = top - 9 - ch;
        g.fillStyle = '#ffb627';
        g.beginPath(); g.moveTo(x + fl * 1.6, fy - fh);
        g.quadraticCurveTo(x + fh * 0.42, fy - fh * 0.25, x, fy);
        g.quadraticCurveTo(x - fh * 0.42, fy - fh * 0.25, x + fl * 1.6, fy - fh); g.fill();
        g.fillStyle = '#fff6c9';
        g.beginPath(); g.ellipse(x, fy - fh * 0.25, fh * 0.11, fh * 0.2, 0, 0, 7); g.fill();
      }
    }
    return { n, gap, top: top - 9 - ch };
  }

  function current(s, t) {
    let e = null;
    for (const v of s.ev) if (v.t <= t) e = v;
    return e;
  }

  function drawSinger(s, t, c) {
    const r = headR() * s.scale;
    const x = s.fx * W;
    let y = s.fy * H;
    const e = current(s, t);
    const open = e && t < e.end;
    const sinceNote = e ? t - e.t : 9;
    const arrive = Math.min(1, (t - s.born) / 0.35);
    let bob = 0, tilt = 0;
    if (!calm) {
      if (state === 'singing' && e) { bob = -Math.exp(-sinceNote * 5) * r * 0.16; tilt = Math.sin(t * 1.7 + s.seed) * 0.06; }
      if (state === 'after' && !lit) bob = -Math.abs(Math.sin(t * 7 + s.seed * 3)) * r * 0.14;
      if (e && e.final && open) { bob = -r * 0.12 * Math.min(1, sinceNote); tilt = -0.1 * Math.min(1, sinceNote) * (s.fx < 0.5 ? -1 : 1); }
    }
    y += bob + (1 - arrive) * r * 1.5;
    g.save();
    g.globalAlpha = arrive;
    // shoulders
    g.fillStyle = shade(s.colour, 0.62);
    g.beginPath(); g.ellipse(x, y + r * 1.75, r * 1.25, r * 0.95, 0, Math.PI, 0); g.fill();
    g.translate(x, y); g.rotate(tilt);
    if (s.hat) {
      g.fillStyle = s.hat === s.colour ? '#f4f1de' : s.hat;
      g.beginPath(); g.moveTo(-r * 0.5, -r * 0.82); g.lineTo(r * 0.12, -r * 1.95); g.lineTo(r * 0.62, -r * 0.74); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.12, -r * 1.95, r * 0.13, 0, 7); g.fill();
    }
    g.fillStyle = s.colour;
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    // eyes look at the cake
    const dx = c.x - x, dy = c.y - c.h - y, d = Math.hypot(dx, dy) || 1;
    const lx = (dx / d) * r * 0.1, ly = (dy / d) * r * 0.08;
    g.fillStyle = g.strokeStyle = '#2a0d12'; g.lineWidth = Math.max(2, r * 0.09); g.lineCap = 'round';
    const shut = (e && e.final && open && sinceNote > 0.5) || (state === 'after' && !lit);
    for (const sx of [-1, 1]) {
      if (shut) { g.beginPath(); g.arc(sx * r * 0.36 + lx, -r * 0.14, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else { g.beginPath(); g.arc(sx * r * 0.36 + lx, -r * 0.2 + ly, r * 0.085, 0, 7); g.fill(); }
    }
    // mouth
    if (open) {
      let m = MOUTH[e.vowel];
      if (e.final) m = [0.3, 0.42];
      const k = Math.min(1, sinceNote / 0.06);
      g.beginPath(); g.ellipse(lx * 0.5, r * 0.4, r * m[0], r * m[1] * k, 0, 0, 7); g.fill();
      if (e.vowel === 'a' || e.final) { g.fillStyle = '#ff5a6a'; g.beginPath(); g.ellipse(lx * 0.5, r * (0.4 + m[1] * 0.55), r * m[0] * 0.55, r * m[1] * 0.35 * k, 0, 0, 7); g.fill(); }
    } else {
      g.beginPath(); g.arc(lx * 0.5, r * 0.25, r * 0.36, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
    g.restore();
    // what they call the birthday person
    if (e && (e.name || e.nameTail)) {
      const first = s.ev.find((v) => v.name);
      const a = first ? t - first.t : 0;
      const al = clamp(a / 0.1, 0, 1) * clamp((first ? 3 * BEAT + 0.9 - a : 0) / 0.5, 0, 1);
      if (al > 0) {
        g.globalAlpha = al;
        g.font = `700 ${Math.round(clamp(r * 0.62, 12, 22))}px ${FONT}`;
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        const ty = y - r * (s.hat ? 2.25 : 1.3) - (calm ? 0 : a * 6);
        const tx = clamp(x, g.measureText(s.name).width / 2 + 6, W - g.measureText(s.name).width / 2 - 6);
        g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = '#0d3a2c'; g.strokeText(s.name, tx, ty);
        g.fillStyle = '#fff'; g.fillText(s.name, tx, ty);
        g.globalAlpha = 1;
      }
    }
  }

  function frame() {
    const t = now();
    // transitions
    if (state === 'singing' && t > song.rel + 0.75) {
      state = 'after'; lit = false; afterUntil = t + 5.2;
      blow(ctx ? ctx.currentTime : 0);
      const c = cake();
      const gap = c.w * 0.84 / Math.max(candles, 5);
      puffs = [];
      for (let i = 0; i < candles; i++) puffs.push({ x: c.x + (i - (candles - 1) / 2) * gap, y: c.y - c.h - 9 - c.h * 0.62, t, s: Math.random() * 6 });
    }
    if (state === 'after' && t > afterUntil) {
      state = 'idle'; lit = true; candles = Math.min(13, candles + 1);
      for (const s of singers) s.ev = [];
      hint.textContent = singers.length < MAX ? 'one more candle. tap to bring someone else' : 'one more candle. tap, everyone is here';
      hint.classList.remove('off');
    }
    light += ((lit ? 1 : 0) - light) * (calm ? 0.04 : 0.07);
    lyric(t);

    g.setTransform(D, 0, 0, D, 0, 0);
    g.fillStyle = '#0d3a2c'; g.fillRect(0, 0, W, H);
    const c = cake();
    const gl = g.createRadialGradient(c.x, c.y - c.h * 2, 0, c.x, c.y - c.h * 2, Math.max(W, H) * 0.75);
    gl.addColorStop(0, `rgba(255,190,90,${0.34 * light})`);
    gl.addColorStop(0.35, `rgba(240,160,70,${0.13 * light})`);
    gl.addColorStop(1, 'rgba(240,160,70,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);

    const order = singers.slice().sort((a, b) => a.fy - b.fy);
    for (const s of order) drawSinger(s, t, c);
    drawCake(t);
    // smoke
    for (const p of puffs) {
      const a = t - p.t - 0.35;
      if (a < 0 || a > 3) continue;
      g.strokeStyle = `rgba(230,240,235,${0.5 * (1 - a / 3)})`; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y);
      for (let k = 1; k <= 8; k++) { const u = (k / 8) * Math.min(1, a) * 46; g.lineTo(p.x + Math.sin(u * 0.16 + p.s + (calm ? 0 : a)) * (3 + u * 0.12), p.y - u); }
      g.stroke();
    }
    // the room dims when the candles go
    if (light < 0.995) { g.fillStyle = `rgba(4,20,15,${0.42 * (1 - light)})`; g.fillRect(0, 0, W, H); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- input --------------------------------------------------------------
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); add(e.clientX, e.clientY); });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); add(rnd(40, W - 40), rnd(120, H - 120)); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
})();
