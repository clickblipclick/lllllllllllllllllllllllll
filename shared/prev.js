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
    display: block;
    box-sizing: border-box;
    min-width: 44px;
    height: 44px;
    padding: 0 14px;
    font: 13px/42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.02em;
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    color: #fff;
    background: #000;
    border: 1px solid #fff;
    border-radius: 22px;
    box-shadow: 0 0 0 1px #000;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
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
    link.textContent = `← ${prev}`;
    link.setAttribute("aria-label", `Previous iteration, number ${prev}`);

    const root = this.attachShadow({ mode: "closed" });
    root.adoptedStyleSheets = [sheet];
    root.append(link);
  }
}

customElements.define("prev-iteration", PrevIteration);
