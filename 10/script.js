// More ancestors than people.
// Nothing here is data: every figure is a power of two, computed below.
(() => {
  const proof = document.getElementById('proof');
  const BLUE = '#1a3bd1', PINK = '#f7dde0';
  const UNIT = 18;          // the generation at which one square replaces the dots
  const LAST = 36;          // twice that: the squares run out too
  const fmt = new Intl.NumberFormat('en-US');

  const why = {
    0: 'Given: you.',
    1: 'Everyone has exactly two parents.',
    2: 'So did they.',
    3: 'And so on.',
    10: 'About the time of the oldest name anyone in the family can still tell you.',
    17: 'The marks are now smaller than this screen can make.',
    18: 'Let one square stand for all of them, and carry on.',
    19: 'So did they.',
    33: 'Not one of these could be left out. Remove any and there is no you.',
    36: 'The squares have run out as well.'
  };

  function relation(k) {
    if (k === 0) return 'you';
    if (k === 1) return 'your parents';
    if (k === 2) return 'your grandparents';
    return 'your <i>' + 'great-'.repeat(k - 2) + '</i>grandparents';
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function size() {
    const wide = innerWidth > 700;
    const room = Math.min(innerWidth, 1100) - (wide ? 60 + 16 + 250 + 30 : 56 + 14);
    return Math.max(96, Math.min(320, Math.floor(room / 2 / 8) * 8));
  }

  // m doublings laid out as a square (even) or a double square (odd)
  function block(m, S, squares) {
    const rows = 2 ** Math.floor(m / 2), cols = 2 ** Math.ceil(m / 2);
    const c = S / rows;
    const b = el('div', 'blk ' + (squares ? 'sq' : 'dots'));
    b.style.width = cols * c + 'px';
    b.style.height = S + 'px';
    b.style.backgroundSize = c + 'px ' + c + 'px';
    if (m === 0) {
      b.style.background = BLUE;
      if (!squares) b.classList.add('one');
    } else if (squares) {
      const g = c >= 3 ? Math.max(1, c * 0.12) : Math.max(0, (c - 1.2) * 0.3);
      b.style.backgroundColor = BLUE;
      if (g > 0.05) b.style.backgroundImage =
        `linear-gradient(to left, ${PINK} ${g}px, transparent ${g}px),` +
        `linear-gradient(to top, ${PINK} ${g}px, transparent ${g}px)`;
    } else {
      // dots swell to fill their cell as the cell nears a pixel
      const r = c >= 2.5 ? 38 : Math.min(72, 38 + (2.5 - c) * 26);
      b.style.backgroundImage =
        `radial-gradient(circle at center, ${BLUE} 0 ${r}%, transparent ${r + (c > 6 ? 2 : 6)}%)`;
    }
    return b;
  }

  function build() {
    const S = size();
    proof.textContent = '';
    for (let k = 0; k <= LAST; k++) {
      const li = el('li');
      const led = el('div', 'led');
      led.append(
        el('div', 'no', String(k)),
        el('div', 'count', fmt.format(2 ** k)),
        el('div', 'rel', relation(k))
      );
      if (why[k]) led.append(el('div', 'why', why[k]));
      const b = k < UNIT ? block(k, S, false) : block(k - UNIT, S, true);
      b.setAttribute('role', 'img');
      b.setAttribute('aria-label', fmt.format(2 ** k) + (k < UNIT ? ' dots' : ' people, drawn as squares of ' + fmt.format(2 ** UNIT)));
      li.append(led, b);
      proof.append(li);
    }

    const turn = el('li', 'turn');
    turn.append(
      el('p', '', 'Thirty-six sets of parents is roughly a thousand years, at the pace people usually manage it.'),
      el('p', '', 'A thousand years ago there were nowhere near this many people. There have not been since.'),
      el('p', '', 'So these are not different people. They are the same ones, arrived at by different doors, counted every time.')
    );
    proof.append(turn);

    // further back the page can only narrow; no figures, because there are none
    const taper = [
      [1, 'fewer'], [0.55, 'the same ones, again'], [0.27, 'and again'],
      [0.11, 'and again'], [0.035, 'whoever they were']
    ];
    for (const [f, words] of taper) {
      const li = el('li', 'end');
      const led = el('div', 'led');
      led.append(el('div', 'count', words));
      const b = el('div', 'blk');
      b.style.background = BLUE;
      b.style.width = Math.max(6, 2 * S * f) + 'px';
      b.style.height = Math.max(6, S * 0.3 * Math.sqrt(f)) + 'px';
      li.append(led, b);
      proof.append(li);
    }

    const fin = el('li', 'turn');
    fin.append(
      el('p', '', 'From here back, this is also the page of everyone you have ever met.'),
      el('div', 'qed', '∎')
    );
    proof.append(fin);
  }

  let lastS = 0, lastWide = null;
  function maybe() {
    const S = size(), wide = innerWidth > 700;
    if (S !== lastS || wide !== lastWide) { lastS = S; lastWide = wide; build(); }
  }
  maybe();
  addEventListener('resize', maybe);
})();
