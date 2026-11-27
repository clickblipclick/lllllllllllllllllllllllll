// 16. Please use the paths provided
//
// A quadrangle laid out to an approved plan, and the people who cross it.
// Every walker steers down a travel-time field solved over the lawn by fast
// marching (one field per door and per temperament); fresh grass costs a
// little more than paving and worn grass a little less than fresh, so the
// routes people take are the routes people took. The visitor is the Estates
// Office and may pave, fence, put up notices, returf and remove.
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cv = $("quad");
  const g = cv.getContext("2d");
  const groundEl = $("ground");
  const office = $("office");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const KEY = "l16-estate-2";
  const BIG = 1e9;
  const DAYLEN = 80;          // seconds of simulation per day
  const DAYLIGHT = 70;        // of which 06:00 to 22:00
  const METRE = 0.8;          // one cell
  const DAYNAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const PLACE = ["the Library", "Science", "the Halls", "the Canteen", "the Lodge", "the Gym"];
  const ROOF = ["LIBRARY", "SCIENCE", "HALLS", "CANTEEN", "LODGE", "GYM"];
  const COATS = ["#27365f", "#c33b2b", "#e2b02c", "#f3efe4", "#356650", "#1c1c1e", "#74487f", "#d06f27", "#5d7fa6", "#8a8f93"];
  const BROLLY = ["#c33b2b", "#1c1c1e", "#27365f", "#e2b02c", "#f3efe4", "#356650", "#1c1c1e", "#d87ea0"];

  // cell types
  const GRASS = 0, PLAN = 1, EXTRA = 2, SOLID = 3, WATER = 4, BED = 5, TRUNK = 6;

  let W = 0, H = 0, N = 0;
  let type, wear, track, fence, fresh, signFx, foot, turfDay, done, cost;
  let geo = null;
  let fields = null;
  let heapK, heapI, hn = 0;

  // ---- state that is saved -------------------------------------------------
  let simT = 0, snow = 0, wet = 0;
  let signs = [];
  let rails = {};
  let memos = [];
  let fired = {};
  let st = null;
  const freshStats = () => ({
    journeys: 0, clean: 0, spent: 0, conceded: 0, lifted: 0, turfed: 0,
    signsPut: 0, used: 0, recent: [], pair: new Array(36).fill(0),
    bareAtThanks: -1, lastMemoT: -99,
  });

  // ---- world ---------------------------------------------------------------
  function alloc(w, h) {
    W = w; H = h; N = W * H;
    type = new Uint8Array(N); wear = new Float32Array(N); track = new Float32Array(N);
    fence = new Uint8Array(N); fresh = new Float32Array(N); signFx = new Float32Array(N);
    foot = new Float32Array(N); turfDay = new Uint16Array(N); done = new Uint8Array(N);
    cost = new Float32Array(N);
    heapK = new Float32Array(N * 6); heapI = new Int32Array(N * 6);
    fields = [];
    for (let c = 0; c < 3; c++) {
      fields.push([]);
      for (let d = 0; d < 6; d++) fields[c].push(new Float32Array(N));
    }
  }

  function layPlan() {
    const m = Math.min(W, H);
    const dep = Math.round(m * 0.12), sd = Math.round(m * 0.09);
    const bw = Math.round(W * 0.25), bh = Math.round(H * 0.2), gh = Math.round(H * 0.24);
    const r = Math.round;
    const lx = r(W * 0.25), sx = r(W * 0.76), hx = r(W * 0.2), kx = r(W * 0.72);
    const ly = r(H * 0.5), gy = r(H * 0.43);
    const blds = [
      { x0: lx - (bw >> 1), y0: -3, x1: lx + (bw >> 1), y1: dep, door: [lx, dep], side: 0 },
      { x0: sx - (bw >> 1), y0: -3, x1: sx + (bw >> 1), y1: dep, door: [sx, dep], side: 0 },
      { x0: hx - (bw >> 1), y0: H - dep, x1: hx + (bw >> 1), y1: H + 3, door: [hx, H - dep - 1], side: 2 },
      { x0: kx - (bw >> 1), y0: H - dep, x1: kx + (bw >> 1), y1: H + 3, door: [kx, H - dep - 1], side: 2 },
      { x0: -3, y0: ly - (bh >> 1), x1: sd, y1: ly + (bh >> 1), door: [sd, ly], side: 3 },
      { x0: W - dep, y0: gy - (gh >> 1), x1: W + 3, y1: gy + (gh >> 1), door: [W - dep - 1, gy], side: 1 },
    ];
    const X0 = sd + 5, X1 = W - dep - 6, Y0 = dep + 5, Y1 = H - dep - 6;
    const CX = r(W / 2), CY = r(H / 2);
    const set = (x, y, t, only) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x;
      if (only !== undefined && type[i] !== only) return;
      type[i] = t;
    };
    for (const b of blds) for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) set(x, y, SOLID);
    const hline = (y, a, b) => { for (let x = Math.min(a, b); x <= Math.max(a, b); x++) for (let k = -1; k <= 1; k++) set(x, y + k, PLAN, GRASS); };
    const vline = (x, a, b) => { for (let y = Math.min(a, b); y <= Math.max(a, b); y++) for (let k = -1; k <= 1; k++) set(x + k, y, PLAN, GRASS); };
    hline(Y0, X0, X1); hline(Y1, X0, X1); vline(X0, Y0, Y1); vline(X1, Y0, Y1);
    vline(CX, Y0, Y1); hline(CY, X0, X1);
    vline(lx, dep, Y0); vline(sx, dep, Y0); vline(hx, Y1, H - dep - 1); vline(kx, Y1, H - dep - 1);
    hline(ly, sd, X0); hline(gy, X1, W - dep - 1);
    const pr = Math.max(4, r(m * 0.06));
    for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) {
      const d = Math.hypot(x, y);
      if (d <= pr + 0.3) set(CX + x, CY + y, PLAN, GRASS);
    }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (Math.hypot(x, y) < 1.3) set(CX + x, CY + y, SOLID);

    const q = (a, b, t) => a + (b - a) * t;
    // pond, north-east lawn
    const pond = { x: q(CX, X1, 0.52), y: q(Y0, CY, 0.5), rx: (X1 - CX) * 0.25, ry: (CY - Y0) * 0.27 };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - pond.x) / pond.rx, dy = (y + 0.5 - pond.y) / pond.ry;
      const wob = 1 + 0.12 * Math.sin(Math.atan2(dy, dx) * 3 + 1);
      if (dx * dx + dy * dy < wob * wob) set(x, y, WATER, GRASS);
    }
    // dahlia bed, south-west lawn
    const bed = { x: q(X0, CX, 0.52), y: q(CY, Y1, 0.52), hx: (CX - X0) * 0.2, hy: (Y1 - CY) * 0.13 };
    for (let y = Math.floor(bed.y - bed.hy); y <= bed.y + bed.hy; y++)
      for (let x = Math.floor(bed.x - bed.hx); x <= bed.x + bed.hx; x++) set(x, y, BED, GRASS);
    // trees
    const tr = (m * 0.055);
    const trees = [
      [q(X0, CX, 0.42), q(Y0, CY, 0.36), 1.15], [q(X0, CX, 0.64), q(Y0, CY, 0.6), 0.95], [q(X0, CX, 0.27), q(Y0, CY, 0.66), 1.0],
      [q(CX, X1, 0.42), q(CY, Y1, 0.42), 1.1], [q(CX, X1, 0.7), q(CY, Y1, 0.64), 0.9],
      [q(CX, X1, 0.2), q(Y0, CY, 0.78), 0.8], [q(X0, CX, 0.82), q(CY, Y1, 0.2), 0.85],
    ].map(([x, y, k], i) => ({ x: r(x) + 0.5, y: r(y) + 0.5, r: tr * k, seed: i * 1.7 + 0.3 }));
    for (const t of trees) set(Math.floor(t.x), Math.floor(t.y), TRUNK, GRASS);
    const lamps = [[X0 - 2.2, Y0 - 2.2], [X1 + 3.2, Y0 - 2.2], [X0 - 2.2, Y1 + 3.2], [X1 + 3.2, Y1 + 3.2],
      [CX + 2.8, Y0 - 2.2], [CX - 1.8, Y1 + 3.2], [X0 - 2.2, CY + 2.8], [X1 + 3.2, CY - 1.8], [CX + pr + 1.5, CY + pr + 1.5]];
    geo = { blds, X0, X1, Y0, Y1, CX, CY, pr, pond, bed, trees, lamps, dep, sd,
      doors: blds.map((b) => ({ x: b.door[0], y: b.door[1], i: b.door[1] * W + b.door[0] })) };
  }

  function newWorld(w, h) {
    alloc(w, h);
    layPlan();
    simT = 2; snow = 0; wet = 0; signs = []; rails = {}; memos = []; fired = {}; st = freshStats();
  }

  // ---- saving --------------------------------------------------------------
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  function save() {
    try {
      const w8 = new Uint8Array(N);
      for (let i = 0; i < N; i++) w8[i] = Math.round(wear[i] * 255);
      localStorage.setItem(KEY, JSON.stringify({
        W, H, simT, snow, wet, signs, rails, memos: memos.slice(0, 60), fired, st,
        type: b64(type), wear: b64(w8), fence: b64(fence),
      }));
    } catch (e) { /* storage full or refused: the estate simply forgets */ }
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!o || !(o.W > 20 && o.H > 20 && o.W * o.H < 40000)) return false;
      const t = unb64(o.type), w8 = unb64(o.wear), f = unb64(o.fence);
      if (t.length !== o.W * o.H || w8.length !== t.length || f.length !== t.length) return false;
      alloc(o.W, o.H);
      layPlan();
      type.set(t); fence.set(f);
      for (let i = 0; i < N; i++) wear[i] = w8[i] / 255;
      simT = +o.simT || 2; snow = +o.snow || 0; wet = +o.wet || 0;
      signs = Array.isArray(o.signs) ? o.signs : [];
      rails = (o.rails && typeof o.rails === "object") ? o.rails : {};
      memos = Array.isArray(o.memos) ? o.memos : [];
      fired = o.fired || {};
      st = Object.assign(freshStats(), o.st || {});
      if (!Array.isArray(st.pair) || st.pair.length !== 36) st.pair = new Array(36).fill(0);
      if (!Array.isArray(st.recent)) st.recent = [];
      return true;
    } catch (e) { return false; }
  }

  // ---- travel-time fields (fast marching) -----------------------------------
  function hpush(k, i) {
    if (hn >= heapK.length) return;
    let p = hn++;
    while (p > 0) {
      const q = (p - 1) >> 1;
      if (heapK[q] <= k) break;
      heapK[p] = heapK[q]; heapI[p] = heapI[q]; p = q;
    }
    heapK[p] = k; heapI[p] = i;
  }
  function hpop() {
    const top = heapI[0];
    hn--;
    if (hn > 0) {
      const k = heapK[hn], i = heapI[hn];
      let p = 0;
      for (;;) {
        let c = 2 * p + 1;
        if (c >= hn) break;
        if (c + 1 < hn && heapK[c + 1] < heapK[c]) c++;
        if (heapK[c] >= k) break;
        heapK[p] = heapK[c]; heapI[p] = heapI[c]; p = c;
      }
      heapK[p] = k; heapI[p] = i;
    }
    return top;
  }
  function relax(j, out) {
    const c = cost[j];
    if (c >= 1e8) return;
    const x = j % W;
    let a = BIG, b = BIG;
    if (x > 0 && done[j - 1]) a = out[j - 1];
    if (x < W - 1 && done[j + 1] && out[j + 1] < a) a = out[j + 1];
    if (j >= W && done[j - W]) b = out[j - W];
    if (j < N - W && done[j + W] && out[j + W] < b) b = out[j + W];
    if (a > b) { const t = a; a = b; b = t; }
    const u = (b - a >= c) ? a + c : 0.5 * (a + b + Math.sqrt(2 * c * c - (a - b) * (a - b)));
    if (u < out[j]) { out[j] = u; hpush(u, j); }
  }
  function march(src, out) {
    out.fill(BIG); done.fill(0); hn = 0;
    out[src] = 0; hpush(0, src);
    while (hn) {
      const i = hpop();
      if (done[i]) continue;
      done[i] = 1;
      const x = i % W;
      if (x > 0 && !done[i - 1]) relax(i - 1, out);
      if (x < W - 1 && !done[i + 1]) relax(i + 1, out);
      if (i >= W && !done[i - W]) relax(i - W, out);
      if (i < N - W && !done[i + W]) relax(i + W, out);
    }
  }
  // c: 0 ordinary, 1 law-abiding, 2 late
  function buildCost(c) {
    const snowy = snow > 0.5;
    for (let i = 0; i < N; i++) {
      const t = type[i];
      let v;
      if (t === SOLID || t === WATER || t === TRUNK) { cost[i] = BIG; continue; }
      if (c === 2) v = t === BED ? 1.2 : 1;
      else if (snowy) v = 1 + 0.75 * (1 - track[i]);
      else if (t === PLAN || t === EXTRA) v = 1;
      else {
        const w = wear[i];
        v = 1.02 + (c ? 1.7 : 0.3) * (1 - w) + wet * 0.75 * w + (c ? 3 : 0.1) * signFx[i];
        if (t === BED) { if (c) v = BIG; else v += 2.2 * (1 - w); }
      }
      const f = fence[i];
      if (f) { if (f === 255) v += 0.15; else if (c === 1) v = BIG; else v += c === 2 ? 4 : 20; }
      cost[i] = v;
    }
  }
  const lateDirty = [true, true, true, true, true, true];
  let jobPtr = 0;
  function runJob() {
    for (let d = 0; d < 6; d++) if (lateDirty[d]) {
      buildCost(2); march(geo.doors[d].i, fields[2][d]); lateDirty[d] = false; return;
    }
    const j = jobPtr++ % 12, c = j < 6 ? 0 : 1, d = j % 6;
    buildCost(c); march(geo.doors[d].i, fields[c][d]);
  }
  function structureChanged() { lateDirty.fill(true); fenceList = null; }

  // ---- clock and weather ---------------------------------------------------
  const dayOf = (t) => Math.floor(t / DAYLEN);
  function hourOf(t) {
    const d = t % DAYLEN;
    return d < DAYLIGHT ? 6 + 16 * d / DAYLIGHT : (22 + 8 * (d - DAYLIGHT) / (DAYLEN - DAYLIGHT)) % 24;
  }
  const isNight = (t) => t % DAYLEN >= DAYLIGHT;
  function rainAt(t) {
    const d = dayOf(t) % 7, h = hourOf(t);
    if (isNight(t)) return 0;
    const ramp = (a, b) => Math.max(0, Math.min(1, (h - a) * 2, (b - h) * 2));
    if (d === 1) return ramp(12.6, 16);
    if (d === 4) return ramp(7.6, 10.6);
    return 0;
  }
  const snowingAt = (t) => dayOf(t) % 7 === 2 && isNight(t);
  const thawingAt = (t) => { const d = dayOf(t) % 7; return !(d === 2 && isNight(t)) && !(d === 3 && !isNight(t) && hourOf(t) < 12.5); };
  function darkAt(t) {
    const d = t % DAYLEN;
    if (d >= DAYLIGHT) return 1;
    const dusk = DAYLIGHT - 9;
    if (d > dusk) return (d - dusk) / 9;
    if (d < 4) return 0.45 * (1 - d / 4);
    return 0;
  }
  const weekend = (t) => dayOf(t) % 7 >= 5;

  // ---- people --------------------------------------------------------------
  let walkers = [];
  let dog = null;
  let spawnAcc = 0;
  const OD = [
    { o: [0.3, 0.3, 4, 1, 3, 0.3], d: [3, 3, 0.3, 1, 0.3, 1.3] },
    { o: [2, 2, 1.5, 3, 1, 1], d: [1, 1, 1, 5, 0.6, 0.6] },
    { o: [3, 3, 0.6, 1.5, 0.4, 1.5], d: [0.6, 0.6, 3, 1, 2.5, 2.2] },
    { o: [1, 1, 1.5, 2, 1, 2], d: [0.4, 0.2, 3, 1.2, 2.5, 0.4] },
  ];
  function pick(wts, skip) {
    let s = 0;
    for (let i = 0; i < 6; i++) if (i !== skip) s += wts[i];
    let r = Math.random() * s;
    for (let i = 0; i < 6; i++) if (i !== skip) { r -= wts[i]; if (r <= 0) return i; }
    return skip === 5 ? 4 : 5;
  }
  function spawn() {
    const h = hourOf(simT);
    const p = OD[h < 11 ? 0 : h < 14 ? 1 : h < 18.5 ? 2 : 3];
    const o = pick(p.o, -1), d = pick(p.d, o);
    const rr = Math.random();
    const raining = rainAt(simT) > 0.3;
    const cls = rr < 0.2 ? 1 : rr < (raining ? 0.42 : 0.3) ? 2 : 0;
    const door = geo.doors[o];
    walkers.push(person(door.x + 0.5 + (Math.random() - 0.5) * 0.8, door.y + 0.5 + (Math.random() - 0.5) * 0.8, o, d, cls));
  }
  function person(x, y, o, d, cls) {
    return {
      x, y, vx: 0, vy: 0, o, d, cls, pt: null,
      sp: (cls === 2 ? 9.5 : cls === 1 ? 4.6 : 6) * (0.85 + Math.random() * 0.3),
      coat: COATS[(Math.random() * COATS.length) | 0], brolly: Math.random() < 0.72 ? BROLLY[(Math.random() * BROLLY.length) | 0] : null,
      off: 0, wob: 0, stuck: 0, age: 0, last: -1, hx: 1, hy: 0,
    };
  }
  // In fair weather, at lunchtime, some people go and sit on the lawn,
  // which is the one thing it is for.
  let loungers = [];
  const RUGS = ["#c9483a", "#e9dfc4", "#2f4f7a", "#d9a53a", "#7c9a6a"];
  function sittingWeather() {
    const h = hourOf(simT);
    return !isNight(simT) && rainAt(simT) < 0.05 && wet < 0.25 && snow < 0.05 && (weekend(simT) ? h > 10 && h < 17 : h > 11.6 && h < 15.2);
  }
  function sendLounger() {
    const o = (Math.random() * 6) | 0, door = geo.doors[o];
    for (let tries = 0; tries < 10; tries++) {
      const tx = geo.X0 + 3 + Math.random() * (geo.X1 - geo.X0 - 6), ty = geo.Y0 + 3 + Math.random() * (geo.Y1 - geo.Y0 - 6);
      const ti = (ty | 0) * W + (tx | 0);
      if (type[ti] !== GRASS || wear[ti] > 0.12) continue;
      let ok = true;
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 2], [-2, -2], [2, -2], [-2, 2]]) { const j = ti + ax + ay * W; if (j < 0 || j >= N || type[j] !== GRASS || wear[j] > 0.2) ok = false; }
      const dx = tx - door.x - 0.5, dy = ty - door.y - 0.5, L = Math.hypot(dx, dy);
      for (let k = 2; ok && k < L; k += 0.5) {
        const i = ((door.y + 0.5 + dy * k / L) | 0) * W + ((door.x + 0.5 + dx * k / L) | 0);
        if (type[i] === SOLID || type[i] === WATER || type[i] === TRUNK || (fence[i] && fence[i] !== 255)) ok = false;
      }
      if (!ok) continue;
      const w = person(door.x + 0.5, door.y + 0.5, o, o, 0);
      w.pt = { x: tx, y: ty }; w.sp *= 0.8;
      walkers.push(w);
      return;
    }
  }
  function stepLoungers(dt) {
    const ok = sittingWeather();
    let n = 0;
    for (const l of loungers) {
      l.t -= dt * (ok ? 1 : 6);
      if (l.t > 0) { loungers[n++] = l; continue; }
      const w = person(l.x, l.y, l.o, pick(OD[2].d, -1), 0);
      w.coat = l.coat; w.off = 9;
      walkers.push(w);
    }
    loungers.length = n;
    if (ok && loungers.length < 12 && Math.random() < dt * 0.7) sendLounger();
  }
  function spawnRate() {
    const h = hourOf(simT);
    if (isNight(simT)) return 0.12;
    let r = h < 7.2 ? 0.5 : h < 19 ? 1.5 : 0.7;
    if (weekend(simT)) return r * 0.3;
    for (const b of [8.7, 12.4, 17]) if (h >= b && h < b + 1.1) r += 5.5;
    return r * (1 - 0.25 * rainAt(simT));
  }
  const blocked = (i, cls) => {
    const t = type[i];
    if (t === SOLID || t === WATER || t === TRUNK) return true;
    return cls === 1 && fence[i] > 0 && fence[i] !== 255;
  };
  function stepWalker(w, dt) {
    w.age += dt;
    const cx = w.x | 0, cy = w.y | 0, ci = cy * W + cx;
    const door = geo.doors[w.d];
    let ddx = door.x + 0.5 - w.x, ddy = door.y + 0.5 - w.y;
    if (w.pt) {
      ddx = w.pt.x - w.x; ddy = w.pt.y - w.y;
      if (ddx * ddx + ddy * ddy < 0.6 || w.age > 60) {
        if (w.age <= 60 && type[ci] === GRASS) {
          loungers.push({ x: w.x, y: w.y, o: w.o, t: 13 + Math.random() * 20, coat: w.coat, rug: RUGS[(Math.random() * RUGS.length) | 0], rot: Math.random() * 3, two: Math.random() < 0.4 ? COATS[(Math.random() * COATS.length) | 0] : null });
          st.sat = (st.sat || 0) + 1;
          return false;
        }
        w.pt = null; w.d = pick(OD[2].d, -1);
        return true;
      }
    } else if (ddx * ddx + ddy * ddy < 1.7) return finish(w);
    const f = fields[w.cls][w.d];
    const d0 = w.pt ? 1 : f[ci];
    let ax, ay;
    if (w.pt) { const k = Math.hypot(ddx, ddy) || 1; ax = ddx / k; ay = ddy / k; }
    else if (d0 >= 1e8) {
      w.stuck += dt;
      if (w.stuck > 4 && w.cls === 1) { w.cls = 0; w.stuck = 0; }
      if (w.stuck > 9) return false;
      ax = 0; ay = 0;
    } else {
      const up = d0 + 2.5;
      const l = cx > 0 ? Math.min(f[ci - 1], up) : up, r = cx < W - 1 ? Math.min(f[ci + 1], up) : up;
      const u = cy > 0 ? Math.min(f[ci - W], up) : up, d = cy < H - 1 ? Math.min(f[ci + W], up) : up;
      ax = l - r; ay = u - d;
      const n = Math.hypot(ax, ay);
      if (n < 1e-4 || d0 < 3) { const k = Math.hypot(ddx, ddy) || 1; ax = ddx / k; ay = ddy / k; } else { ax /= n; ay /= n; }
      w.wob += (Math.random() - 0.5) * dt * 3.2 - w.wob * dt * 0.9;
      const c = Math.cos(w.wob), s = Math.sin(w.wob);
      const tx = ax * c - ay * s; ay = ax * s + ay * c; ax = tx;
    }
    const fz = fence[ci];
    const climbing = fz > 0 && fz !== 255;
    let sp = w.sp * (climbing ? 0.28 : 1) * (snow > 0.5 ? 0.85 : 1);
    const k = Math.min(1, dt * 7);
    w.vx += (ax * sp - w.vx) * k; w.vy += (ay * sp - w.vy) * k;
    const nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    if (inb(nx, ny) && !blocked((ny | 0) * W + (nx | 0), w.cls)) { w.x = nx; w.y = ny; }
    else if (inb(nx, w.y) && !blocked(cy * W + (nx | 0), w.cls)) { w.x = nx; w.vy *= 0.5; }
    else if (inb(w.x, ny) && !blocked((ny | 0) * W + cx, w.cls)) { w.y = ny; w.vx *= 0.5; }
    else { w.vx *= -0.3; w.vy *= -0.3; w.wob = (Math.random() - 0.5) * 2; }
    const vv = Math.hypot(w.vx, w.vy);
    if (vv > 0.5) { w.hx += (w.vx / vv - w.hx) * k; w.hy += (w.vy / vv - w.hy) * k; }

    const ni = (w.y | 0) * W + (w.x | 0);
    const t = type[ni];
    if (ni !== w.last) {
      w.last = ni;
      const nf = fence[ni];
      if (nf > 0 && nf !== 255) {
        const left = nf - (w.cls === 2 ? 2 : 1);
        if (left <= 0) { fence[ni] = 255; structureChanged(); note("gap", ni); sfx("snap"); }
        else fence[ni] = left;
      }
    }
    if (snow > 0.3) {
      track[ni] = Math.min(1, track[ni] + dt * 1.6);
      const j = ni + ((Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 1 : W));
      if (j >= 0 && j < N) track[j] = Math.min(1, track[j] + dt * 0.5);
    }
    if (t === GRASS || t === BED) {
      w.off += dt;
      if (!w.pt) st.pair[w.o * 6 + w.d] += dt;
      const amt = dt * (w.pt ? 0.06 : 0.3) * (1 + 2.2 * wet) * (snow > 0.3 ? 0.2 : 1) * (t === BED ? 2.2 : 1);
      wear[ni] = Math.min(1, wear[ni] + amt);
      const j = ni + ((Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 1 : W));
      if (j >= 0 && j < N && (type[j] === GRASS || type[j] === BED)) wear[j] = Math.min(1, wear[j] + amt * 0.35);
      if (signFx[ni] > 0.03 && snow < 0.3) ignoreSign(w.x, w.y, dt);
    } else if (t === PLAN) foot[ni] += dt;
    return true;
  }
  function finish(w) {
    const clean = w.off < 0.7;
    st.journeys++;
    if (clean) st.clean++;
    st.recent.push(clean ? 1 : 0);
    if (st.recent.length > 80) st.recent.shift();
    return false;
  }
  function ignoreSign(x, y, dt) {
    let best = null, bd = 1e9;
    for (const s of signs) { const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y); if (d < bd) { bd = d; best = s; } }
    if (!best || best.str <= 0) return;
    best.ig += dt;
    const was = best.str;
    best.str = Math.max(0, 1 - best.ig / 40);
    if (best.str <= 0 && was > 0) { note("flat", (best.y | 0) * W + (best.x | 0)); signsDirty = true; }
  }
  let signsDirty = true;
  function paintSigns() {
    signFx.fill(0);
    const R = 7;
    for (const s of signs) {
      if (s.str <= 0) continue;
      for (let y = Math.max(0, (s.y | 0) - R); y <= Math.min(H - 1, (s.y | 0) + R); y++)
        for (let x = Math.max(0, (s.x | 0) - R); x <= Math.min(W - 1, (s.x | 0) + R); x++) {
          const d = Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y);
          if (d < R) { const v = s.str * (1 - d / R); const i = y * W + x; if (v > signFx[i]) signFx[i] = v; }
        }
    }
    signsDirty = false;
  }

  function stepDog(dt) {
    const d7 = dayOf(simT) % 7, h = hourOf(simT);
    const want = (d7 === 2 || d7 === 5 || d7 === 6) && !isNight(simT) && h > 9 && h < 18.5 && snow < 0.3;
    if (!dog) {
      if (want && Math.random() < dt * 0.5) {
        const dr = geo.doors[4];
        dog = { x: dr.x + 1.5, y: dr.y + 0.5, tx: geo.CX, ty: geo.CY, hx: 1, hy: 0, rest: 0, home: false, swim: false };
        note("dog", 0);
      }
      return;
    }
    if (!want && !dog.home) { dog.home = true; dog.tx = geo.doors[4].x + 0.5; dog.ty = geo.doors[4].y + 0.5; dog.rest = 0; }
    if (dog.rest > 0) { dog.rest -= dt; return; }
    const dx = dog.tx - dog.x, dy = dog.ty - dog.y, d = Math.hypot(dx, dy);
    if (d < 1) {
      if (dog.home) { dog = null; return; }
      const r = Math.random();
      if (r < 0.25) { dog.tx = geo.pond.x; dog.ty = geo.pond.y; }
      else if (r < 0.6 && walkers.length) { const w = walkers[(Math.random() * walkers.length) | 0]; dog.tx = w.x; dog.ty = w.y; }
      else { dog.tx = geo.X0 + 3 + Math.random() * (geo.X1 - geo.X0 - 6); dog.ty = geo.Y0 + 3 + Math.random() * (geo.Y1 - geo.Y0 - 6); }
      dog.tx = Math.max(geo.X0, Math.min(geo.X1, dog.tx)); dog.ty = Math.max(geo.Y0, Math.min(geo.Y1, dog.ty));
      dog.rest = Math.random() < 0.4 ? 0.4 + Math.random() * 1.2 : 0;
      return;
    }
    const i = (dog.y | 0) * W + (dog.x | 0);
    dog.swim = type[i] === WATER;
    const sp = dog.swim ? 5 : 13;
    dog.x += dx / d * sp * dt; dog.y += dy / d * sp * dt;
    dog.hx += (dx / d - dog.hx) * Math.min(1, dt * 8); dog.hy += (dy / d - dog.hy) * Math.min(1, dt * 8);
    if (type[i] === GRASS || type[i] === BED) wear[i] = Math.min(1, wear[i] + dt * 0.05);
  }

  // slow processes, twice a second of simulated time
  let slowAcc = 0, bare = 0, bedLost = 0, gaps = 0, fenceLen = 0, planArea = 0, extraArea = 0;
  function slow(dt) {
    const wk = weekend(simT) ? 1.6 : 1;
    const k = 1 - dt / 420 * wk, sub = dt * 0.0003 * wk;
    const snowy = snow > 0.3;
    bare = 0; bedLost = 0; gaps = 0; fenceLen = 0; planArea = 0; extraArea = 0;
    const day = dayOf(simT);
    for (let i = 0; i < N; i++) {
      const t = type[i];
      if (t === GRASS || t === BED) {
        let w = wear[i];
        if (w > 0) { w = w * k - sub; if (w < 0) w = 0; wear[i] = w; }
        if (w > 0.55) {
          if (t === GRASS) bare++; else bedLost++;
          if (turfDay[i]) { note("turfgone", i, day + 1 - turfDay[i]); turfDay[i] = 0; }
        }
        if (fresh[i] > 0) fresh[i] = Math.max(0, fresh[i] - dt / 45);
      } else if (t === PLAN) planArea++; else if (t === EXTRA) extraArea++;
      if (fence[i]) { fenceLen++; if (fence[i] === 255) gaps++; }
      if (!snowy && track[i] > 0) track[i] = 0;
    }
  }

  // ---- memoranda -----------------------------------------------------------
  const pending = [];
  function note(kind, cell, extra) { pending.push({ kind, cell, extra }); }
  function nearestPlace(cell) {
    const x = cell % W, y = (cell / W) | 0;
    let b = 0, bd = 1e9;
    geo.doors.forEach((d, i) => { const k = Math.hypot(d.x - x, d.y - y); if (k < bd) { bd = k; b = i; } });
    return PLACE[b];
  }
  function topPair() {
    const sums = [];
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) sums.push([st.pair[a * 6 + b] + st.pair[b * 6 + a], a, b]);
    sums.sort((p, q) => q[0] - p[0]);
    return sums;
  }
  const pairName = (p) => `${PLACE[p[1]]} and ${PLACE[p[2]]}`;
  const calDay = () => dayOf(simT) + (isNight(simT) && hourOf(simT) < 6 ? 1 : 0);
  const stamp = () => {
    const d = calDay(), h = hourOf(simT);
    return `${DAYNAMES[d % 7]}, week ${1 + Math.floor(d / 7)}, ${String(h | 0).padStart(2, "0")}.${String(((h % 1) * 60) | 0).padStart(2, "0")}`;
  };
  const queue = [];
  function memo(key, text) {
    if (key && fired[key]) return false;
    if (key) fired[key] = 1;
    queue.push(text);
    return true;
  }
  function issue() {
    if (!queue.length || simT - st.lastMemoT < 3.5) return;
    st.lastMemoT = simT;
    const m = { n: (memos[0] ? memos[0].n : 0) + 1, when: stamp(), text: queue.shift() };
    memos.unshift(m);
    showMemo(m, true);
    sfx("memo");
  }
  function showMemo(m, isNew) {
    const li = document.createElement("li");
    const ref = document.createElement("span");
    ref.className = "ref";
    const b = document.createElement("b");
    b.textContent = `No. ${m.n}`;
    ref.append(b, ` · ${m.when}`);
    const p = document.createElement("p");
    p.textContent = m.text;
    li.append(ref, p);
    if (isNew) { li.className = "new"; $("memos").prepend(li); } else $("memos").append(li);
  }
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const money = (v) => "£" + Math.round(v).toLocaleString("en-GB");
  const area = (cells) => Math.round(cells * METRE * METRE).toLocaleString("en-GB") + " m²";

  function review() {
    const d = dayOf(simT), d7 = d % 7, h = hourOf(simT), night = isNight(simT);
    memo("open", "The quadrangle has been laid out to the approved plan. All users are asked to use the paths provided. Should it prove necessary, the Office has paving, fencing, notices and turf at its disposal.");
    for (const n of pending.splice(0)) {
      if (n.kind === "gap") {
        if (!memo("gap1", `A rail is missing from the fence near ${nearestPlace(n.cell)}. The gap is exactly the width of one person.`) && gaps >= 3)
          memo("gap3", `The fence now has ${gaps + 1} gaps in it. It is being reclassified as a row of posts.`);
      } else if (n.kind === "flat") memo("flat" + (st.flatN = (st.flatN || 0) + 1), st.flatN === 1
        ? `The notice near ${nearestPlace(n.cell)} has been found face down in the strip it referred to. This is being treated as weather.`
        : st.flatN === 2 ? "A second notice is down. The Office is no longer treating it as weather." : `Notice number ${st.flatN} is down. No further comment will be issued about notices.`);
      else if (n.kind === "dog") memo("dog", "A dog has been seen on the estate, in the pond, and on the grass. Dogs are to be kept on leads. The Office does not know whose it is. It appears to be everyone’s.");
      else if (n.kind === "turfgone") memo("turfgone", `The new turf near ${nearestPlace(n.cell)} lasted ${n.extra <= 1 ? "less than a day" : n.extra + " days"}.`);
    }
    const pairs = topPair();
    if (bare > 14 && pairs[0][0] > 0) memo("strip1", `A worn strip has been observed in the lawn between ${pairName(pairs[0])}. It is not a path, and is not to be referred to as a path.`);
    if (bare > 110) memo("strip2", "The strip has widened. Users are reminded that grass is not a surface.");
    if (bare > 260 && pairs[2][0] > 0) memo("strip3", `There are now several such strips, the worst between ${pairName(pairs[0])} and between ${pairName(pairs[1])}. Seen from the upper floor of the Library they make a more convenient plan than the plan.`);
    if (bare > 520) memo("strip4", "The Office has been asked whether the strips could simply be paved. The question has been noted. The lawn is the point of the quadrangle.");
    if (bedLost > 10) memo("bed", "The Office notes with sorrow the condition of the dahlias, which stood in the straight line between two doors.");
    if (st.signsPut > 0) memo("sign1", "A notice reading KEEP OFF THE GRASS has been erected. This should resolve the matter.");
    if (st.signsPut >= 5) memo("sign5", "There are now five notices. A sixth, asking users to read the notices, is under consideration.");
    if (fenceLen > 6) memo("fence1", "A post-and-rail fence has been installed for the protection of the lawn. Users will find that it is now quicker to go round.");
    if (fired.acrossPath === 0) { delete fired.acrossPath; memo("across", "A fence has been placed across one of the paths provided, in order to protect it."); }
    if (st.turfed > 12) memo("turf1", `The affected ground has been returfed, at ${money(st.turfed * 9)}. Users are asked to give it a chance.`);
    if (st.lifted > 14) memo("lift", "A length of the approved plan has been lifted on the Office’s own instruction. No complaint has been received, and none is expected.");
    if (st.spent > 20000) memo("spend", `Expenditure on protecting the lawn now stands at ${money(st.spent)}. The lawn’s own position is unchanged.`);
    if (rainAt(simT) > 0.8 && bare > 30) memo("rain", "Rain. Users are avoiding the mud in the strip by walking beside it. That is now also mud.");
    else if (rainAt(simT) > 0.8) memo("rain0", "Rain. The estate is under umbrellas, none of which has changed direction.");
    if (night && d === 0) memo("night", "After dark the paths provided are lit. The other ones are shorter, and are also used.");
    if (d >= 1 && h > 9.5 && !night) memo("statue", "The statue of the Founder continues to be walked around. It is the only instruction on the estate that is universally obeyed.");
    if (d7 === 3 && snow > 0.6 && h > 9.3 && !night) {
      if (memo("snow", "Snow overnight, covering lawn and paving alike. By nine every route on the estate had been drawn across it by the people who needed one. None of them is ours.")) st.snowDay = d;
      else if (d !== st.snowDay) memo("snow" + d, "Snow again. The same lines, in the same places. See earlier memorandum.");
    }
    if (fired.snow && d7 === 3 && snow < 0.05 && h > 13) memo("thaw", "Thaw. The lines in the snow have gone. The Office kept a photograph, for enforcement purposes, and has since been asked for a copy by the architects.");
    if (d >= 2 && h > 15 && !night) {
      let unused = 0, all = 0;
      for (let i = 0; i < N; i++) if (type[i] === PLAN) { all++; if (foot[i] < 0.02) unused++; }
      memo("unused", unused / all >= 0.12
        ? `Of the paving laid to the approved plan, ${pct(unused, all)}% has yet to be stepped on by anyone. It remains in excellent condition.`
        : "Every part of the approved plan has now been stepped on at least once. The Office notes that most of it was being crossed at the time, not followed.");
    }
    if (st.journeys >= 260) memo("count", `${pct(st.clean, st.journeys)}% of journeys so far have been made entirely on the paths provided. The Office regards this as a foundation.`);
    if ((st.sat || 0) >= 4) memo("sit", "In fair weather, at lunchtime, a number of users sit on the lawn. This is permitted. It is the only thing the lawn is for, and it is the one use of it that nobody has ever needed to be told about.");
    if (d7 === 5 && h > 10 && !night) memo("sat", "Saturday. Hardly anyone is in. The grass has begun, slightly, to come back, and there is nobody here to be told.");
    if (d >= 3 && h > 17 && !st.used) memo("idle", "The Office has taken no action this week. The estate is no worse for it, which is being looked into.");
    if (st.conceded > 22) memo("concede", `Following a review, a new path is to be provided between ${pairName(pairs[0])}. Its line was arrived at by the Office independently.`);
    const rec = st.recent.length >= 50 ? st.recent.reduce((a, b) => a + b, 0) / st.recent.length : 0;
    if (fired.concede && rec >= 0.8 && snow < 0.1) {
      if (memo("thanks", `${Math.round(rec * 100)}% of recent journeys were made on the paths provided. The Office thanks all users for their cooperation, and notes that the policy has worked.`)) st.bareAtThanks = bare;
    }
    if (fired.thanks && st.bareAtThanks >= 0 && bare > st.bareAtThanks + 24) memo("bend", "A worn strip has been observed across the inside corner of the new path. It is not a path.");
    if (st.conceded > 160) memo("concede2", "The supplementary paths now carry more feet than the approved plan. The plan is to be redrawn to show that this was always the plan.");
  }

  // ---- works (the visitor's tools) ------------------------------------------
  let tool = null;
  function stamp1(kind, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const disc = (r, fn) => {
      for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r) fn(yy * W + xx);
      }
    };
    if (kind === "pave") disc(1.35, (i) => {
      if (type[i] !== GRASS && type[i] !== BED) return;
      if (wear[i] > 0.4) st.conceded++;
      type[i] = EXTRA; wear[i] = 0; fresh[i] = 0; turfDay[i] = 0; st.spent += 90; changed = true;
      if (fence[i]) { fence[i] = 0; delete rails[i]; }
    });
    else if (kind === "turf") disc(2.4, (i) => {
      if (type[i] !== GRASS && type[i] !== BED) return;
      if (wear[i] > 0.25) { st.turfed++; st.spent += 9; turfDay[i] = dayOf(simT) + 1; }
      if (wear[i] > 0.05) fresh[i] = 1;
      wear[i] = 0;
    });
    else if (kind === "lift") {
      disc(1.6, (i) => {
        if (fence[i]) { fence[i] = 0; delete rails[i]; changed = true; }
        if (type[i] === EXTRA) { type[i] = GRASS; wear[i] = 0.85; st.spent += 20; changed = true; }
        else if (type[i] === PLAN && !isDoor(i)) { type[i] = GRASS; wear[i] = 1; st.lifted++; st.spent += 20; changed = true; }
      });
      const n = signs.length;
      signs = signs.filter((s) => Math.hypot(s.x - x, s.y - y) > 2.2);
      if (signs.length !== n) signsDirty = true;
    } else if (kind === "fence") {
      const i = (y | 0) * W + (x | 0);
      const t = type[i];
      if (t === SOLID || t === WATER || t === TRUNK || isDoor(i)) return;
      if (fence[i] && fence[i] !== 255) return;
      fence[i] = 5; st.spent += 38; changed = true;
      // remember where on the drawn line this cell's length of rail lies
      const ux = seg.x1 - seg.x0, uy = seg.y1 - seg.y0, L2 = ux * ux + uy * uy;
      if (L2 > 0.3) {
        const tt = Math.max(0, Math.min(1, (((x | 0) + 0.5 - seg.x0) * ux + ((y | 0) + 0.5 - seg.y0) * uy) / L2));
        rails[i] = [+(seg.x0 + ux * tt).toFixed(2), +(seg.y0 + uy * tt).toFixed(2), +Math.atan2(uy, ux).toFixed(2)];
      } else rails[i] = [(x | 0) + 0.5, (y | 0) + 0.5, seg.a];
      if (t === PLAN || t === EXTRA) { if (!fired.across) fired.acrossPath = 0; }
    } else if (kind === "sign") {
      const i = (y | 0) * W + (x | 0);
      if (type[i] !== GRASS && type[i] !== BED) return;
      if (signs.length >= 14) signs.shift();
      signs.push({ x: (x | 0) + 0.5, y: (y | 0) + 0.5, str: 1, ig: 0, tilt: Math.random() < 0.5 ? -1 : 1 });
      st.signsPut++; st.spent += 65; signsDirty = true; sfx("thunk");
    }
  }
  const isDoor = (i) => geo.doors.some((d) => Math.abs(d.x - i % W) <= 1 && Math.abs(d.y - ((i / W) | 0)) <= 1);
  let changed = false;
  const seg = { x0: 0, y0: 0, x1: 0, y1: 0, a: 0 };
  function work(kind, x0, y0, x1, y1) {
    changed = false;
    seg.x0 = x0; seg.y0 = y0; seg.x1 = x1; seg.y1 = y1;
    if (Math.hypot(x1 - x0, y1 - y0) > 0.3) seg.a = +Math.atan2(y1 - y0, x1 - x0).toFixed(2);
    st.used++;
    if (kind === "sign") stamp1(kind, x1, y1);
    else if (kind === "fence") {
      // four-connected line of cells so that nothing can slip through a corner
      let cx = x0 | 0, cy = y0 | 0; const ex = x1 | 0, ey = y1 | 0;
      const dx = Math.abs(ex - cx), dy = Math.abs(ey - cy), sx = cx < ex ? 1 : -1, sy = cy < ey ? 1 : -1;
      let err = dx - dy, guard = 0;
      stamp1(kind, cx, cy);
      while ((cx !== ex || cy !== ey) && guard++ < 600) {
        if (2 * err > -dy && cx !== ex) { err -= dy; cx += sx; } else if (cy !== ey) { err += dx; cy += sy; } else { cx += sx; }
        stamp1(kind, cx, cy);
      }
    } else {
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 0.5));
      for (let k = 0; k <= n; k++) stamp1(kind, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
    }
    if (changed) structureChanged();
    groundDirty = true;
  }

  // ---- sound: a bell at the change of lessons, and small noises of works ----
  let ac = null, bellOn = true, master = null;
  function wake() {
    if (ac || !bellOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    } catch (e) { ac = null; }
  }
  function tone(f, t0, dur, vol, kind) {
    const o = ac.createOscillator(), v = ac.createGain();
    o.type = kind || "sine"; o.frequency.value = f;
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(v); v.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function sfx(kind) {
    if (!ac || !bellOn || ac.state !== "running" || pace > 4) return;
    const t = ac.currentTime + 0.01;
    if (kind === "bell") {
      for (let k = 0; k < 3; k++) { const t0 = t + k * 0.62; tone(660, t0, 1.5, 0.05); tone(660 * 2.76, t0, 0.9, 0.018); tone(660 * 5.4, t0, 0.35, 0.008); tone(330, t0, 1.8, 0.02); }
    } else if (kind === "thunk") { tone(140, t, 0.12, 0.12, "triangle"); tone(90, t + 0.09, 0.1, 0.1, "triangle"); }
    else if (kind === "snap") { tone(900, t, 0.03, 0.06, "square"); tone(260, t + 0.02, 0.09, 0.07, "triangle"); }
    else if (kind === "memo") { tone(1900, t, 0.03, 0.018, "square"); tone(1500, t + 0.05, 0.03, 0.014, "square"); }
    else if (kind === "lay") tone(300 + Math.random() * 60, t, 0.04, 0.035, "triangle");
  }

  // ---- drawing the ground --------------------------------------------------
  let GK = 3, gcv = null, gg = null, img = null, noise = null, groundDirty = true;
  let X0a, X1a, TXa;
  function makeGround() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pxPerCell = (view.s || 8) * dpr;
    GK = Math.max(2, Math.min(5, Math.round(pxPerCell / 2.2)));
    while (W * GK * H * GK > 330000 && GK > 2) GK--;
    gcv = document.createElement("canvas"); gcv.width = W * GK; gcv.height = H * GK;
    gg = gcv.getContext("2d");
    img = gg.createImageData(W * GK, H * GK);
    noise = new Uint8Array(W * GK * H * GK);
    let s = 12345;
    for (let i = 0; i < noise.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; noise[i] = s >>> 24; }
    const gw = W * GK;
    X0a = new Int32Array(gw); X1a = new Int32Array(gw); TXa = new Float32Array(gw);
    for (let sx = 0; sx < gw; sx++) {
      const fx = (sx + 0.5) / GK - 0.5; let x0 = Math.floor(fx); TXa[sx] = fx - x0;
      let x1 = x0 + 1; if (x0 < 0) x0 = 0; if (x1 > W - 1) x1 = W - 1;
      X0a[sx] = x0; X1a[sx] = x1;
    }
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    groundDirty = true;
  }
  const sm = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };
  function paintGround() {
    const K = GK, gw = W * K, gh = H * K, D = img.data;
    const sn = snow, wt = wet;
    for (let sy = 0; sy < gh; sy++) {
      const fy = (sy + 0.5) / K - 0.5; let y0 = Math.floor(fy); const ty = fy - y0;
      let y1 = y0 + 1; if (y0 < 0) y0 = 0; if (y1 > H - 1) y1 = H - 1;
      const cy = (sy / K) | 0, jy = sy % K === 0, r0 = y0 * W, r1 = y1 * W;
      for (let sx = 0; sx < gw; sx++) {
        const cx = (sx / K) | 0, ci = cy * W + cx, t = type[ci];
        const p = sy * gw + sx, nz = noise[p];
        const x0 = X0a[sx], x1 = X1a[sx], tx = TXa[sx];
        let r, gr, b;
        if (t === GRASS || t === TRUNK) {
          const w0 = wear[ci];
          const a = type[r0 + x0] ? w0 : wear[r0 + x0], b2 = type[r0 + x1] ? w0 : wear[r0 + x1];
          const c = type[r1 + x0] ? w0 : wear[r1 + x0], d = type[r1 + x1] ? w0 : wear[r1 + x1];
          let w = (a + (b2 - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
          if (w > 0.015) w += (nz - 128) * 0.0011;
          const stripe = (((cx + cy * 0.0) / 6) | 0) & 1;
          const n = (nz - 128) * 0.07;
          r = (stripe ? 171 : 160) + n; gr = (stripe ? 190 : 181) + n; b = (stripe ? 92 : 84) + n * 0.5;
          const fr = fresh[ci];
          if (fr > 0) { r += (116 - r) * fr * 0.7; gr += (178 - gr) * fr * 0.7; b += (74 - b) * fr * 0.7; }
          const f1 = sm(0.04, 0.42, w), f2 = sm(0.4, 0.92, w);
          r += (206 - r) * f1; gr += (196 - gr) * f1; b += (124 - b) * f1;
          const mud = 1 - 0.28 * wt;
          r += (152 * mud - r) * f2; gr += (117 * mud - gr) * f2; b += (80 * mud - b) * f2;
        } else if (t === PLAN || t === EXTRA) {
          const v = ((ci * 2654435761) >>> 27) - 16;
          const joint = (jy || sx % K === 0) ? 20 : 0;
          const n = (nz - 128) * 0.03 + v * 0.35 - joint;
          if (t === PLAN) { r = 211 + n; gr = 205 + n; b = 193 + n; } else { r = 230 + n; gr = 205 + n; b = 158 + n; }
        } else if (t === WATER) {
          const n = (nz - 128) * 0.05;
          r = 74 + n; gr = 138 + n; b = 150 + n;
        } else if (t === BED) {
          const w = wear[ci];
          const n = (nz - 128) * 0.06;
          r = 92 + n + w * 44; gr = 68 + n + w * 36; b = 54 + n + w * 22;
          const hsh = (ci * 2654435761) >>> 24;
          const ux = (sx % K) / K - 0.5 + ((hsh & 7) - 3.5) * 0.04, uy = (sy % K) / K - 0.5;
          const rr = ux * ux + uy * uy;
          if (w < 0.12 + hsh / 255 * 0.8) {
            if (rr < 0.085) {
              const k = cy % 3;
              if (k === 0) { r = 216; gr = 70; b = 112; } else if (k === 1) { r = 238; gr = 184; b = 48; } else { r = 246; gr = 236; b = 222; }
              if (rr < 0.012) { r -= 50; gr -= 40; b -= 20; }
            } else if (rr < 0.2) { r = 70 + n; gr = 112 + n; b = 58 + n; }
          } else if (rr < 0.1 && (hsh & 1)) { r = 120; gr = 110; b = 62; }
        } else { r = 96; gr = 86; b = 78; }
        if (wt > 0.01 && t !== WATER) { const k = 1 - 0.14 * wt; r *= k; gr *= k; b *= k * 1.03; }
        if (sn > 0.01) {
          const a = track[r0 + x0], b2 = track[r0 + x1], c = track[r1 + x0], d = track[r1 + x1];
          let tk = (a + (b2 - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
          if (tk > 0.02) tk += (nz - 128) * 0.0016;
          const cover = sn * (t === WATER ? 0.72 : 1) * (1 - 0.8 * sm(0.3, 1, tk));
          const sl = sm(0, 0.35, tk), n = (nz - 128) * 0.02;
          const sr = 244 - 56 * sl + n, sg = 246 - 50 * sl + n, sb = 250 - 40 * sl + n;
          r = r * 0.8 + (sr - r * 0.8) * cover; gr = gr * 0.8 + (sg - gr * 0.8) * cover; b = b * 0.82 + (sb - b * 0.82) * cover;
        }
        const o = p * 4;
        D[o] = r; D[o + 1] = gr; D[o + 2] = b;
      }
    }
    gg.putImageData(img, 0, 0);
    groundDirty = false;
  }

  // ---- drawing everything else ---------------------------------------------
  const view = { s: 8, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1 };
  function resize() {
    const r = groundEl.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    view.cw = Math.max(50, r.width); view.ch = Math.max(50, r.height); view.dpr = dpr;
    cv.width = Math.round(view.cw * dpr); cv.height = Math.round(view.ch * dpr);
    if (!W) return;
    view.s = Math.min(view.cw / W, view.ch / H);
    view.ox = (view.cw - W * view.s) / 2; view.oy = (view.ch - H * view.s) / 2;
  }
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const rgb = (c, sn) => `rgb(${mix(c[0], 243, sn)},${mix(c[1], 245, sn)},${mix(c[2], 249, sn)})`;
  let fenceList = null;
  const flakes = [];
  for (let i = 0; i < 90; i++) flakes.push([Math.random(), Math.random(), 0.5 + Math.random()]);

  function draw(realT) {
    const s = view.s, dpr = view.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#3f5a3c";
    g.fillRect(0, 0, view.cw, view.ch);
    g.save();
    g.translate(view.ox, view.oy);
    g.beginPath(); g.rect(0, 0, W * s, H * s); g.clip();
    g.imageSmoothingEnabled = true;
    g.drawImage(gcv, 0, 0, W * s, H * s);
    const sn = snow, dark = darkAt(simT), rain = rainAt(simT);
    const shx = s * 0.9, shy = s * 1.3;

    // the pond, drawn smooth over its cells
    {
      const p = geo.pond;
      const shape = (grow) => { g.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2, wob = (1 + 0.12 * Math.sin(a * 3 + 1)) * grow; const x = (p.x + Math.cos(a) * p.rx * wob) * s, y = (p.y + Math.sin(a) * p.ry * wob) * s; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
      shape(1.09); g.fillStyle = sn > 0.5 ? "rgb(226,232,238)" : wet > 0.5 ? "rgb(120,112,78)" : "rgb(150,160,92)"; g.fill();
      shape(1.03); g.fillStyle = rgb([70, 132, 146], sn * 0.7); g.fill();
      shape(0.8); g.fillStyle = rgb([84, 148, 160], sn * 0.78); g.fill();
      if (sn < 0.3) { shape(0.5); g.fillStyle = "rgba(120,180,186,0.5)"; g.fill(); }
    }

    // shadows of buildings
    g.fillStyle = "rgba(30,38,18,0.26)";
    for (const b of geo.blds) g.fillRect(b.x0 * s + shx, b.y0 * s + shy, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);

    // fences
    if (!fenceList) { fenceList = []; for (let i = 0; i < N; i++) if (fence[i]) fenceList.push(i); }
    if (fenceList.length) {
      const hl = s * 0.62;
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? "#5b3f27" : "rgba(30,38,18,0.3)";
        g.lineWidth = Math.max(1.6, s * 0.3);
        g.lineCap = "round";
        const off = pass ? 0 : s * 0.36;
        g.beginPath();
        for (const i of fenceList) {
          const q = rails[i] || [i % W + 0.5, ((i / W) | 0) + 0.5, 0];
          const x = q[0] * s + off, y = q[1] * s + off, cx = Math.cos(q[2]), cy = Math.sin(q[2]);
          if (fence[i] === 255) {
            if (!pass) continue;
            // the rail, down at one end and pushed aside
            g.moveTo(x - cx * hl, y - cy * hl); g.lineTo(x - cx * hl * 0.2 - cy * s * 0.55, y - cy * hl * 0.2 + cx * s * 0.55);
          } else { g.moveTo(x - cx * hl, y - cy * hl); g.lineTo(x + cx * hl, y + cy * hl); }
        }
        g.stroke();
      }
      g.fillStyle = "#3d2a1a";
      for (const i of fenceList) {
        if (fence[i] === 255 || ((i % W) + ((i / W) | 0)) % 2) continue;
        const q = rails[i] || [i % W + 0.5, ((i / W) | 0) + 0.5, 0];
        const k = Math.max(2.2, s * 0.52); g.fillRect(q[0] * s - k / 2, q[1] * s - k / 2, k, k);
      }
    }

    // notices
    for (const sg of signs) {
      const x = sg.x * s, y = sg.y * s, k = Math.max(7, s * 1.25);
      const lean = (1 - sg.str);
      g.save(); g.translate(x, y);
      if (sg.str <= 0) {
        g.rotate(sg.tilt * 1.2);
        g.fillStyle = rgb([196, 186, 160], sn * 0.6); g.fillRect(-k, -k * 0.55, k * 2, k * 1.1);
        g.strokeStyle = "rgba(90,70,50,0.6)"; g.lineWidth = 1; g.strokeRect(-k, -k * 0.55, k * 2, k * 1.1);
      } else {
        g.fillStyle = "rgba(30,38,18,0.28)"; g.fillRect(-k * 0.2 + k * 0.5, 0, k * 1.6, k * 0.5);
        g.rotate(sg.tilt * lean * 0.9);
        g.fillStyle = "#4a3524"; g.fillRect(-k * 0.09, -k * 0.2, k * 0.18, k * 0.6);
        g.fillStyle = "#fbf8ef"; g.fillRect(-k, -k * 1.25, k * 2, k * 1.1);
        g.strokeStyle = "#a8271d"; g.lineWidth = Math.max(1, k * 0.11); g.strokeRect(-k, -k * 1.25, k * 2, k * 1.1);
        g.fillStyle = "#a8271d";
        if (k >= 11) {
          g.font = `700 ${k * 0.36}px "Times New Roman", Times, serif`; g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText("KEEP OFF", 0, -k * 0.9); g.fillText("THE GRASS", 0, -k * 0.5);
        } else { g.fillRect(-k * 0.6, -k * 0.98, k * 1.2, k * 0.16); g.fillRect(-k * 0.7, -k * 0.6, k * 1.4, k * 0.16); }
      }
      g.restore();
    }

    // statue
    {
      const x = (geo.CX + 0.5) * s, y = (geo.CY + 0.5) * s;
      g.fillStyle = "rgba(30,38,18,0.3)";
      g.beginPath(); g.ellipse(x + s * 1.8, y + s * 2.4, s * 2.6, s * 0.9, 0.95, 0, 7); g.fill();
      g.fillStyle = rgb([150, 146, 138], sn * 0.5); g.fillRect(x - s * 1.4, y - s * 1.4, s * 2.8, s * 2.8);
      g.fillStyle = rgb([62, 92, 80], sn * 0.7); g.beginPath(); g.arc(x, y, s * 0.85, 0, 7); g.fill();
      g.fillStyle = rgb([88, 124, 108], sn * 0.7); g.beginPath(); g.arc(x - s * 0.2, y - s * 0.25, s * 0.4, 0, 7); g.fill();
    }

    // people
    const pr = Math.max(1.9, s * 0.46);
    for (const l of loungers) {
      const x = l.x * s, y = l.y * s, q = Math.max(4.5, s * 1.45);
      g.save(); g.translate(x, y); g.rotate(l.rot);
      g.fillStyle = "rgba(25,30,15,0.18)"; g.fillRect(-q + 1, -q * 0.7 + 1.5, q * 2, q * 1.4);
      g.fillStyle = l.rug; g.fillRect(-q, -q * 0.7, q * 2, q * 1.4);
      g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.8; g.strokeRect(-q, -q * 0.7, q * 2, q * 1.4);
      const body = (bx, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(bx, 0, pr * 0.8, pr * 1.5, 0, 0, 7); g.fill(); g.fillStyle = "#3a2c22"; g.beginPath(); g.arc(bx, -pr * 1.1, pr * 0.5, 0, 7); g.fill(); };
      body(l.two ? -q * 0.42 : 0, l.coat);
      if (l.two) body(q * 0.42, l.two);
      g.restore();
    }
    const brollies = rain > 0.25;
    g.fillStyle = "rgba(25,30,15,0.3)";
    g.beginPath();
    for (const w of walkers) { const x = w.x * s + pr * 0.6, y = w.y * s + pr * 0.8; g.moveTo(x + pr, y); g.ellipse(x, y, pr * (brollies && w.brolly ? 1.9 : 1), pr * (brollies && w.brolly ? 1.5 : 0.8), 0, 0, 7); }
    g.fill();
    for (const w of walkers) {
      const x = w.x * s, y = w.y * s;
      if (w.cls === 1) {
        // somebody pushing something with wheels, who needs the path to be a path
        g.fillStyle = "#e9e4d6"; g.strokeStyle = "#3a3630"; g.lineWidth = 0.8;
        const px = x + w.hx * pr * 2, py = y + w.hy * pr * 2;
        g.beginPath(); g.arc(px, py, pr * 0.78, 0, 7); g.fill(); g.stroke();
      }
      if (brollies && w.brolly) {
        g.fillStyle = w.brolly; g.beginPath(); g.arc(x, y, pr * 1.9, 0, 7); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.7; g.beginPath();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + w.wob; g.moveTo(x - Math.cos(a) * pr * 1.9, y - Math.sin(a) * pr * 1.9); g.lineTo(x + Math.cos(a) * pr * 1.9, y + Math.sin(a) * pr * 1.9); }
        g.stroke();
      } else {
        g.fillStyle = w.coat;
        g.beginPath(); g.ellipse(x, y, pr, pr * 0.74, Math.atan2(w.hy, w.hx) + Math.PI / 2, 0, 7); g.fill();
        g.fillStyle = "#3a2c22";
        g.beginPath(); g.arc(x + w.hx * pr * 0.15, y + w.hy * pr * 0.15, pr * 0.5, 0, 7); g.fill();
      }
    }
    if (dog) {
      const x = dog.x * s, y = dog.y * s, a = Math.atan2(dog.hy, dog.hx), q = Math.max(2, s * 0.5);
      if (dog.swim) {
        g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1;
        for (let k = 0; k < 2; k++) { const rr = q * (1.6 + ((realT * 1.2 + k * 0.5) % 1) * 2.4); g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); }
      } else { g.fillStyle = "rgba(25,30,15,0.3)"; g.beginPath(); g.ellipse(x + q * 0.5, y + q * 0.7, q * 1.4, q * 0.7, a, 0, 7); g.fill(); }
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = "#6b4a2c"; g.beginPath(); g.ellipse(0, 0, q * 1.35, q * 0.62, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(q * 1.3, 0, q * 0.55, 0, 7); g.fill();
      g.strokeStyle = "#6b4a2c"; g.lineWidth = Math.max(1, q * 0.3); g.beginPath(); g.moveTo(-q * 1.2, 0);
      g.lineTo(-q * 2.1, Math.sin(realT * 14) * q * 0.7); g.stroke();
      g.restore();
    }

    // lamps
    for (const [lx, ly] of geo.lamps) {
      g.fillStyle = "rgba(25,30,15,0.3)"; g.fillRect(lx * s, ly * s, s * 1.6, Math.max(1, s * 0.16));
      g.fillStyle = "#23221f"; g.beginPath(); g.arc(lx * s, ly * s, Math.max(1.8, s * 0.42), 0, 7); g.fill();
      g.fillStyle = "#d8cfae"; g.beginPath(); g.arc(lx * s, ly * s, Math.max(0.8, s * 0.2), 0, 7); g.fill();
    }

    // trees
    for (const t of geo.trees) {
      const x = t.x * s, y = t.y * s, r = t.r * s;
      g.fillStyle = "rgba(25,35,15,0.26)";
      g.beginPath(); g.arc(x + shx * 1.6, y + shy * 1.6, r * 1.02, 0, 7); g.fill();
    }
    for (const t of geo.trees) {
      const x = t.x * s, y = t.y * s, r = t.r * s;
      const blob = (dx, dy, k, c) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx * r, y + dy * r, r * k, 0, 7); g.fill(); };
      const c1 = rgb([58, 104, 62], sn * 0.85), c2 = rgb([76, 126, 70], sn * 0.92), c3 = rgb([104, 150, 78], sn);
      for (let k = 0; k < 6; k++) { const a = t.seed + k * 1.05; blob(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.52, c1); }
      blob(0, 0, 0.7, c1);
      for (let k = 0; k < 5; k++) { const a = t.seed * 2 + k * 1.26; blob(Math.cos(a) * 0.38 - 0.1, Math.sin(a) * 0.38 - 0.12, 0.4, c2); }
      blob(-0.2, -0.25, 0.34, c3); blob(0.18, -0.05, 0.2, c3);
    }

    // buildings
    geo.blds.forEach((b, bi) => {
      const x = b.x0 * s, y = b.y0 * s, w = (b.x1 - b.x0) * s, h = (b.y1 - b.y0) * s;
      const lit = [186, 94, 66], shade = [158, 74, 54], edge = [112, 50, 38];
      const wide = (b.side === 0 || b.side === 2);
      g.fillStyle = rgb(lit, sn * 0.92); g.fillRect(x, y, w, h);
      g.fillStyle = rgb(shade, sn * 0.8);
      if (wide) g.fillRect(x, y + h / 2, w, h / 2); else g.fillRect(x + w / 2, y, w / 2, h);
      // courses of tiles, a skylight or two
      if (sn < 0.6) {
        g.strokeStyle = `rgba(70,24,14,${0.13 * (1 - sn)})`; g.lineWidth = 1; g.beginPath();
        const stepc = Math.max(3, s * 0.8);
        if (wide) for (let yy = y + stepc; yy < y + h; yy += stepc) { g.moveTo(x, yy); g.lineTo(x + w, yy); }
        else for (let xx = x + stepc; xx < x + w; xx += stepc) { g.moveTo(xx, y); g.lineTo(xx, y + h); }
        g.stroke();
      }
      g.fillStyle = rgb([96, 108, 116], sn * 0.7);
      for (let k = 0; k < 3; k++) {
        const f = 0.2 + k * 0.3 + ((bi * 37) % 7) * 0.008, q = Math.max(3, s * 1.1);
        if (wide) g.fillRect(x + w * f - q / 2, b.side === 0 ? y + h * 0.66 : y + h * 0.2, q, q * 0.7);
        else g.fillRect(b.side === 3 ? x + w * 0.2 : x + w * 0.66, y + h * f - q / 2, q * 0.7, q);
      }
      g.strokeStyle = rgb(edge, sn * 0.4); g.lineWidth = Math.max(1, s * 0.22); g.strokeRect(x, y, w, h);
      g.lineWidth = 1; g.beginPath();
      if (wide) { g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); } else { g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); }
      g.stroke();
      // the door, and its step
      const dx = (b.door[0] + 0.5) * s, dy = (b.door[1] + 0.5) * s;
      g.fillStyle = "#2a2622";
      if (b.side === 0) g.fillRect(dx - s * 1.2, dy - s * 0.9, s * 2.4, s * 0.5);
      else if (b.side === 2) g.fillRect(dx - s * 1.2, dy + s * 0.4, s * 2.4, s * 0.5);
      else if (b.side === 3) g.fillRect(dx - s * 0.9, dy - s * 1.2, s * 0.5, s * 2.4);
      else g.fillRect(dx + s * 0.4, dy - s * 1.2, s * 0.5, s * 2.4);
      // its name on the roof
      const fs = Math.max(9, Math.min(15, s * 1.75));
      g.font = `700 ${fs}px "Times New Roman", Times, serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = sn > 0.5 ? "rgba(120,60,45,0.75)" : "rgba(255,240,225,0.85)";
      const vx0 = Math.max(0, b.x0), vx1 = Math.min(W, b.x1), vy0 = Math.max(0, b.y0), vy1 = Math.min(H, b.y1);
      g.save(); g.translate((vx0 + vx1) / 2 * s, (vy0 + vy1) / 2 * s);
      if (!wide) g.rotate(b.side === 3 ? -Math.PI / 2 : Math.PI / 2);
      g.fillText(ROOF[bi].split("").join("  "), 0, wide ? (b.side === 0 ? -h * 0.05 : h * 0.05) : 0);
      g.restore();
    });

    // night
    if (dark > 0.01) {
      g.globalCompositeOperation = "multiply";
      const k = dark * (sn > 0.5 ? 0.82 : 1);
      g.fillStyle = `rgb(${mix(255, 58, k)},${mix(255, 66, k)},${mix(255, 98, k)})`;
      g.fillRect(0, 0, W * s, H * s);
      g.globalCompositeOperation = "lighter";
      const lr = s * 9;
      for (const [lx, ly] of geo.lamps) {
        const gr = g.createRadialGradient(lx * s, ly * s, 0, lx * s, ly * s, lr);
        gr.addColorStop(0, `rgba(255,206,130,${0.5 * dark})`); gr.addColorStop(0.35, `rgba(255,190,110,${0.2 * dark})`); gr.addColorStop(1, "rgba(255,190,110,0)");
        g.fillStyle = gr; g.fillRect(lx * s - lr, ly * s - lr, lr * 2, lr * 2);
      }
      g.globalCompositeOperation = "source-over";
      // lit windows along the inner faces
      g.fillStyle = `rgba(255,214,140,${0.85 * dark})`;
      geo.blds.forEach((b, bi) => {
        const wide = (b.side === 0 || b.side === 2);
        const a0 = Math.max(0, wide ? b.x0 : b.y0) + 1.5, a1 = Math.min(wide ? W : H, wide ? b.x1 : b.y1) - 1.5;
        for (let a = a0, k = 0; a < a1; a += 2.6, k++) {
          if (((k * 7 + bi * 3) % 5) < 2) continue;
          if (b.side === 0) g.fillRect(a * s, (b.y1 - 0.75) * s, s * 1.2, s * 0.5);
          else if (b.side === 2) g.fillRect(a * s, (b.y0 + 0.25) * s, s * 1.2, s * 0.5);
          else if (b.side === 3) g.fillRect((b.x1 - 0.75) * s, a * s, s * 0.5, s * 1.2);
          else g.fillRect((b.x0 + 0.25) * s, a * s, s * 0.5, s * 1.2);
        }
      });
    }

    // weather in the air
    if (!reduced) {
      if (rain > 0.02) {
        g.strokeStyle = `rgba(225,235,245,${0.3 * rain})`; g.lineWidth = 1; g.beginPath();
        const n = Math.round(70 * rain), wpx = W * s, hpx = H * s;
        for (let k = 0; k < n; k++) {
          const f = flakes[k % flakes.length];
          const x = ((f[0] * 7919 + realT * 0.9 * f[2]) % 1) * wpx, y = ((f[1] * 104729 + realT * 2.3 * f[2] + k * 0.137) % 1) * hpx;
          g.moveTo(x, y); g.lineTo(x + 3, y + 9);
        }
        g.stroke();
      }
      if (snowingAt(simT)) {
        g.fillStyle = "rgba(255,255,255,0.75)"; const wpx = W * s, hpx = H * s;
        g.beginPath();
        for (const f of flakes) {
          const y = ((f[1] + realT * 0.07 * f[2]) % 1) * hpx, x = ((f[0] + Math.sin(realT * 0.5 + f[1] * 9) * 0.01 + realT * 0.012) % 1) * wpx;
          g.moveTo(x + 1.6, y); g.arc(x, y, 1.1 + f[2], 0, 7);
        }
        g.fill();
      }
    }

    // the works cursor
    if (tool && cursor.on) {
      const x = cursor.x * s, y = cursor.y * s;
      const rad = tool === "pave" ? 1.35 : tool === "turf" ? 2.4 : tool === "lift" ? 1.6 : 0.7;
      g.strokeStyle = dark > 0.5 ? "rgba(255,255,255,0.85)" : "rgba(29,27,23,0.85)"; g.lineWidth = 1.25;
      g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, rad * s, 0, 7); g.stroke(); g.setLineDash([]);
    }
    g.restore();
  }

  // ---- the office's paperwork ----------------------------------------------
  let lastClock = "";
  function paperwork() {
    const d = calDay(), h = hourOf(simT);
    const sky = snowingAt(simT) ? "snow" : snow > 0.4 ? "snow lying" : rainAt(simT) > 0.3 ? "rain" : isNight(simT) ? "dark" : wet > 0.3 ? "wet underfoot" : "fair";
    const mins = Math.floor((h % 1) * 6) * 10;
    const txt = `${DAYNAMES[d % 7]}, week ${1 + Math.floor(d / 7)} · ${String(h | 0).padStart(2, "0")}.${String(mins).padStart(2, "0")} · ${sky}`;
    if (txt !== lastClock) { $("clock").textContent = txt; lastClock = txt; }
    $("l-j").textContent = st.journeys.toLocaleString("en-GB");
    $("l-p").textContent = st.journeys ? pct(st.clean, st.journeys) + "%" : "–";
    $("l-a").textContent = area(planArea);
    $("l-s").textContent = area(extraArea);
    $("l-l").textContent = area(bare + bedLost);
    $("l-f").textContent = `${Math.round(fenceLen * METRE)} m, ${gaps}`;
    $("l-n").textContent = `${signs.filter((s) => s.str > 0).length} of ${st.signsPut}`;
    $("l-m").textContent = money(st.spent);
  }

  // ---- the loop ------------------------------------------------------------
  let pace = 1, lastReal = 0, jobAcc = 0, groundAcc = 0, paperAcc = 0, reviewAcc = 0, saveAcc = 0, bellHour = -1;
  function simulate(dt) {
    const before = simT;
    simT += dt;
    // weather state
    const rn = rainAt(simT);
    wet += ((rn > 0.1 ? 1 : 0) - wet) * Math.min(1, dt / (rn > 0.1 ? 4 : 14));
    if (snowingAt(simT)) snow = Math.min(1, snow + dt / 7);
    else if (snow > 0 && thawingAt(simT)) {
      const was = snow;
      snow = Math.max(0, snow - dt / 9);
      if (was > 0.5 && snow <= 0.5) for (let i = 0; i < N; i++) if ((type[i] === GRASS || type[i] === BED) && track[i] > 0.2) wear[i] = Math.min(1, wear[i] + track[i] * 0.22);
    }
    // bell
    const h = hourOf(simT), hb = hourOf(before);
    if (!weekend(simT)) for (const b of [8.7, 12.4, 17]) if (hb < b && h >= b && !isNight(simT)) sfx("bell");
    // arrivals
    spawnAcc += spawnRate() * dt;
    while (spawnAcc >= 1) { spawnAcc -= 1; if (walkers.length < 120) spawn(); }
    let n = 0;
    for (let i = 0; i < walkers.length; i++) { const w = walkers[i]; if (w.age < 140 && stepWalker(w, dt) !== false) walkers[n++] = w; }
    walkers.length = n;
    stepDog(dt);
    stepLoungers(dt);
    slowAcc += dt;
    if (slowAcc >= 0.5) { slow(slowAcc); slowAcc = 0; }
    if (signsDirty) paintSigns();
  }
  function frame(ms) {
    const realT = ms / 1000;
    let rdt = Math.min(0.05, realT - lastReal);
    if (!(rdt > 0)) rdt = 0.016;
    lastReal = realT;
    if (!document.hidden) {
      const total = rdt * pace, steps = Math.max(1, Math.ceil(total / 0.045));
      for (let k = 0; k < steps; k++) simulate(total / steps);
      jobAcc += rdt * (pace > 1 ? 2.5 : 1);
      let guard = 0;
      while (jobAcc >= 0.085 && guard++ < 2) { jobAcc -= 0.085; runJob(); }
      if (jobAcc > 0.2) jobAcc = 0.2;
      reviewAcc += total;
      if (reviewAcc >= 1) { reviewAcc = 0; review(); }
      issue();
      groundAcc += rdt;
      if (groundAcc >= (pace > 1 ? 0.12 : 0.2) || groundDirty) { groundAcc = 0; paintGround(); }
      draw(realT);
      paperAcc += rdt;
      if (paperAcc >= 0.4) { paperAcc = 0; paperwork(); }
      saveAcc += rdt;
      if (saveAcc >= 20) { saveAcc = 0; save(); }
    }
    requestAnimationFrame(frame);
  }

  // ---- input ---------------------------------------------------------------
  const cursor = { x: 0, y: 0, on: false };
  let dragging = false, lastX = 0, lastY = 0, layTick = 0;
  const toCell = (e) => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left - view.ox) / view.s, (e.clientY - r.top - view.oy) / view.s];
  };
  cv.addEventListener("pointerdown", (e) => {
    wake();
    const [x, y] = toCell(e);
    cursor.x = x; cursor.y = y; cursor.on = !!tool;
    if (!tool) return;
    e.preventDefault();
    dragging = true; lastX = x; lastY = y;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    work(tool, x, y, x, y);
  });
  cv.addEventListener("pointermove", (e) => {
    const [x, y] = toCell(e);
    cursor.x = x; cursor.y = y; cursor.on = !!tool && (e.pointerType === "mouse" || dragging);
    if (!dragging || !tool || tool === "sign") return;
    if (Math.hypot(x - lastX, y - lastY) < 0.4) return;
    work(tool, lastX, lastY, x, y);
    lastX = x; lastY = y;
    if (++layTick % 4 === 0) sfx("lay");
  });
  const endDrag = () => { dragging = false; };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("pointerleave", () => { if (!dragging) cursor.on = false; });

  function setTool(t) {
    tool = tool === t ? null : t;
    for (const b of document.querySelectorAll("#tools button")) b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    cv.classList.toggle("armed", !!tool);
    if (!tool) cursor.on = false;
  }
  for (const b of document.querySelectorAll("#tools button")) b.addEventListener("click", () => { wake(); setTool(b.dataset.tool); });
  const TOOLKEYS = { 1: "pave", 2: "fence", 3: "sign", 4: "turf", 5: "lift" };
  let keyDown = false;
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (TOOLKEYS[e.key]) { wake(); setTool(TOOLKEYS[e.key]); return; }
    if (e.key === "Escape") { if (tool) setTool(tool); return; }
    if (document.activeElement !== cv) return;
    const step = e.shiftKey ? 4 : 1;
    let mx = 0, my = 0;
    if (e.key === "ArrowLeft") mx = -step; else if (e.key === "ArrowRight") mx = step;
    else if (e.key === "ArrowUp") my = -step; else if (e.key === "ArrowDown") my = step;
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault(); wake();
      if (tool && !e.repeat) { keyDown = true; work(tool, cursor.x, cursor.y, cursor.x, cursor.y); }
      return;
    } else return;
    e.preventDefault();
    if (!cursor.on) { cursor.x = geo.CX + 6.5; cursor.y = geo.CY + 6.5; cursor.on = !!tool; }
    const px = cursor.x, py = cursor.y;
    cursor.x = Math.max(0.5, Math.min(W - 0.5, cursor.x + mx)); cursor.y = Math.max(0.5, Math.min(H - 0.5, cursor.y + my));
    cursor.on = !!tool;
    if (keyDown && tool && tool !== "sign") work(tool, px, py, cursor.x, cursor.y);
  });
  window.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") keyDown = false; });

  const PACES = [1, 4, 12];
  $("pace").addEventListener("click", () => {
    pace = PACES[(PACES.indexOf(pace) + 1) % PACES.length];
    $("pace").textContent = `clock ×${pace}`;
  });
  $("bell").addEventListener("click", () => {
    bellOn = !bellOn;
    $("bell").textContent = bellOn ? "bell on" : "bell off";
    $("bell").setAttribute("aria-pressed", String(bellOn));
    if (bellOn) wake(); else if (ac) { try { ac.close(); } catch (e) { /* fine */ } ac = null; }
  });
  $("fold").addEventListener("click", () => {
    const willOpen = !office.classList.contains("open");
    groundEl.style.flex = willOpen ? `0 0 ${Math.round(groundEl.getBoundingClientRect().height)}px` : "";
    const open = office.classList.toggle("open");
    $("fold").setAttribute("aria-expanded", String(open));
    $("fold").textContent = open ? "close the file" : "the file";
    requestAnimationFrame(() => { resize(); });
  });
  let armedReset = 0;
  $("reset").addEventListener("click", () => {
    const now = Date.now();
    if (now - armedReset > 4000) { armedReset = now; $("reset").textContent = "Reinstate it? Press again"; setTimeout(() => { $("reset").textContent = "Reinstate the approved plan"; }, 4000); return; }
    try { localStorage.removeItem(KEY); } catch (e) { /* fine */ }
    begin(true);
    $("reset").textContent = "Reinstate the approved plan";
    armedReset = 0;
  });
  window.addEventListener("resize", () => { resize(); });
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(groundEl);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);

  // ---- begin ---------------------------------------------------------------
  function begin(anew) {
    resize();
    walkers = []; loungers = []; dog = null; pending.length = 0; queue.length = 0;
    $("memos").textContent = "";
    if (anew || !load()) {
      const a = Math.max(0.56, Math.min(1.85, view.cw / view.ch));
      const w = Math.round(Math.sqrt(13500 * a));
      newWorld(w, Math.round(13500 / w));
    }
    for (const m of memos) showMemo(m, false);
    resize();
    makeGround();
    lateDirty.fill(true); fenceList = null; signsDirty = true;
    paintSigns();
    for (let c = 0; c < 3; c++) { buildCost(c); for (let d = 0; d < 6; d++) march(geo.doors[d].i, fields[c][d]); }
    lateDirty.fill(false);
    slow(0.001);
    // nobody arrives to an empty quadrangle
    for (let k = 0; k < 14; k++) spawn();
    for (let k = 0; k < 60; k++) { let n = 0; for (const w of walkers) if (stepWalker(w, 0.045 * (0.3 + Math.random())) !== false) walkers[n++] = w; walkers.length = n; }
    paperwork();
  }
  begin(false);
  requestAnimationFrame(frame);
})();
