// Still.
// A black square that is wiped out and painted again on every frame the
// screen shows, and a count of how many times that has happened. Nothing in
// the picture changes except the count.

(() => {
  const canvas = document.getElementById("wall");
  const ctx = canvas.getContext("2d", { alpha: false });
  const label = document.getElementById("label");
  const rateEl = document.getElementById("rate");
  const awayEl = document.getElementById("away");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  const FONT = '200 100px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const PALE = "#dcdcdc";

  let W = 0, H = 0, dpr = 1;
  let layout = null;

  let made = 0;          // how many times the square has been painted
  let shown = 0;         // the figure on the wall (lags when motion is reduced)
  let shownAt = 0;
  let places = 7;

  let tickFrames = 0;
  let tickStart = 0;

  let hiddenAt = 0;
  let awayMs = 0;

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const upright = H > W * 1.1;

    // The band the figure runs along. On a tall window it runs downward,
    // starting below the wall label.
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    if (upright) {
      const r = label.getBoundingClientRect();
      y0 = Math.min(H * 0.4, r.bottom + 18);
      y1 = H - 14;
    }
    const along = upright ? y1 - y0 : x1 - x0;
    const across = upright ? x1 - x0 : y1 - y0;
    const cell = along / places;

    ctx.font = FONT;
    const m = ctx.measureText("0");
    const gw = m.width / 100;
    const gh = ((m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0)) / 100;
    let size = (cell * 0.94) / gw;
    size = Math.min(size, (across * 0.8) / gh);

    const cx = Math.round((x0 + x1) / 2);
    const cy = Math.round((y0 + y1) / 2);
    const side = Math.round(Math.min(across * 0.44, along * 0.34));

    layout = {
      upright, cell, size, cx, cy, side,
      start: (upright ? y0 : x0) + cell / 2,
      rise: (gh * size) / 2,
    };
  }

  function paint() {
    const L = layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Destroy everything.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);

    // The figure.
    const text = String(shown).padStart(places, "0");
    const lead = text.length - String(shown).length;
    ctx.font = FONT.replace("100px", L.size.toFixed(2) + "px");
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (let i = 0; i < text.length; i++) {
      const p = L.start + i * L.cell;
      ctx.fillStyle = i < lead ? PALE : "#000";
      if (L.upright) {
        ctx.save();
        ctx.translate(L.cx, p);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(text[i], 0, L.rise);
        ctx.restore();
      } else {
        ctx.fillText(text[i], p, L.cy + L.rise);
      }
    }

    // Make the square again, exactly where it was. It turns over whatever
    // it lands on, so the figure reads white inside it.
    ctx.globalCompositeOperation = "difference";
    ctx.fillStyle = "#fff";
    ctx.fillRect(L.cx - L.side / 2, L.cy - L.side / 2, L.side, L.side);
    ctx.globalCompositeOperation = "source-over";
  }

  function words(n) {
    return n.toLocaleString("en-GB");
  }

  function frame(now) {
    made++;
    if (String(made).length > places) {
      places = String(made).length;
      measure();
    }

    // With reduced motion the square is still remade every frame, because
    // that is not a choice the page has; only the figure is held, and let go
    // once a second.
    if (!calm.matches || now - shownAt >= 1000 || made === 1) {
      shown = made;
      shownAt = now;
    }

    paint();

    tickFrames++;
    if (!tickStart) tickStart = now;
    const span = now - tickStart;
    if (span >= 1000) {
      const rate = Math.round((tickFrames * 1000) / span);
      rateEl.textContent = "about " + words(rate);
      tickFrames = 0;
      tickStart = now;
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else if (hiddenAt) {
      awayMs += Date.now() - hiddenAt;
      hiddenAt = 0;
      tickFrames = 0;
      tickStart = 0;
      const s = Math.round(awayMs / 1000);
      if (s >= 1) {
        awayEl.hidden = false;
        awayEl.textContent =
          "For the " + words(s) + (s === 1 ? " second" : " seconds") +
          " you were not looking, it was not made at all.";
        measure();
      }
    }
  });

  window.addEventListener("resize", measure);
  measure();
  requestAnimationFrame(frame);
})();
