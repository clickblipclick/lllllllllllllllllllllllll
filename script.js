// Your call is important to us.
// A desk telephone and the automated system on the other end of it.
// Everything heard is synthesised here; nothing is loaded.
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const handset = $('#handset'), lamp = $('#lamp'), said = $('#said');
const rows = [...document.querySelectorAll('.lcd .row')];
const keyEls = {};
document.querySelectorAll('.keys button').forEach((b) => { keyEls[b.dataset.k] = b; });

// ---------- the call log, kept between visits ----------
let log = { made: 0, ended: 0, held: 0 };
try { log = Object.assign(log, JSON.parse(localStorage.getItem('l7-log') || '{}')); } catch (e) {}
const saveLog = () => { try { localStorage.setItem('l7-log', JSON.stringify(log)); } catch (e) {} };

// ---------- the display: four rows of twenty ----------
const W = 20;
const pad = (s) => (s + ' '.repeat(W)).slice(0, W);
const row = (i, s) => { const t = pad(s); if (rows[i].textContent !== t) rows[i].textContent = t; };
const lr = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - String(r).length)) + r;
const mmss = (ms) => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function idleScreen(last) {
  row(0, lr('CALLS MADE', log.made));
  row(1, lr('ENDED BY CALLER', log.ended));
  row(2, lr('RESOLVED', 0));
  row(3, last || (log.held > 0 ? lr('TIME ON HOLD', mmss(log.held)) : 'LIFT HANDSET TO CALL'));
}

// ---------- state ----------
const CANCEL = { cancel: true };
let offHook = false, tok = 0, waiter = null, buf = [];
let callStart = 0, mode = 'idle', pos = 0, holdMs = 0, holdSince = 0, mash = 0;
let ringing = false, ringTimer = 0, surveyDue = false, missed = 0;

const wait = (ms) => { const t = tok; return new Promise((res, rej) => setTimeout(() => (t === tok ? res() : rej(CANCEL)), ms)); };
function key(ms) {
  const t = tok;
  if (buf.length) return Promise.resolve(buf.shift());
  return new Promise((res, rej) => {
    const id = setTimeout(() => { waiter = null; t === tok ? res(null) : rej(CANCEL); }, ms);
    waiter = { res: (k) => { clearTimeout(id); waiter = null; res(k); }, rej: () => { clearTimeout(id); waiter = null; rej(CANCEL); } };
  });
}
const run = (f) => f().catch((e) => { if (e !== CANCEL) throw e; });

// ---------- sound ----------
let ac = null, out, callBus = null, noiseBuf, wow, wowGain;
function audio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  ac = new AC();
  out = ac.createGain(); out.gain.value = 0.55; out.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  wow = ac.createOscillator(); wow.frequency.value = 0.63;
  wowGain = ac.createGain(); wowGain.gain.value = 0;
  wow.connect(wowGain); wow.start();
}
// everything from the far end comes down one narrow line, and dies with the call
function openLine() {
  closeLine();
  const g = ac.createGain();
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 330;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300;
  g.connect(hp); hp.connect(lp); lp.connect(out);
  callBus = g; callBus.tail = lp;
}
function closeLine() {
  if (!callBus) return;
  try { callBus.gain.setValueAtTime(0, ac.currentTime); callBus.tail.disconnect(); } catch (e) {}
  callBus = null;
}
function tone(freqs, t, dur, gain = 0.12, dest = callBus) {
  if (!dest) return;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.setValueAtTime(gain, t + dur - 0.01); g.gain.linearRampToValueAtTime(0, t + dur);
  g.connect(dest);
  for (const f of freqs) { const o = ac.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + 0.02); }
}
function click(t, gain = 0.3, dest = callBus) {
  if (!dest) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  s.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, 0.06);
}
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] };
const dtmf = (k, t = ac.currentTime, dur = 0.13) => tone(DTMF[k], t, dur, 0.09);

