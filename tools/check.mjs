// Checks one iteration folder against the rules in the README.
//
//   node tools/check.mjs <n>                 static checks + browser checks
//   node tools/check.mjs <n> --static-only   static checks only
//
// Exits 0 if the iteration passes, 1 otherwise.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, FILES, CSP } from "./rules.mjs";
import { serve } from "./serve.mjs";

const count = (text, re) => (text.match(re) || []).length;

export function staticCheck(n) {
  const problems = [];
  const dir = path.join(ROOT, String(n));

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [`folder /${n}/ does not exist`];
  }

  const present = fs.readdirSync(dir).sort();
  if (present.join() !== FILES.join()) {
    problems.push(`/${n}/ must contain exactly ${FILES.join(", ")} (found: ${present.join(", ") || "nothing"})`);
    return problems;
  }

  const text = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
  const html = text["index.html"];

  // No address of any other server, anywhere. XML namespace names are the
  // one exception: they are identifiers and are never fetched.
  for (const f of FILES) {
    for (const m of text[f].matchAll(/\b(?:https?|wss?|ftp):\/\/[^\s"'`)<>\\]+/gi)) {
      if (!m[0].startsWith("http://www.w3.org/")) problems.push(`${f}: outside address ${m[0]}`);
    }
    for (const m of text[f].matchAll(/["'(=]\s*\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi)) {
      problems.push(`${f}: protocol-relative address ${m[0].replace(/^["'(=]\s*/, "")}`);
    }
  }
  if (/@import/i.test(text["style.css"])) problems.push("style.css: @import is not allowed");

  // Page skeleton.
  if (!/^\s*<!doctype html>/i.test(html)) problems.push("index.html: must start with <!doctype html>");
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`)) {
    problems.push("index.html: the Content-Security-Policy meta tag is missing or altered (copy it from the README)");
  }
  if (count(html, /<meta[^>]+http-equiv/gi) !== 1) problems.push("index.html: only the one http-equiv meta tag is allowed");
  if (!/<title>[^<]*\S[^<]*<\/title>/i.test(html)) problems.push("index.html: needs a non-empty <title>");

  const links = html.match(/<link\b[^>]*>/gi) || [];
  const wantLinks = ['<link rel="icon" href="data:,">', '<link rel="stylesheet" href="style.css">'];
  if (links.length !== 2 || !wantLinks.every((l) => links.includes(l))) {
    problems.push(`index.html: must have exactly these <link> tags: ${wantLinks.join(" ")}`);
  }

  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  const isShared = (s) => s === '<script src="/shared/prev.js"></script>';
  const isOwn = (s) => /^<script( type="module")? src="script\.js"( defer)?><\/script>$/.test(s);
  if (scripts.length !== 2 || !scripts.some(isShared) || !scripts.some(isOwn)) {
    problems.push('index.html: must have exactly two scripts: <script src="/shared/prev.js"></script> and <script src="script.js"></script> (the latter may add type="module" or defer)');
  }

  if (count(html, /<prev-iteration\b/gi) !== 1 || !html.includes(`<prev-iteration n="${n}"></prev-iteration>`)) {
    problems.push(`index.html: must contain exactly one <prev-iteration n="${n}"></prev-iteration>`);
  }

  for (const tag of ["style", "img", "picture", "video", "audio", "source", "track", "iframe", "frame", "object", "embed", "base"]) {
    if (new RegExp(`<${tag}\\b`, "i").test(html)) problems.push(`index.html: <${tag}> is not allowed`);
  }
  if (/\son[a-z]+\s*=/i.test(html.replace(/<title>[\s\S]*?<\/title>/i, ""))) {
    problems.push("index.html: inline event handler attributes are not allowed (attach them in script.js)");
  }

  return problems;
}

export async function browserCheck(n) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return ["browser check could not run: playwright is not installed (run `npm install`, then `npx playwright install chromium`)"];
  }

  let browser;
  try {
    // Use an already-installed Chrome when CHROME_PATH names one; otherwise
    // the browser downloaded by `npx playwright install chromium`.
    const executablePath = process.env.CHROME_PATH || undefined;
    browser = await chromium.launch({ executablePath });
  } catch (e) {
    return [`browser check could not run: ${e.message.split("\n")[0]} (run \`npx playwright install chromium\`, or set CHROME_PATH to an installed Chrome)`];
  }

  const problems = [];
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const allowed = new Set([`/${n}/`, `/${n}/style.css`, `/${n}/script.js`, "/shared/prev.js"]);

  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const where = `${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let watching = true;
      const note = (msg) => watching && problems.push(`[${where}] ${msg}`);

      page.on("pageerror", (e) => note(`uncaught error: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && note(`console error: ${m.text()}`));
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (!watching || (url.origin === origin && allowed.has(url.pathname))) return route.continue();
        note(`request for something other than its own files: ${url.href}`);
        return route.abort();
      });

      await page.goto(`${origin}/${n}/`, { waitUntil: "load" });
      await page.waitForTimeout(2500);

      const button = await page.evaluate(() => {
        const el = document.querySelector("prev-iteration");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          left: r.left, bottom: innerHeight - r.bottom, width: r.width, height: r.height,
          onTop: top === el, parentIsBody: el.parentElement === document.body,
        };
      });

      if (!button) {
        note("the <prev-iteration> element is gone from the page");
      } else if (n === 0) {
        if (button.width > 0 || button.height > 0) note("iteration 0 must not show the previous button");
      } else {
        if (!button.parentIsBody) note("<prev-iteration> must be a direct child of <body>");
        if (button.width < 24 || button.height < 24) note("the previous button is not visible at full size");
        if (Math.abs(button.left - 12) > 1 || Math.abs(button.bottom - 12) > 1) {
          note(`the previous button is not in its corner (left ${button.left}px, bottom ${button.bottom}px; expected 12px each)`);
        }
        if (!button.onTop) note("something is covering the previous button");

        watching = false;
        if (button.onTop) {
          await page.locator("prev-iteration").click();
          await page.waitForURL(`${origin}/${n - 1}/`, { timeout: 5000 }).catch(() => {
            problems.push(`[${where}] clicking the previous button did not lead to /${n - 1}/`);
          });
        }
      }

      watching = false;
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  return problems;
}

export async function check(n, { staticOnly = false } = {}) {
  const problems = staticCheck(n);
  if (problems.length || staticOnly) return problems;
  return browserCheck(n);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const n = Number(process.argv[2]);
  if (!Number.isInteger(n) || n < 0) {
    console.error("usage: node tools/check.mjs <n> [--static-only]");
    process.exit(1);
  }
  const staticOnly = process.argv.includes("--static-only");
  const problems = await check(n, { staticOnly });
  if (problems.length) {
    console.error(`Iteration ${n} FAILED:\n` + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`Iteration ${n} passed${staticOnly ? " (static checks only)" : ""}.`);
}
