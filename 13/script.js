// It was fine before you touched it.
// Four things that can each be turned: a picture, a shelf, the wallpaper and
// the room that holds them all. Whenever everything is level with the window
// for a moment, something else turns out not to be. A marble on the shelf
// reports the truth about gravity, which is measured against the window.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOL = 0.3;          // degrees that count as level
  const GEAR = 0.7;         // the hand is geared down so small corrections are possible
  const LIMIT = 9;

  const mk = (id, a) => ({ el: $(id), a, shown: null, anim: null, held: false });
  const room = mk('room', 0), paper = mk('paper', 0), shelf = mk('shelf', 0), pic = mk('pic', 2.6);
  const skirt = $('skirt'), marble = $('marble'), swirl = marble.firstElementChild;
  const things = [pic, shelf, paper, room];
  pic.rest = pic.a;

  // which angle a handle turns, and what it pivots about
  const handles = [[pic.el, pic], [shelf.el, shelf], [paper.el, paper], [skirt, room]];
  const pivotOf = (t) => {
    const p = t.el.querySelector(':scope > .pivot');
    if (!p) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = p.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const abs = (t) => (t === room ? room.a : t.a + room.a);

  function animate(t, to, dur, kind) {
    t.anim = { from: t.a, to, t: 0, dur: calm ? Math.min(dur, 0.01) : dur, kind };
  }

  // letting go: a picture never stays quite where it was put
  function release(t, moved) {
    t.held = false;
    t.el.classList.remove('held'); skirt.classList.remove('held');
    if (!moved) return;
    if (t === pic) {
      const slip = (pic.a - pic.rest) * 0.07 + (Math.random() - 0.5) * 0.24;
      pic.rest = pic.a - slip;
      animate(pic, pic.rest, 1.5, 'swing');
    } else if (t === shelf) {
      animate(shelf, shelf.a + (Math.random() - 0.5) * 0.1, 0.25, 'ease');
    }
  }

  handles.forEach(([el, t]) => {
    let last = null, pv = null, moved = false, id = null;
    el.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      id = e.pointerId; moved = false;
      try { el.setPointerCapture(id); } catch (_) {}
      pv = pivotOf(t); last = { x: e.clientX - pv.x, y: e.clientY - pv.y };
      t.held = true; t.anim = null; el.classList.add('held');
      e.preventDefault(); e.stopPropagation();
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const cur = { x: e.clientX - pv.x, y: e.clientY - pv.y };
      const r2 = Math.max(cur.x * cur.x + cur.y * cur.y, 90 * 90);
      const d = (last.x * cur.y - last.y * cur.x) / r2 * 180 / Math.PI;
      if (d) { t.a = clamp(t.a + d * GEAR, -LIMIT, LIMIT); moved = true; }
      last = cur;
    });
    const up = (e) => { if (e.pointerId !== id) return; id = null; release(t, moved); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', (e) => {
      const d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      t.anim = null;
      t.a = clamp(t.a + d * (e.shiftKey ? 0.5 : 0.1), -LIMIT, LIMIT);
      if (t === pic) pic.rest = pic.a;
    });
  });

  // what goes wrong next, once everything has been put right
  let stage = 0, levelFor = 0, wait = 1.3, lastThing = pic;
  function disturb() {
    const sign = Math.random() < 0.5 ? -1 : 1;
    if (stage === 0) { animate(shelf, 1.5, 0.9, 'swing'); lastThing = shelf; }          // a bracket gives
    else if (stage === 1) { animate(paper, -0.9, 5, 'ease'); lastThing = paper; }       // was the paper always like that
    else if (stage === 2) { animate(room, 0.65, 7, 'ease'); lastThing = room; }         // or is it the house
    else if (stage === 3) { pic.rest = pic.a - 0.55; animate(pic, pic.rest, 1.5, 'swing'); lastThing = pic; } // a door, somewhere
    else {
      const pool = things.filter((t) => t !== lastThing);
      const t = pool[Math.floor(Math.random() * pool.length)];
      const by = sign * (0.42 + Math.random() * 0.4);
      if (t === pic) { pic.rest = pic.a + by; animate(pic, pic.rest, 1.5, 'swing'); }
      else if (t === shelf) animate(shelf, shelf.a + by, 0.9, 'swing');
      else animate(t, t.a + by, 4 + Math.random() * 4, 'ease');
      lastThing = t;
    }
    stage++;
    wait = stage < 4 ? 1.6 : 1.5 + Math.random() * 5;
  }

  // marble: position along the shelf in units, 0 at the left lip
  const M = { x: 27, v: 0, lo: 1, hi: 52 - 4.4 - 1, roll: 0 };
  function stepMarble(dt) {
    const tilt = abs(shelf) * Math.PI / 180;
    let acc = 520 * Math.sin(tilt);
    const grip = 520 * Math.sin(0.11 * Math.PI / 180);   // below this it will not start rolling
    if (Math.abs(M.v) < 0.05 && Math.abs(acc) < grip) { M.v = 0; return; }
    acc -= Math.sign(M.v || acc) * grip * 0.6;
    M.v += acc * dt; M.v *= Math.exp(-0.5 * dt);
    let x = M.x + M.v * dt;
    if (x < M.lo) { x = M.lo; M.v = Math.abs(M.v) > 3 ? -M.v * 0.28 : 0; }
    if (x > M.hi) { x = M.hi; M.v = Math.abs(M.v) > 3 ? -M.v * 0.28 : 0; }
    M.roll += (x - M.x) / 2.2;
    M.x = x;
    marble.style.transform = `translateX(calc(var(--u) * ${x.toFixed(3)}))`;
    swirl.style.transform = `rotate(${M.roll.toFixed(3)}rad)`;
  }
  marble.style.transform = `translateX(calc(var(--u) * ${M.x}))`;

  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    let busy = false;
    for (const t of things) {
      if (t.held) busy = true;
      const an = t.anim;
      if (an) {
        busy = true;
        an.t += dt;
        const k = Math.min(1, an.t / an.dur);
        if (an.kind === 'swing') {
          const s = an.t;
          t.a = an.to + (an.from - an.to) * Math.exp(-3.6 * s) * Math.cos(10 * s);
        } else {
          const e = k * k * (3 - 2 * k);
          t.a = an.from + (an.to - an.from) * e;
        }
        if (k >= 1) { t.a = an.to; t.anim = null; }
      }
      if (t.a !== t.shown) { t.el.style.transform = `rotate(${t.a.toFixed(3)}deg)`; t.shown = t.a; }
    }
    stepMarble(dt);
    const level = things.every((t) => Math.abs(abs(t)) < TOL);
    if (!busy && level) { levelFor += dt; if (levelFor > wait) { levelFor = 0; disturb(); } }
    else levelFor = 0;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