// the recorded voice: you can hear exactly what it is saying without one word of it
const VOWELS = [[730, 1090], [270, 2290], [530, 1840], [570, 840], [300, 870], [440, 1020], [660, 1720]];
function syllable(t, f0, dur, fall) {
  if (!callBus) return;
  const v = VOWELS[(Math.random() * VOWELS.length) | 0];
  const o = ac.createOscillator(); o.type = 'sawtooth';
  const a = f0 * (1 + (Math.random() - 0.4) * 0.16);
  o.frequency.setValueAtTime(a, t);
  o.frequency.linearRampToValueAtTime(a * (fall ? 0.8 : 0.94 + Math.random() * 0.14), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.02);
  g.gain.setValueAtTime(0.5, t + dur - 0.04); g.gain.linearRampToValueAtTime(0, t + dur);
  for (const [f, q] of [[v[0], 6], [v[1], 9]]) {
    const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
    o.connect(b); b.connect(g);
  }
  g.connect(callBus); o.start(t); o.stop(t + dur + 0.02);
}

// wrap into pages of three rows of twenty
function pages(text) {
  const out = [[]]; let line = '';
  const words = text.toUpperCase().split(' ');
  const where = [];
  for (const w of words) {
    if (line && (line + ' ' + w).length > W) {
      out[out.length - 1].push(line); line = '';
      if (out[out.length - 1].length === 3) out.push([]);
    }
    line = line ? line + ' ' + w : w;
    where.push([out.length - 1, out[out.length - 1].length, line.length]);
  }
  out[out.length - 1].push(line);
  return { out, where };
}
async function say(text, o = {}) {
  const f0 = o.f0 || 208, barge = !!o.barge;
  if (!barge) buf.length = 0;
  said.textContent = text;
  const { out: pg, where } = pages(text);
  const words = text.split(' ');
  let cur = -1;
  for (let i = 0; i < words.length; i++) {
    if (barge && buf.length) break;
    const [p, l, n] = where[i];
    if (p !== cur) { cur = p; row(1, ''); row(2, ''); row(3, ''); }
    row(1 + l, pg[p][l].slice(0, n));
    const letters = words[i].replace(/[^a-z0-9]/gi, '').length;
    const syl = Math.max(1, Math.round(letters / 3.2));
    const last = i === words.length - 1 || /[.?]$/.test(words[i]);
    const t = ac.currentTime + 0.02;
    for (let s = 0; s < syl; s++) syllable(t + s * 0.125, f0 * (1 - 0.1 * i / words.length), 0.115, last && s === syl - 1);
    await wait(syl * 125 + 45 + (/[.?]$/.test(words[i]) ? 330 : /,$/.test(words[i]) ? 170 : 0));
  }
  if (!barge) buf.length = 0;
  await wait(o.after == null ? 350 : o.after);
}

