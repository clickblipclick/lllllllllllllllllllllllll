// Now serving.
// A queue that only moves while nobody is watching it. The number on the sign
// advances one place for every STEP of time this page spends hidden or closed,
// and never while it is visible. So your number can only be called when you
// are not here to answer it.
(() => {
  const STEP = 15000; // one number per fifteen seconds unwatched
  const KEY = "l25.5.queue";
  const TITLE = document.title;
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n % 1000).padStart(3, "0");
  const hhmm = (t) => {
    const d = new Date(t);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  // ---- state -------------------------------------------------------------
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* no memory */ }
  if (!s || typeof s.serving !== "number" || typeof s.ticket !== "number") {
    const serving = 23 + Math.floor(Math.random() * 40);
    s = { serving, ticket: serving + 4, issued: Date.now(), away: null, missed: [] };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* fine */ } };

  // where the sign would be if it had been advancing since s.away
  const servingAt = (now) => s.away == null ? s.serving : s.serving + Math.max(0, Math.floor((now - s.away) / STEP));

  function leave() {
    if (s.away == null) { s.away = Date.now(); save(); }
  }
  function comeBack() {
    if (s.away == null) return;
    const now = Date.now();
    const before = s.serving;
    s.serving = servingAt(now);
    if (s.serving >= s.ticket) {
      // it was called while you were gone
      s.missed.push({ n: s.ticket, at: s.away + (s.ticket - before) * STEP });
      if (s.missed.length > 40) s.missed = s.missed.slice(-40);
      s.ticket = s.serving + 4 + Math.min(s.missed.length, 12); // the room has filled up
      s.issued = now;
    }
    s.away = null;
    save();
  }

  // ---- seven-segment digits ---------------------------------------------
  const NS = "http://www.w3.org/2000/svg";
  const H = (c) => `10,${c} 15,${c - 5} 45,${c - 5} 50,${c} 45,${c + 5} 15,${c + 5}`;
  const V = (x, a, b) => `${x},${a} ${x + 5},${a + 5} ${x + 5},${b - 5} ${x},${b} ${x - 5},${b - 5} ${x - 5},${a + 5}`;
  const SEG = [H(8), V(52, 10, 48), V(52, 52, 90), H(92), V(8, 52, 90), V(8, 10, 48), H(50)]; // a b c d e f g
  const MAP = ["1111110", "0110000", "1101101", "1111001", "0110011", "1011011", "1011111", "1110000", "1111111", "1111011"];
  const cells = [];
  for (let i = 0; i < 3; i++) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 60 100");
    const polys = SEG.map((p) => {
      const el = document.createElementNS(NS, "polygon");
      el.setAttribute("points", p);
      svg.appendChild(el);
      return el;
    });
    $("digits").appendChild(svg);
    cells.push(polys);
  }

  // ---- drawing -----------------------------------------------------------
  function render() {
    const shown = pad(s.serving);
    cells.forEach((polys, i) => {
      const bits = MAP[+shown[i]];
      polys.forEach((p, j) => p.classList.toggle("on", bits[j] === "1"));
    });
    $("sign").setAttribute("aria-label", "Now serving " + shown);
    $("mine").textContent = pad(s.ticket);
    $("issued").textContent = "Issued " + hhmm(s.issued);

    const last = s.missed[s.missed.length - 1];
    const ns = $("noshow");
    ns.hidden = !last;
    if (last) ns.textContent = pad(last.n) + " called " + hhmm(last.at) + " — no answer";

    // the tickets you have already held, fanned out behind the live one
    const voids = $("voids");
    voids.textContent = "";
    s.missed.slice(-3).forEach((m, i, a) => {
      const d = document.createElement("div");
      d.className = "void";
      const k = a.length - i; // oldest furthest out
      d.style.transform = `rotate(${-3 + k * 5}deg) translate(${k * 5}%, ${-k * 1.2}vh)`;
      const sp = document.createElement("span");
      sp.textContent = pad(m.n);
      d.appendChild(sp);
      voids.appendChild(d);
    });
  }

  // ---- the clock: the only thing that moves while you watch --------------
  const ticks = $("ticks");
  for (let i = 0; i < 12; i++) {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", 0); l.setAttribute("x2", 0);
    l.setAttribute("y1", -42); l.setAttribute("y2", i % 3 ? -38 : -34);
    l.setAttribute("transform", `rotate(${i * 30})`);
    ticks.appendChild(l);
  }
  function clock() {
    const d = new Date();
    const sec = d.getSeconds(), min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
    $("sh").setAttribute("transform", `rotate(${sec * 6})`);
    $("mh").setAttribute("transform", `rotate(${min * 6})`);
    $("hh").setAttribute("transform", `rotate(${hr * 30})`);
  }

  // ---- watching and not watching ----------------------------------------
  let titleTimer = 0;
  function away() {
    leave();
    // the tab's label is the one place the truth shows while you are elsewhere
    const tell = () => { document.title = "Now serving " + pad(servingAt(Date.now())); };
    tell();
    clearInterval(titleTimer);
    titleTimer = setInterval(tell, 1000);
  }
  function here() {
    clearInterval(titleTimer);
    document.title = TITLE;
    comeBack();
    render();
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? away() : here()));
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", () => { if (!document.hidden) here(); });

  if (document.hidden) away(); else { comeBack(); save(); }
  render();
  clock();
  setInterval(clock, 1000);
})();
