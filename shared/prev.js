// The one constant across every iteration: a fixed corner link to the
// iteration before this one. Pages include it as
//   <prev-iteration n="40"></prev-iteration>
// where n is the page's own number. Iteration 0 renders nothing.
//
// Styles live in a closed shadow root and are marked !important on the host,
// so a page's own stylesheet cannot restyle or move it.

const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host {
    all: initial !important;
    position: fixed !important;
    left: max(12px, env(safe-area-inset-left)) !important;
    bottom: max(12px, env(safe-area-inset-bottom)) !important;
    z-index: 2147483647 !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    mix-blend-mode: normal !important;
    pointer-events: auto !important;
  }
  a {
    position: relative;
    display: block;
    box-sizing: border-box;
    width: 24px;
    height: 24px;
    color: #fff;
    background: #000;
    border: 1px solid #fff;
    box-shadow: 0 0 0 1px #000;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* The square is 24px, but a finger gets 44px to aim at. */
  a::before {
    content: "";
    position: absolute;
    inset: -11px;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: square;
  }
  a:hover {
    color: #000;
    background: #fff;
    border-color: #000;
    box-shadow: 0 0 0 1px #fff;
  }
  a:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #000, 0 0 0 4px #fff;
  }
`);

class PrevIteration extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "1";

    const n = Number(this.getAttribute("n"));
    if (!Number.isInteger(n) || n < 1) {
      this.hidden = true;
      return;
    }

    const prev = n - 1;
    const link = document.createElement("a");
    link.href = `/${prev}/`;
    link.innerHTML = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M16 11H6M10 7l-4 4 4 4"/></svg>';
    link.setAttribute("aria-label", `Previous iteration, number ${prev}`);

    const root = this.attachShadow({ mode: "closed" });
    root.adoptedStyleSheets = [sheet];
    root.append(link);
  }
}

customElements.define("prev-iteration", PrevIteration);

// The site's icon, the same on every page: three white strokes on black.
// It is offered twice so every browser finds one it can use: as an SVG, and
// as a PNG drawn on a canvas for browsers that ignore SVG icons. Both are
// data URLs, so there is no image file and no extra request. Pages keep the
// empty placeholder <link rel="icon" href="data:,"> from the skeleton; this
// fills it in.
const ICON_SIZE = 64;
const ICON_BARS = [12, 28, 44].map((x) => ({ x, y: 12, w: 8, h: 40 }));

function iconPng() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ICON_SIZE;
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#000";
  g.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
  g.fillStyle = "#fff";
  for (const b of ICON_BARS) g.fillRect(b.x, b.y, b.w, b.h);
  return canvas.toDataURL("image/png");
}

function iconSvg() {
  const bars = ICON_BARS.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">` +
    `<rect width="${ICON_SIZE}" height="${ICON_SIZE}"/><g fill="#fff">${bars}</g></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function setIcon() {
  for (const old of document.querySelectorAll('link[rel~="icon"]')) old.remove();

  // The PNG comes first and declares its size; the SVG comes last. Browsers
  // that understand SVG icons prefer it, and the rest fall back to the PNG.
  const png = iconPng();
  if (png) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("sizes", `${ICON_SIZE}x${ICON_SIZE}`);
    link.href = png;
    document.head.append(link);
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.setAttribute("sizes", "any");
  link.href = iconSvg();
  document.head.append(link);
}

setIcon();