// ---------- the hold music ----------
// eight bars, always from the top. The longer you have held, the worse the tape.
const BARS = [
  { ch: [60, 64, 67, 71], bass: 48, mel: [76, 0, 79, 0, 76, 74, 0, 72] },
  { ch: [60, 64, 67, 71], bass: 48, mel: [0, 71, 72, 0, 76, 0, 0, 0] },
  { ch: [62, 65, 69, 72], bass: 50, mel: [77, 0, 81, 0, 77, 76, 0, 74] },
  { ch: [59, 62, 65, 67], bass: 55, mel: [0, 72, 74, 0, 71, 0, 0, 0] },
  { ch: [59, 62, 64, 67], bass: 52, mel: [79, 0, 83, 0, 79, 77, 0, 76] },
  { ch: [61, 64, 67, 69], bass: 57, mel: [0, 73, 76, 0, 81, 0, 79, 0] },
  { ch: [62, 65, 69, 72], bass: 50, mel: [77, 0, 76, 74, 0, 72, 74, 0] },
  { ch: [59, 62, 65, 67], bass: 55, mel: [71, 0, 74, 0, 67, 0, 0, 0] },
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const decay = () => Math.max(0, Math.min(1, (holdMs + (holdSince ? performance.now() - holdSince : 0)) / 130000 + mash * 0.07));
let music = null, scroll = '';
function note(dest, t, f, dur, gain, type, d) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
  wowGain.connect(o.detune);
  if (d > 0.3) o.detune.setValueAtTime((Math.random() - 0.5) * 90 * d, t);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(gain * 0.25, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
}
function startMusic() {
  stopMusic();
  if (!callBus) return;
  const d = decay();
  const g = ac.createGain(); g.gain.value = 0.55;
  const sh = ac.createWaveShaper();
  const n = Math.round(40 - 35 * d), c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = d < 0.12 ? x : Math.round(x * n) / n; }
  sh.curve = c;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400 - 2100 * d;
  g.connect(sh); sh.connect(lp); lp.connect(callBus);
  wowGain.gain.setValueAtTime(d * d * 70, ac.currentTime);
  wow.frequency.setValueAtTime(0.63 + d * 2.2, ac.currentTime);
  const m = { g, step: 0, next: ac.currentTime + 0.12, d, timer: 0 };
  scroll = '';
  const tick = () => {
    if (m.next < ac.currentTime) m.next = ac.currentTime + 0.05;
    while (m.next < ac.currentTime + 0.3) {
      const bar = BARS[(m.step >> 3) % 8], s = m.step & 7, even = (m.step >> 3) & 1, t = m.next;
      const eighth = 0.258 * (1 + d * 0.22) * (1 + (Math.random() - 0.5) * d * 0.3);
      let p = bar.mel[s];
      if (p && Math.random() < d * 0.38) p = 0;
      if (p && Math.random() < d * 0.22) p += Math.random() < 0.5 ? -1 : 1;
      if (p) { note(g, t, hz(p), eighth * 2.2, 0.2, 'triangle', d); note(g, t, hz(p) * 2, eighth * 1.2, 0.05, 'sine', d); }
      if ((even ? [2, 5] : [0, 3, 6]).includes(s) && Math.random() > d * 0.3) for (const q of bar.ch) note(g, t, hz(q), eighth * 1.6, 0.05, 'sine', d);
      if (s === 0 || s === 4) note(g, t, hz(bar.bass), eighth * 2.4, 0.2, 'triangle', d);
      if (s === 3 || s === 7) note(g, t, hz(bar.bass + 7), eighth * 1.2, 0.14, 'triangle', d);
      const hat = ac.createBufferSource(); hat.buffer = noiseBuf;
      const hg = ac.createGain(); hg.gain.setValueAtTime(s % 2 ? 0.05 : 0.025, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      const hf = ac.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 2500;
      hat.connect(hf); hf.connect(hg); hg.connect(g); hat.start(t, Math.random() * 0.5, 0.05);
      // the line drops out, then comes back as if nothing had happened
      if (s === 0 && d > 0.4 && Math.random() < (d - 0.3) * 0.5) {
        const len = 0.25 + Math.random() * 0.7;
        g.gain.setValueAtTime(0, t + eighth); g.gain.setValueAtTime(0.55, t + eighth + len);
      }
      scroll = (scroll + (p ? "_.-~'^"[Math.max(0, Math.min(5, Math.round((p - 67) / 3.2)))] : ' ')).slice(-W);
      m.step++; m.next += eighth;
    }
    if (mode === 'hold') { row(1, scroll.padStart(W)); row(3, lr('TIME ON HOLD', mmss(holdMs + performance.now() - holdSince))); }
  };
  m.timer = setInterval(tick, 70); tick();
  music = m;
}
function stopMusic() {
  if (!music) return;
  clearInterval(music.timer);
  try { music.g.gain.cancelScheduledValues(ac.currentTime); music.g.gain.setValueAtTime(0, ac.currentTime); music.g.disconnect(); } catch (e) {}
  music = null;
}

// ---------- line signals ----------
function ringback(t) { tone([400, 450], t, 0.4); tone([400, 450], t + 0.6, 0.4); }
function deadLine() { const t = ac.currentTime + 0.1; for (let i = 0; i < 400; i++) tone([400], t + i * 0.75, 0.38, 0.1); }
let dial = null;
function dialTone(on) {
  if (dial) { try { dial.gain.setValueAtTime(0, ac.currentTime); dial.disconnect(); } catch (e) {} dial = null; }
  if (!on || !callBus) return;
  dial = ac.createGain(); dial.gain.value = 0.09; dial.connect(callBus);
  for (const f of [350, 440]) { const o = ac.createOscillator(); o.frequency.value = f; o.connect(dial); o.start(); }
}
// the phone's own ringer, on the desk, not down the line
function bell() {
  const t = ac.currentTime + 0.05;
  const g = ac.createGain(); g.gain.value = 0; g.connect(out);
  const o = ac.createOscillator(); o.type = 'square'; o.connect(g);
  for (let i = 0; i < 22; i++) o.frequency.setValueAtTime(i % 2 ? 1320 : 1090, t + i * 0.045);
  g.gain.setValueAtTime(0.045, t); g.gain.setValueAtTime(0.045, t + 0.95); g.gain.linearRampToValueAtTime(0, t + 1);
  o.start(t); o.stop(t + 1.05);
}

// ---------- status row ----------
setInterval(() => {
  if (mode === 'conn') row(0, lr('CONNECTED', mmss(performance.now() - callStart)));
  else if (mode === 'hold') row(0, lr('ON HOLD  NO.' + String(pos).padStart(2, '0'), mmss(performance.now() - callStart)));
}, 250);
const clear = () => { row(1, ''); row(2, ''); row(3, ''); };

// ---------- the system ----------
const SORRY = ["Sorry, I didn't get that.", "Sorry, that is not a valid option.", "Sorry, I didn't quite catch that."];
let sorryN = 0;
const sorry = () => say(SORRY[sorryN++ % SORRY.length]);
const LINES = [
  () => 'Your call is important to us.',
  () => 'You are number ' + pos + ' in the queue.',
  () => 'We are experiencing higher than normal call volumes.',
  () => 'Did you know you can do most things on our website?',
  () => 'Thank you for your patience. You are number ' + pos + ' in the queue.',
  () => 'Calls may be recorded for training purposes.',
  () => 'Your call is very important to us. Please continue to hold.',
  () => 'An agent will be with you as soon as possible. You are number ' + pos + '.',
];
let lineN = 0;
const SCOLD = [
  () => 'Sorry, I didn\'t get that. Please continue to hold.',
  () => 'There is no need to press any keys while you are holding.',
  () => { pos += 3; return 'You have been moved to the back of the queue. You are number ' + pos + '.'; },
  () => 'To hear music, press nothing.',
];

// hold from one queue position to another. dir is which way the queue is moving.
async function hold(from, to, dir = -1) {
  pos = from; mode = 'hold'; clear();
  await say('Please hold.');
  holdSince = performance.now();
  for (;;) {
    clear(); startMusic();
    const k = await key(8500 + Math.random() * 2500);
    stopMusic(); click(ac.currentTime, 0.12);
    await wait(260);
    if (k !== null) {
      if (dir > 0) break; // the only queue you can leave by pressing something
      mash++;
      await say(k === '0' && mash < 3 ? 'To speak to an agent, please continue to hold.' : SCOLD[(mash - 1) % SCOLD.length]());
      continue;
    }
    pos += dir;
    if (dir < 0 && pos <= to) break;
    await say(LINES[lineN++ % LINES.length]());
  }
  holdMs += performance.now() - holdSince; holdSince = 0;
  mode = 'conn'; clear();
}

async function digits(max, ms) {
  let got = '';
  for (;;) {
    const k = await key(got ? 5000 : ms);
    if (k === null || k === '#') break;
    got += k; row(3, got.slice(-W));
    if (got.length >= max) break;
  }
  return got;
}

let transfers = 0;
async function mainMenu() {
  for (;;) {
    await say('For billing, press 1. For faults, press 2. To cancel your account, press 3. To hear these options again, press 4.', { barge: true, after: 0 });
    const k = await key(6500);
    if (k === '1') return billing();
    if (k === '2') return faults();
    if (k === '3') { await cancelling(); continue; }
    if (k === '4') continue;
    if (k === '0') { await say('To speak to an agent, please choose from the following options.'); continue; }
    await sorry();
  }
}
async function billing() {
  await say('Billing.');
  for (let i = 0; i < 2; i++) {
    await say('Please enter your 16 digit account number, followed by the hash key.', { barge: true, after: 0 });
    const got = await digits(16, 9000);
    await wait(500);
    if (i === 0) await say(got ? 'Sorry, that number was not recognised.' : "Sorry, I didn't get that.");
    else await say('Thank you.');
  }
  if (transfers >= 2) return agent();
  await hold(7 - transfers, 4 - transfers);
  transfers++;
  await say('It looks like this query is handled by our faults team. Transferring you now.');
  await transfer();
  return faults();
}
async function faults() {
  await say('Faults.');
  for (;;) {
    await say('Have you tried turning it off and on again? If yes, press 1. If no, press 2.', { barge: true, after: 0 });
    const k = await key(7000);
    if (k === '1') break;
    if (k === '2') { await say("Please try that now. I'll wait."); await wait(4500); continue; }
    await sorry();
  }
  if (transfers >= 2) return agent();
  await hold(6 - transfers, 3 - transfers);
  transfers++;
  await say('There is an outstanding question on your account. Transferring you to billing.');
  await transfer();
  return billing();
}
async function cancelling() {
  await say("We're sorry to hear that.");
  await say('To hear about our exciting offers, press 1. To continue cancelling, press 1.', { barge: true, after: 0 });
  await key(7000);
  await say('Thank you. Transferring you to our loyalty team. To return to the main menu at any time, press any key.');
  await hold(12, 0, +1);
  await say('Returning you to the main menu.');
}
async function transfer() {
  clear(); click(ac.currentTime); await wait(700);
  ringback(ac.currentTime); await wait(2600);
  click(ac.currentTime); await wait(400);
}
async function agent() {
  await hold(4, 1);
  await say('Thank you for holding. Connecting you to an agent now.');
  clear(); click(ac.currentTime); await wait(600);
  ringback(ac.currentTime); await wait(3000); ringback(ac.currentTime); await wait(2200);
  const now = new Date(), h = now.getHours(), day = now.getDay();
  if (h < 9 || h >= 17 || day === 0 || day === 6) {
    click(ac.currentTime); await wait(500);
    await say('Our offices are now closed. Our opening hours are 9 to 5, Monday to Friday. Thank you for calling. Goodbye.');
  } else {
    // a person: lower, closer, in a room
    click(ac.currentTime, 0.4);
    const room = ac.createBufferSource(); room.buffer = noiseBuf; room.loop = true;
    const rg = ac.createGain(); rg.gain.value = 0.02; room.connect(rg); rg.connect(callBus); room.start();
    await wait(900);
    await say("Hello, you're through to", { f0: 128, after: 0 });
    row(1, "HELLO, YOU'RE");
    row(2, 'THROUGH TO -');
    rg.gain.setValueAtTime(0, ac.currentTime); click(ac.currentTime, 0.5);
    await wait(1900);
  }
  mode = 'dead';
  deadLine();
  row(0, lr('DISCONNECTED', mmss(performance.now() - callStart)));
  row(1, ''); row(2, 'PLEASE REPLACE'); row(3, 'THE HANDSET');
  said.textContent = 'The line has been disconnected. Please replace the handset.';
}

async function outgoing() {
  log.made++; saveLog();
  transfers = 0; holdMs = 0; holdSince = 0; mash = 0; lineN = 0; sorryN = 0;
  mode = 'dialling';
  row(0, 'DIALLING'); clear();
  dialTone(true); await wait(900); dialTone(false);
  const num = '08005550199';
  for (let i = 0; i < num.length; i++) {
    dtmf(num[i], ac.currentTime, 0.08);
    row(1, (num.slice(0, 4) + ' ' + num.slice(4, 7) + ' ' + num.slice(7)).slice(0, i + 1 + (i > 3) + (i > 6)));
    await wait(125);
  }
  await wait(700);
  ringback(ac.currentTime); await wait(3000); ringback(ac.currentTime); await wait(1800);
  click(ac.currentTime); callStart = performance.now(); mode = 'conn'; lamp.className = 'lamp on';
  await wait(600);
  await say(log.made > 1 ? 'Thank you for calling again. Your call is still important to us.' : 'Thank you for calling. Your call is important to us.');
  await say('Please listen carefully, as our menu options have recently changed.');
  await mainMenu();
}

async function survey() {
  mode = 'conn'; callStart = performance.now(); lamp.className = 'lamp on';
  row(0, ''); clear();
  click(ac.currentTime); await wait(700);
  await say('Hello. This is a short survey about your recent call.');
  await say('On a scale of 1 to 5, where 5 is very satisfied, how satisfied were you?', { barge: true, after: 0 });
  const k = await key(8000);
  if (k === null) await say("We'll take that as a 5.");
  else await say('You pressed 5.');
  await say("Thank you. We're glad we could help. Goodbye.");
  click(ac.currentTime); mode = 'dead'; lamp.className = 'lamp';
  await wait(1200);
  row(0, 'CALL ENDED'); clear(); row(2, 'BY CUSTOMER CARE');
  dialTone(true);
}

// ---------- the handset ----------
function lift() {
  audio();
  offHook = true; tok++; buf.length = 0;
  handset.setAttribute('aria-pressed', 'true');
  handset.setAttribute('aria-label', 'Handset. Put down to hang up.');
  cord();
  openLine();
  clearTimeout(ringTimer);
  if (ringing) { ringing = false; lamp.className = 'lamp'; run(survey); }
  else { surveyDue = false; run(outgoing); }
}
function hangUp() {
  const was = mode, dur = callStart ? performance.now() - callStart : 0;
  log.held += holdMs + (holdSince ? performance.now() - holdSince : 0); holdMs = 0; holdSince = 0; saveLog();
  offHook = false; tok++;
  if (waiter) waiter.rej();
  buf.length = 0;
  stopMusic(); dialTone(false); closeLine();
  handset.setAttribute('aria-pressed', 'false');
  handset.setAttribute('aria-label', 'Handset. Lift to call.');
  cord();
  lamp.className = 'lamp';
  const real = was === 'conn' || was === 'hold' || was === 'dead' || was === 'dialling';
  if (real && !surveyCall) {
    log.ended++; saveLog();
    idleScreen(was === 'dialling' ? '' : lr('LAST CALL', mmss(dur)));
    if (dur > 20000) { surveyDue = true; ringTimer = setTimeout(startRinging, 6500); }
  } else idleScreen();
  surveyCall = false; mode = 'idle'; callStart = 0;
  said.textContent = 'Call ended by caller. Calls made ' + log.made + '. Ended by caller ' + log.ended + '. Resolved 0.';
}
let surveyCall = false;
function startRinging() {
  if (offHook || !surveyDue) return;
  surveyDue = false; ringing = true; surveyCall = true;
  lamp.className = 'lamp ring';
  row(0, 'INCOMING CALL'); row(1, ''); row(2, 'CUSTOMER CARE'); row(3, '');
  said.textContent = 'Incoming call from customer care.';
  let n = 0;
  const go = () => {
    if (!ringing) return;
    if (n++ >= 6) {
      ringing = false; surveyCall = false; missed++; lamp.className = 'lamp';
      idleScreen(lr('MISSED CALLS', missed));
      return;
    }
    bell(); ringTimer = setTimeout(go, 3000);
  };
  go();
}

handset.addEventListener('click', () => (offHook ? hangUp() : lift()));

function press(k) {
  const el = keyEls[k];
  if (!el) return;
  el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 110);
  if (!offHook || !ac || !callBus) return;
  if (mode === 'dialling' || mode === 'dead') { if (mode === 'dead') dtmf(k); return; }
  dtmf(k);
  if (waiter) waiter.res(k); else if (buf.length < 4) buf.push(k);
}
document.querySelectorAll('.keys button').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[0-9*#]$/.test(e.key)) press(e.key);
  else if (e.key === 'Escape' && offHook) hangUp();
});

