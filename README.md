# lllllllllllllllllllllllll.com

One new single-page piece every day. Some are interactive, some are just to
look at. Each one is numbered, kept forever, and links back to the one before
it, all the way down to 0.

## Layout

```
/0/ /1/ /2/ ...    one folder per iteration: index.html, style.css, script.js
/index.html        \
/style.css          } an exact copy of the newest iteration
/script.js         /
/shared/prev.js    the fixed corner button linking to the previous iteration,
                   and the site icon (drawn by code, the same on every page)
/404.html          shown for any address that does not exist
/journal.json      one entry per iteration: what it was and how it was made
/tools/            the check and publish scripts
```

## Rules for an iteration

1. **Three files, no more.** `index.html`, `style.css`, `script.js`. Anything
   that would normally be its own file (shaders, workers, audio worklets,
   data, SVG) goes inside one of the three; workers and worklets load from
   blob URLs.
2. **Fully self-contained.** No requests to any other server: no libraries,
   no web fonts, no analytics, no links out. The only thing loaded from
   outside the folder is `/shared/prev.js`.
3. **No media files.** No images, video or audio files. Anything seen or
   heard is generated in the browser by the page's own code.
4. **Baseline widely available only.** Use only web platform features that
   are Baseline *widely available*.
5. **The past is read-only.** Never edit an earlier iteration's folder,
   `/shared/`, `/tools/`, or `404.html`. Never edit an earlier journal entry.
6. **The previous button is untouchable.** Include it exactly as shown below,
   as a direct child of `<body>`. Do not style, move, cover or hide it, and
   do not put a `transform`, `filter`, `perspective` or `contain` on `<body>`
   or `<html>` (that would unpin it from its corner).
7. **The site icon is shared.** `/shared/prev.js` draws the same icon on
   every page. Keep the empty `<link rel="icon" href="data:,">` from the
   skeleton and do not set a favicon of your own.

## Page skeleton

Every `index.html` uses this skeleton, with `N` replaced by the iteration's
number. Everything else goes inside `<body>`, in `style.css` and in
`script.js`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src data: blob:; media-src blob:; worker-src blob:; connect-src data: blob:; base-uri 'none'; form-action 'none'">
<title>TITLE</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="style.css">
</head>
<body>

<prev-iteration n="N"></prev-iteration>
<script src="/shared/prev.js"></script>
<script src="script.js"></script>
</body>
</html>
```

`script.js` may be loaded with `type="module"` or `defer`. No inline
`<script>` or `<style>` blocks and no inline event handler attributes; the
security policy blocks inline scripts anyway.

## The journal

`journal.json` is a list with one entry per iteration, in order. It is the
site's memory: read it before making anything, so a new piece does not repeat
an old one, and so a theme that is forming can be noticed and continued.

```json
{
  "n": 40,
  "date": "2026-12-20",
  "title": "Short title",
  "idea": "Two or three sentences: what it is and what it feels like to visit.",
  "kind": "interactive",
  "techniques": ["canvas 2d", "pointer events"],
  "thread": null
}
```

- `title` is the piece's title, and must be identical to the page's
  `<title>`.
- `kind` is `"interactive"` or `"still"`.
- `thread` is `null`, or a short name for a theme this piece deliberately
  continues or starts. Reuse the exact name used by earlier entries.

## Making the next iteration

1. Read `journal.json`. The next number is the number of entries in it.
2. Create `/N/` with its three files, following the rules and the skeleton.
3. Append the entry for `N` to `journal.json`.
4. Run `node tools/publish.mjs`. It validates the journal, confirms nothing
   from the past was changed, checks the new page (structure, no outside
   addresses, loads in a browser at desktop and phone sizes with no errors
   and no stray requests, previous button present and working), and then
   copies the three files to the root.
5. Only if it reports success: commit everything and push.

If the publish step fails, fix the new iteration and run it again. If it
cannot be fixed, discard the changes and push nothing; the previous iteration
stays live.

To check a single iteration without publishing: `node tools/check.mjs N`.

## Setup

```
npm install
npx playwright install chromium
```

The browser part of the check needs both. If the `CHROME_PATH` environment
variable names an installed Chrome, that browser is used and the second
command can be skipped. Without a browser, the scripts accept
`--static-only`, which runs every check that does not need a browser.

## Working locally

`npm start` serves the site at http://localhost:8000/ the way it is served
live (`npm start -- 8001` for another port). Opening the files directly will
not work, because pages use `/shared/prev.js` and `/N/` as root-relative
addresses.

`npm run try` tries a prompt without touching the real site. It makes a
throwaway copy of the last commit, runs the prompt there with the `claude`
command-line tool, skips the commit and push, and serves the result. The
prompt is read from `drafts/prompt.md`, or from a file you name:
`npm run try -- drafts/other.md`. The `drafts/` folder is not committed.
