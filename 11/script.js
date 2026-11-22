// Seen by Jo, Priya
// A group chat of five invented housemates and you. It plays out from the day
// it was made to its last message; nothing here is real data.
(() => {
  'use strict';

  const KEY = 'l11.groupchat.v1';
  const DAY = 86400000;
  const P = {
    jo: { n: 'Jo', c: '#b4532a' },
    tom: { n: 'Tom', c: '#1f7a78' },
    priya: { n: 'Priya', c: '#8a3f78' },
    mel: { n: 'Mel', c: '#9a6a00' },
    dan: { n: 'Dan', c: '#51607a' },
  };
  const ORDER = ['jo', 'tom', 'priya', 'mel', 'dan'];

  // ---- script shorthand -------------------------------------------------
  const m = (w, x, o) => Object.assign({ m: w, x }, o);
  const r = (w, e, tag, d) => ({ r: w, e, tag, d });
  const s = (x, o) => Object.assign({ s: x }, o);
  const g = (w, d) => ({ g: w, d });
  const seen = (...who) => ({ seen: who });
  const pause = (ms) => ({ pause: ms });
  const W = { warm: true };

  const SCENES = [
    { day: 1312, at: 18 * 60 + 42, era: 0, base: 1, pause: 900, lines: [
      s('Jo created the group “14 Marlow Rd”'),
      s('Jo added Tom, Priya, Mel, Dan and you'),
      m('jo', 'right. house chat. no more notes on the fridge'),
      m('tom', 'but i liked the notes'),
      m('tom', '“WHO is doing this to the butter” was art', { tag: 'butter' }),
      m('priya', 'that was me and I stand by it'),
      r('mel', '😂', 'butter', 300),
      m('mel', 'bins are tonight btw!! green one'),
      m('dan', '👍'),
      m('jo', 'also landlord is coming tomorrow to “look at the damp”'),
      m('tom', 'he’s going to look at it and then leave'),
      m('priya', 'he’s going to say open a window'),
      m('mel', 'I have the window open. it is four degrees'),
      m('jo', 'can everyone at least hide the clothes horse'),
      m('tom', 'where. where would it go jo', { tag: 'where' }),
      m('priya', 'put it in Dan’s room, he’s never in', W),
      m('dan', '👍', W),
      r('jo', '😂', 'where', 500),
      seen('tom', 'priya', 'mel', 'dan', 'jo'),
    ], chips: [
      ['I’ll do the bins', [m('jo', 'hero'), m('tom', 'screenshotting this for when you don’t')]],
      ['who finished the oat milk', [m('tom', 'not me'), m('priya', 'it was Tom'), m('tom', 'it was me')]],
      ['open a window 🙄', [r('mel', '😂', 'you'), m('priya', 'word for word')]],
    ] },

    { day: 1236, at: 10 * 60 + 15, era: 0, base: 0.95, pause: 2600, lines: [
      m('jo', 'last day 😭 has everyone handed their keys back'),
      m('tom', 'define “handed”'),
      m('priya', 'Tom.'),
      m('tom', 'it’s in the house! somewhere in the house'),
      m('mel', 'I’ve hoovered the stairs so nobody go on the stairs'),
      m('dan', 'I’m on the stairs'),
      m('mel', 'DAN'),
      m('jo', 'we’re not getting the deposit back are we'),
      m('priya', 'we were never getting the deposit back'),
      m('dan', 'genuinely going to miss you lot', W),
      m('jo', 'Dan don’t. I’ll cry on the hoovered stairs', W),
      m('jo', 'ok but seriously. we have to keep this chat going', { tag: 'keep' }),
      m('mel', 'obviously!!'),
      m('tom', 'til death'),
      r('priya', '❤️', 'keep', 400),
      s('Tom changed the group name to “marlow rd survivors”', { rename: 'marlow rd survivors' }),
      seen('priya', 'mel', 'jo', 'dan', 'tom'),
    ], chips: [
      ['obviously', [r('jo', '❤️', 'you')]],
      ['I’m keeping the clothes horse', [m('tom', 'it’s what it would have wanted'), r('priya', '😂', 'you')]],
      ['best house I’ve lived in', [m('mel', 'stoppp 😭'), m('jo', 'same. damp and all')]],
    ] },

    { day: 1150, at: 17 * 60 + 5, era: 1, base: 0.8, pause: 3000, lines: [
      m('jo', 'PUB. tomorrow night. the Crown. who’s in'),
      m('priya', 'in!!'),
      m('tom', 'in'),
      m('mel', 'in, might be late'),
      m('dan', '👍'),
      m('jo', 'and you?? you’re coming yes', { quiet: true }),
      m('mel', 'my head.', { t: 2 * 1440 - 420, d: 1800 }),
      m('tom', 'priya did you get home with the traffic cone'),
      m('priya', 'I don’t want to talk about the cone'),
      m('jo', 'that was SO good. monthly??', { tag: 'monthly' }),
      m('tom', 'monthly.'),
      m('mel', 'monthly!!'),
      m('priya', 'putting it in my calendar right now', W),
      m('tom', 'she is not putting it in her calendar', W),
      r('dan', '👍', 'monthly', 500),
      seen('mel', 'tom', 'priya', 'jo', 'dan'),
    ], chips: [
      ['in!', [m('jo', 'YES')]],
      ['monthly 🙌', [r('jo', '❤️', 'you'), m('tom', 'it’s the law now')]],
      ['what cone', [m('tom', 'you were THERE'), m('priya', 'there was no cone')]],
    ] },

    { day: 975, at: 12 * 60 + 30, era: 2, base: 0.55, pause: 3600, lines: [
      m('jo', 'ok it has been A WHILE. who’s free next month? 8th, 15th or 22nd'),
      m('tom', 'can do any of those'),
      m('tom', 'wait no. none of those'),
      m('priya', 'on nights till the 20th 😩 22nd maybe?'),
      m('mel', 'I’m in Lisbon now remember 🥲 back in the summer though!'),
      m('jo', 'oh of course!! how is it'),
      m('mel', 'so good. sunny. no damp'),
      m('jo', 'ok so 22nd for those who can?', { t: 380, d: 1500 }),
      m('tom', '22nd i’m at a wedding'),
      m('priya', 'I could maybe swap a shift?', W),
      m('tom', 'honestly the month after is better for me', W),
      m('jo', 'the month after then!!', { warm: true, tag: 'date' }),
      g('priya', 3200),
      m('jo', 'no worries, will find another date! x', { cold: true, tag: 'date' }),
      r('mel', '👍', 'date', 1800),
      seen('tom', 'mel', 'priya'),
    ], chips: [
      ['22nd works for me', [m('jo', 'ok so that’s two of us 😅')]],
      ['the month after?', [m('tom', 'yeah maybe'), r('jo', '👍', 'you')]],
      ['how’s Lisbon!', [m('mel', 'come visit!! all of you'), m('jo', 'don’t tempt me')]],
    ] },

    { day: 790, at: 7 * 60 + 12, era: 2, base: 0.7, pause: 4200, lines: [
      m('mel', 'she’s here 💛 Inês, 3.2kg, already louder than Tom', { ph: 1, tag: 'baby' }),
      m('jo', 'MEL!!!!!!'),
      r('jo', '❤️', 'baby', 200),
      m('priya', 'oh my god 😭😭 she’s perfect'),
      r('priya', '❤️', 'baby', 200),
      m('tom', 'congratulations!! she has your scowl'),
      r('tom', '❤️', 'baby', 200),
      m('dan', 'Congrats Mel 👍', { t: 190, d: 1200 }),
      m('jo', 'we have to come and meet her'),
      m('mel', 'yes please. when I’ve slept. so in about six years', { t: 300, d: 1500 }),
      m('priya', 'I’m looking at flights', W),
      r('dan', '❤️', 'baby', 900),
      seen('jo', 'priya', 'tom', 'dan'),
    ], chips: [
      ['congratulations Mel ❤️', [r('mel', '❤️', 'you', 2600)]],
      ['louder than Tom is a big claim', [m('tom', 'i’ll allow it')]],
      ['godparent duties accepted', [m('mel', 'noted 🥹', { d: 2000 })]],
    ] },

    { day: 610, at: 22 * 60 + 48, era: 3, base: 0.4, pause: 5000, lines: [
      m('tom', 'landlord just emailed me about the stain'),
      m('tom', 'it has been nearly two years', { tag: 'stain' }),
      m('priya', '😂 which stain', { t: 14, d: 2200 }),
      m('tom', 'behind the sofa. the Incident', W),
      m('priya', 'we agreed never to say Incident', W),
      g('jo', 3000),
      r('mel', '😂', 'stain', 2600),
      seen('priya', 'mel', 'jo'),
    ], chips: [
      ['tell him to open a window', [r('tom', '😂', 'you', 2400)]],
      ['it wasn’t me', [m('priya', 'it was all of us', { d: 2400 })]],
    ] },

    { day: 415, at: 9 * 60 + 2, era: 3, base: 0.35, pause: 5600, lines: [
      m('jo', 'happy birthday Priya!! 🎂🎂'),
      m('tom', 'hbd', { t: 95, d: 2200 }),
      m('priya', 'thank you loves ❤️ sorry only just seen this, work is mad', { t: 2 * 1440 + 260, d: 3200, tag: 'ty' }),
      r('jo', '❤️', 'ty', 2200),
      seen('jo', 'tom'),
    ], chips: [
      ['happy birthday Priya 🎉', [r('priya', '❤️', 'you', 5200)]],
      ['how’s work, P?', [g('priya', 3600)]],
    ] },

    { day: 248, at: 19 * 60 + 20, era: 3, base: 0.3, pause: 6200, lines: [
      m('jo', 'anyone around next weekend? I’m back in town, would be so nice to get everyone in one room', { tag: 'room' }),
      m('mel', 'ahh we’re in Lisbon till the summer 😢 next time!!', { t: 55, d: 2600 }),
      r('priya', '👍', 'room', 2600),
      s('Dan left', { leave: 'dan', t: 900, d: 3200 }),
      m('tom', 'did dan just leave', { t: 40, d: 2000 }),
      m('jo', 'I think he got a new phone'),
      m('tom', 'we should properly do something this year though', W),
      m('jo', 'YES. I’ll make a poll', W),
      g('tom', 2800),
      seen('tom', 'mel'),
    ], chips: [
      ['I’m around!', [m('jo', 'yay ok! let’s sort something x', { d: 2600 })]],
      ['next time for sure', [r('jo', '👍', 'you', 3000)]],
      ['bye Dan 🫡', [r('tom', '😂', 'you', 3000)]],
    ] },

    { day: 96, at: 8 * 60 + 47, era: 3, base: 0.2, pause: 7000, lines: [
      m('jo', 'happy birthday Priya! 🎂', { tag: 'bd' }),
      r('priya', '❤️', 'bd', 6000),
      seen('priya', 'tom'),
    ], chips: [
      ['happy birthday!', []],
      ['we should do something for it', [g('jo', 3400)]],
    ] },

    { day: 41, at: 23 * 60 + 31, era: 4, base: 0.1, pause: 8000, lines: [
      m('tom', 'what was that takeaway called. the one that did the chips in the bag'),
      pause(5000),
      g('jo', 4200),
      pause(2500),
      seen('jo', 'priya'),
    ], chips: [
      ['Golden something?', null],
      ['miss you lot', null],
      ['is anyone still here', null],
    ] },
  ];

  // What a free-typed message gets back, by how warm the chat still is.
  const POOLS = {
    hot: {
      greet: [[m('jo', 'hiya!!')], [m('tom', 'oh look who it is')]],
      q: [[m('tom', 'no idea')], [m('jo', 'ooh. don’t know. Priya?'), m('priya', 'why would I know')]],
      miss: [[m('mel', '😭❤️')], [r('priya', '❤️', 'you'), m('jo', 'same honestly')]],
      laugh: [[m('tom', 'thank you. thank you')], [r('mel', '😂', 'you')]],
      plan: [[m('jo', 'yes!! when'), m('tom', 'in')]],
      def: [[m('tom', 'big if true')], [m('priya', '😂')], [r('mel', '😂', 'you'), m('jo', 'ha')], [m('tom', 'noted'), r('jo', '👍', 'you')]],
    },
    warm: {
      greet: [[m('jo', 'hello stranger!! x')]],
      q: [[m('jo', 'ooh not sure, sorry!')], [m('tom', 'no idea mate')]],
      miss: [[m('jo', 'miss you too ❤️'), r('priya', '❤️', 'you', 1800)]],
      laugh: [[r('tom', '😂', 'you', 1500)]],
      plan: [[m('jo', 'yes we must!!'), r('tom', '👍', 'you', 1500)]],
      def: [[r('jo', '❤️', 'you', 1600)], [m('tom', 'ha', { d: 1200 })], [r('mel', '👍', 'you', 2400)]],
    },
    cool: {
      greet: [[r('jo', '👋', 'you', 4000)]],
      q: [[g('jo', 3200)], [m('jo', 'not sure sorry! x', { d: 3000 })]],
      miss: [[r('jo', '❤️', 'you', 4200)]],
      laugh: [[r('tom', '😂', 'you', 4500)]],
      plan: [[m('jo', 'definitely! let’s sort something soon x', { d: 3000 })]],
      def: [[g('priya', 2800), r('jo', '👍', 'you', 3000)], [r('tom', '👍', 'you', 5000)], [g('jo', 3400)]],
    },
  };
  const FACTOR = [1, 1, 0.8, 0.55, 0];
  const NEED = [0.8, 0.8, 0.8, 1, 9];

  // ---- state ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const logEl = $('log'), chipsEl = $('chips'), field = $('field'), sendBtn = $('send');
  const msgs = document.createElement('div');
  const typingSlot = document.createElement('div');
  const seenEl = document.createElement('div');
  seenEl.id = 'seen';
  logEl.append(msgs, typingSlot, seenEl);

  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 1 || !Array.isArray(S.log)) {
    const d = new Date();
    S = { v: 1, base: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), log: [], scene: 0,
      glow: 0, posted: 0, after: 0, ended: false, name: '14 Marlow Rd', gone: [], used: [], seen: '' };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };

  const els = [];           // dom for each log entry
  const q = [], inter = []; // the scene's remaining lines; replies owed to the visitor
  let sc = SCENES[Math.min(S.scene, SCENES.length - 1)];
  let live = S.scene > 0 ? sc : SCENES[0];
  let cur = 0, open = false, wake = null, seenList = [], typist = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const era = () => live.era;
  const temp = () => Math.max(0, Math.min(1, live.base + S.glow * 0.2));
  const slow = () => 1.55 - 0.55 * temp();

  // ---- rendering --------------------------------------------------------
  const pinned = () => logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 90;
  const toEnd = () => { logEl.scrollTop = logEl.scrollHeight; };
  const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };
  const hhmm = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function dayLabel(ts) {
    const k = dayKey(ts), now = Date.now();
    if (k === dayKey(now)) return 'Today';
    if (k === dayKey(now - DAY)) return 'Yesterday';
    return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function avatar(w, blank) {
    const a = el('span', 'av' + (blank ? ' blank' : ''), blank ? '' : P[w].n[0]);
    a.style.background = P[w].c;
    a.setAttribute('aria-hidden', 'true');
    return a;
  }
  function drawReacts(e, box) {
    box.textContent = '';
    for (const emoji of Object.keys(e.re || {})) {
      const who = e.re[emoji];
      if (!who.length) continue;
      const sp = el('span', who.includes('you') ? 'mine' : '', emoji);
      if (who.length > 1) sp.append(el('b', '', String(who.length)));
      sp.title = who.map((w) => (w === 'you' ? 'You' : P[w].n)).join(', ');
      box.append(sp);
    }
  }
  function render(e, i) {
    let node;
    if (e.k === 'd') {
      node = el('div', 'day', dayLabel(e.ts));
      // silence takes up room: the longer nobody spoke, the further down the next day starts
      if (e.gap > 1) node.style.marginTop = 'min(' + Math.round(12 + 24 * Math.log2(e.gap)) + 'px, 42vh)';
    }
    else if (e.k === 's') node = el('div', 'sys', e.x);
    else {
      const prev = S.log[i - 1];
      const first = !(prev && prev.k === 'm' && prev.w === e.w);
      const me = e.w === 'you';
      node = el('div', 'row' + (me ? ' me' : '') + (first ? ' first' : ''));
      if (!me) node.append(avatar(e.w, !first));
      const col = el('div', 'col'), bub = el('div', 'bub');
      if (!me && first) { const who = el('span', 'who', P[e.w].n); who.style.color = P[e.w].c; bub.append(who); }
      if (e.ph) { const pw = el('span', 'photowrap'); pw.append(el('span', 'photo')); pw.setAttribute('role', 'img'); pw.setAttribute('aria-label', 'Photo'); bub.append(pw); }
      bub.append(el('span', 'tx', e.x), el('span', 'tm', hhmm(e.ts)));
      const box = el('div', 'reacts');
      drawReacts(e, box);
      col.append(bub, box);
      node.append(col);
      if (!me) bub.addEventListener('click', () => heart(e));
    }
    els[i] = node;
    msgs.append(node);
  }
  function add(e) {
    const pin = pinned();
    const last = lastTs();
    if (e.ts && (!last || dayKey(last) !== dayKey(e.ts))) {
      const d = { k: 'd', ts: e.ts, gap: last ? Math.round((e.ts - last) / DAY) : 0 };
      S.log.push(d); render(d, S.log.length - 1);
    }
    S.log.push(e); render(e, S.log.length - 1);
    if (e.k === 'm') setSeen([]);
    if (pin || e.w === 'you') toEnd();
    if (S.ended) save();
    return e;
  }
  function lastTs() {
    for (let i = S.log.length - 1; i >= 0; i--) if (S.log[i].ts) return S.log[i].ts;
    return 0;
  }
  function react(e, who, emoji) {
    if (!e || S.gone.includes(who)) return;
    e.re = e.re || {};
    const list = e.re[emoji] = e.re[emoji] || [];
    if (list.includes(who)) return;
    list.push(who);
    const pin = pinned();
    drawReacts(e, els[S.log.indexOf(e)].querySelector('.reacts'));
    if (pin) toEnd();
    if (S.ended) save();
  }
  function setSeen(list, text) {
    seenList = list;
    S.seen = text != null ? text : (list.length ? 'Seen by ' + list.map((w) => P[w].n).join(', ') : '');
    const pin = pinned();
    seenEl.textContent = S.seen;
    if (pin) toEnd();
  }
  function showTyping(w) {
    const pin = pinned();
    typist = w;
    head();
    typingSlot.textContent = '';
    if (w) {
      const row = el('div', 'row first typing');
      const bub = el('div', 'bub'), dots = el('div', 'dots');
      dots.append(el('i'), el('i'), el('i'));
      bub.append(dots);
      const col = el('div', 'col');
      col.append(bub);
      row.append(avatar(w), col);
      row.setAttribute('aria-hidden', 'true');
      typingSlot.append(row);
    }
    if (pin) toEnd();
  }
  function head() {
    $('gname').textContent = S.name;
    const faces = $('faces');
    if (!faces.childElementCount) {
      for (const w of ORDER) { const f = el('span', '', P[w].n[0]); f.style.background = P[w].c; f.dataset.w = w; faces.append(f); }
      const y = el('span', '', 'Y'); y.style.background = '#6f7d45'; faces.append(y);
    }
    for (const f of faces.children) if (f.dataset.w) f.classList.toggle('gone', S.gone.includes(f.dataset.w));
    let sub = ORDER.filter((w) => !S.gone.includes(w)).map((w) => P[w].n).join(', ') + ', You';
    if (S.ended) {
      const a = new Date(lastTs()), b = new Date();
      const n = Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
      sub = 'last message ' + (n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago');
    }
    if (typist) sub = P[typist].n + ' is typing\u2026';
    $('gsub').textContent = sub;
  }
  function chips(list) {
    chipsEl.textContent = '';
    for (const [text, resp] of list) {
      if (S.used.includes(text)) continue;
      const b = el('button', '', text);
      b.type = 'button';
      b.addEventListener('click', () => { S.used.push(text); b.remove(); send(text, resp); });
      chipsEl.append(b);
    }
  }

  // ---- the visitor ------------------------------------------------------
  function stamp(t) {
    if (S.ended) { cur = Math.max(Date.now(), cur + 1000); return cur; }
    cur += (t != null ? t : rand(0.4, 1.7)) * 60000;
    return cur;
  }
  function heart(e) {
    e.re = e.re || {};
    const list = e.re['❤️'] = e.re['❤️'] || [];
    const at = list.indexOf('you');
    if (at >= 0) list.splice(at, 1);
    else {
      list.push('you');
      S.glow += 0.25 * FACTOR[era()];
      if (era() <= 1 && Math.random() < 0.4) {
        const others = ORDER.filter((w) => w !== e.w && !S.gone.includes(w));
        inter.push({ r: pick(others), e: '❤️', ent: e, d: 1400 });
        nudge();
      }
    }
    drawReacts(e, els[S.log.indexOf(e)].querySelector('.reacts'));
    if (S.ended) save();
  }
  function generic(text) {
    const t = text.toLowerCase();
    const cat = /\b(miss|love)\b/.test(t) ? 'miss'
      : /\b(pub|drinks?|dinner|meet|weekend|visit|catch up|reunion|come over)\b/.test(t) ? 'plan'
      : /\?\s*$/.test(t) ? 'q'
      : /^(hi|hey|hello|hiya|yo|morning|evening)\b/.test(t) ? 'greet'
      : /(haha|lol|lmao|😂|🤣)/.test(t) ? 'laugh' : 'def';
    const pool = POOLS[era() <= 1 ? 'hot' : era() === 2 ? 'warm' : 'cool'];
    return pick(pool[cat]);
  }
  function afterwards() {
    // After the last message, each thing you say reaches fewer people.
    S.after++;
    if (S.after === 1) return [pause(7000), seen('jo'), pause(9000), r('jo', '👍', 'you', 0), pause(6000), seen('tom')];
    if (S.after === 2) return [pause(6000), g('jo', 4500), pause(5000), seen('jo')];
    if (S.after === 3) return [pause(16000), seen('jo')];
    return [];
  }
  function send(text, resp) {
    text = text.trim().slice(0, 160);
    if (!text) return;
    add({ k: 'm', w: 'you', x: text, ts: stamp() });
    S.posted++;
    S.glow += FACTOR[era()];
    if (era() >= 3) setSeen([], 'Delivered');
    const owed = era() === 4 ? afterwards() : (resp || generic(text));
    if (era() === 4) { inter.length = 0; inter.push(...owed); }
    else if (inter.length < 7) inter.push(pause(500), ...owed);
    if (S.ended) save();
    nudge();
  }
  function nudge() { if (wake) { const w = wake; wake = null; w(); } }

  $('composer').addEventListener('submit', (ev) => {
    ev.preventDefault();
    send(field.value, null);
    field.value = '';
    sendBtn.disabled = true;
  });
  field.addEventListener('input', () => { sendBtn.disabled = !field.value.trim(); });

  // ---- playback ---------------------------------------------------------
  function find(it) {
    if (it.ent) return it.ent;
    for (let i = S.log.length - 1; i >= 0; i--) {
      const e = S.log[i];
      if (e.k !== 'm') continue;
      if (it.tag === 'you' ? e.w === 'you' : e.tag === it.tag) return e;
    }
    return null;
  }
  async function play(it) {
    if (it.pause) {
      // a quiet stretch; replies owed to the visitor can still cut in
      let left = it.pause;
      while (left > 0) {
        if (it.yield && inter.length) await play(inter.shift());
        else { await wait(200); left -= 200; }
      }
      return;
    }
    if (it.begin) {
      live = sc;
      S.glow *= 0.4;
      const b = new Date(S.base);
      cur = new Date(b.getFullYear(), b.getMonth(), b.getDate() - sc.day, 0, sc.at).getTime();
      chips(sc.chips);
      return;
    }
    if (it.warm && S.glow < NEED[era()]) return;
    if (it.cold && S.glow >= NEED[era()]) return;
    if (it.quiet && S.posted > 0) return;
    const who = it.m || it.r || it.g;
    if (who && S.gone.includes(who)) return;
    if (it.m) {
      await wait((it.d || 0) + rand(350, 900) * slow());
      showTyping(it.m);
      await wait(Math.max(800, Math.min(2600, 500 + it.x.length * 30)) * slow());
      showTyping(null);
      add({ k: 'm', w: it.m, x: it.x, ts: stamp(it.t), ph: it.ph, tag: it.tag });
      return;
    }
    if (it.r) {
      await wait(it.d != null ? it.d : 900);
      react(find(it), it.r, it.e);
      return;
    }
    if (it.s) {
      await wait((it.d || 0) + 900);
      if (it.rename) S.name = it.rename;
      if (it.leave) S.gone.push(it.leave);
      add({ k: 's', x: it.s, ts: stamp(it.t) });
      head();
      return;
    }
    if (it.g) {
      // someone starts to answer and thinks better of it
      await wait(1200);
      showTyping(it.g);
      await wait(it.d || 3000);
      showTyping(null);
      await wait(900);
      return;
    }
    if (it.seen) {
      for (const w of it.seen) {
        if (S.gone.includes(w) || seenList.includes(w)) continue;
        await wait(rand(500, 1100));
        setSeen(seenList.concat(w));
      }
      if (S.ended) save();
    }
  }
  async function run() {
    for (;;) {
      if (inter.length) { await play(inter.shift()); continue; }
      if (q.length) { await play(q.shift()); continue; }
      if (open) { open = false; S.scene++; save(); }
      if (S.scene < SCENES.length) {
        sc = SCENES[S.scene];
        q.push({ pause: sc.pause, yield: true }, { begin: true }, ...sc.lines);
        open = true;
        continue;
      }
      if (!S.ended) { S.ended = true; save(); head(); }
      await new Promise((res) => { wake = res; });
    }
  }

  // ---- start ------------------------------------------------------------
  msgs.className = 'still';
  S.log.forEach(render);
  setTimeout(() => { msgs.className = ''; }, 400);
  if (S.scene > 0) {
    live = SCENES[Math.min(S.scene, SCENES.length) - 1];
    cur = lastTs();
    chips(live.chips);
    seenEl.textContent = S.seen || '';
    const sm = S.seen && S.seen.indexOf('Seen by ') === 0 ? S.seen.slice(8).split(', ') : [];
    seenList = ORDER.filter((w) => sm.includes(P[w].n));
  }
  head();
  toEnd();
  setInterval(head, 60000);
  run();
})();
