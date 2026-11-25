// You too
// An embarrassment is a memory kept by exactly one person.
// Hold still and one arrives. Flinch and the next comes sooner.
// Sit through it and it goes, and the count at the top drops to nobody.
(() => {
  'use strict';

  // [what you did, years ago, how many people were there]
  const MEMORIES = [
    ['“Enjoy your meal.” “You too.”', 6, 3],
    ['You waved back. They were waving at the person behind you.', 9, 14],
    ['You called the teacher Mum.', 27, 31],
    ['You went in for the hug. It was a handshake.', 4, 2],
    ['You replied all.', 8, 212],
    ['You said “love you” at the end of a work call.', 3, 7],
    ['You held the door. They were much too far away. They had to run.', 11, 2],
    ['You laughed before the end of the story. It was not that kind of story.', 13, 5],
    ['You pulled the door that said push. Twice.', 2, 9],
    ['You asked when the baby was due.', 16, 4],
    ['You clapped. The song was not over.', 19, 600],
    ['You were still talking when the room went quiet.', 22, 40],
    ['You said goodbye and then walked the same way as them for four minutes.', 7, 2],
    ['You had been saying it wrong for nine years.', 5, 11],
    ['You told the joke again, to the same people.', 1, 6],
    ['You sang the wrong words, loudly, with conviction.', 15, 80]
  ];

  const root = document.documentElement;
  const blurt = document.querySelector('.blurt');
  const room = document.querySelector('.room');
  const lines = [...document.querySelectorAll('.ledger li')];
  const calmMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLD = [243, 242, 236], HOT = [255, 86, 112];
  const T_L1 = 1300, T_L2 = 2600, T_L3 = 3900, T_FADE = 6200, T_GONE = 11200, T_DONE = 13600, GRACE = 320;

  let order = [], cursor = 0;
  let state = 'calm';          // calm | showing
  let shownAt = 0, lastInput = performance.now();
  let idleLimit = 2400;
  let heat = 0;                // what flinching leaves behind
  let flush = 0, travelled = 0, lastXY = null, zeroed = false;
  let current = null, last = performance.now();

  function shuffle() {
    order = MEMORIES.map((_, i) => i).slice(1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (cursor === 0) order.unshift(0); else order.push(0);
  }

  function fit() {
    if (!current) return;
    const w = room.clientWidth, h = room.clientHeight;
    let lo = 14, hi = Math.max(w, h);
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      blurt.style.fontSize = mid + 'px';
      if (blurt.scrollWidth <= w + 1 && blurt.offsetHeight <= h) lo = mid; else hi = mid;
    }
    blurt.style.fontSize = Math.floor(lo) + 'px';
  }

  function ago(y) { return y === 1 ? 'last year' : y + ' years ago'; }

  function arrive(now) {
    if (cursor % MEMORIES.length === 0) shuffle();
    current = MEMORIES[order[cursor % MEMORIES.length]];
    cursor++;
    blurt.className = 'blurt';
    blurt.style.cssText = '';
    blurt.textContent = current[0];
    fit();
    void blurt.offsetWidth;
    blurt.classList.add('slam');
    blurt.style.opacity = 1;
    lines.forEach(l => { l.className = ''; l.textContent = ''; });
    lines[0].textContent = ago(current[1]);
    lines[1].textContent = 'people who were there: ' + current[2].toLocaleString('en');
    lines[2].textContent = 'people thinking about it right now: 1';
    state = 'showing'; shownAt = now; travelled = 0; zeroed = false;
  }

  function flinch(now, dx, dy) {
    if (state !== 'showing' || now - shownAt < GRACE) return;
    const d = Math.hypot(dx, dy) || 1;
    blurt.style.setProperty('--dx', (dx / d * 45).toFixed(1) + '%');
    blurt.style.setProperty('--dy', (d === 1 && !dx && !dy ? 40 : dy / d * 45).toFixed(1) + '%');
    blurt.style.setProperty('--rot', ((dx >= 0 ? 1 : -1) * (3 + Math.random() * 5)).toFixed(1) + 'deg');
    blurt.classList.remove('slam');
    blurt.classList.add('swat');
    lines.forEach(l => l.classList.remove('on'));
    state = 'calm';
    heat = Math.min(6, heat + 1);
    idleLimit = Math.max(650, idleLimit * 0.7);   // it comes back sooner
  }

  function endured() {
    state = 'calm';
    lines.forEach(l => l.classList.remove('on'));
    heat = Math.max(0, heat - 2.5);
    idleLimit = Math.min(60000, idleLimit * 1.7 + 2500);   // and then it leaves you alone
    lastInput = performance.now();
  }

  function input(now, dx, dy) {
    lastInput = now;
    flinch(now, dx || 0, dy || 0);
  }

  addEventListener('pointermove', e => {
    const now = performance.now();
    if (lastXY) {
      const dx = e.clientX - lastXY[0], dy = e.clientY - lastXY[1];
      if (state === 'showing') {
        travelled += Math.hypot(dx, dy);
        if (travelled > 14) input(now, dx, dy); else if (now - shownAt < GRACE) travelled = 0;
      } else if (Math.hypot(dx, dy) > 0.5) lastInput = now;
    }
    lastXY = [e.clientX, e.clientY];
  });
  addEventListener('pointerdown', e => {
    lastXY = [e.clientX, e.clientY];
    input(performance.now(), e.clientX - innerWidth / 2, e.clientY - innerHeight / 2);
  });
  addEventListener('keydown', e => {
    if (e.key === 'Tab' || e.metaKey || e.ctrlKey || e.altKey) return;
    input(performance.now(), 0, 0);
  });
  addEventListener('wheel', e => input(performance.now(), -e.deltaX, -e.deltaY), { passive: true });
  addEventListener('resize', fit);
  document.addEventListener('visibilitychange', () => { lastInput = last = performance.now(); if (state === 'showing') shownAt = Math.max(shownAt, last - T_L3); });

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    let target;

    if (state === 'calm') {
      heat = Math.max(0, heat - dt * 0.05);
      target = Math.min(0.8, heat * 0.14);
      if (now - lastInput >= idleLimit) arrive(now);
    }
    if (state === 'showing') {
      const t = now - shownAt;
      if (t > T_L1) lines[0].classList.add('on');
      if (t > T_L2) lines[1].classList.add('on');
      if (t > T_L3) lines[2].classList.add('on');
      const k = Math.min(1, Math.max(0, (t - T_FADE) / (T_GONE - T_FADE)));
      if (t > T_FADE) {
        blurt.classList.remove('slam');
        blurt.style.opacity = (1 - k) * (1 - k);
        if (!calmMotion) blurt.style.transform = 'scale(' + (1 - 0.03 * k).toFixed(4) + ')';
      }
      target = 1 - 0.9 * k;
      if (k >= 1 && !zeroed) {
        zeroed = true;
        lines[2].textContent = 'people thinking about it right now: 0';
      }
      if (t > T_DONE) endured();
    }

    flush += (target - flush) * Math.min(1, dt * (target > flush ? 2.2 : 0.7));
    const c = COLD.map((v, i) => Math.round(v + (HOT[i] - v) * flush * 0.85));
    document.body.style.backgroundColor = 'rgb(' + c.join(',') + ')';
    root.style.setProperty('--flush', flush.toFixed(3));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