// ---------- the cord ----------
const cordEl = $('#cord');
cordEl.setAttribute('viewBox', '0 0 60 60');
cordEl.innerHTML = '<path stroke="rgba(60,20,0,.35)" stroke-width=".42" transform="translate(.12 .3)"/><path stroke="#cfc3a6" stroke-width=".3"/>';
function cord() {
  const em = parseFloat(getComputedStyle($('#phone')).fontSize);
  const margin = (innerWidth - 21 * em) / 2 / em;
  cordEl.style.display = margin < 2.6 ? 'none' : '';
  const bulge = Math.max(0.2, Math.min(6, margin - 1.1));
  const a = offHook ? [29.9, 11.6] : [31.2, 13.4], b = [30.6, 33.5];
  const c1 = [a[0] - bulge * 1.5, a[1] + 7], c2 = [b[0] - bulge * 1.6 - 0.4, b[1] - 9];
  const r = Math.min(0.5, 0.2 + bulge * 0.12);
  let dd = '';
  const N = 520, turns = 46;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0];
    const y = u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1];
    const env = Math.min(1, t * 14, (1 - t) * 14), ph = t * turns * Math.PI * 2;
    dd += (i ? 'L' : 'M') + (x + Math.cos(ph) * r * env).toFixed(2) + ' ' + (y + Math.sin(ph) * r * 0.55 * env).toFixed(2);
  }
  cordEl.querySelectorAll('path').forEach((p) => p.setAttribute('d', dd));
}
addEventListener('resize', cord);
cord();
idleScreen();

// if the page is put away mid-call the timers stall; the line simply waits, as lines do
document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && ac.state === 'suspended' && offHook) ac.resume(); });
})();
