// Makes the newest iteration the one served at the root of the site.
//
//   node tools/publish.mjs                 full check, then publish
//   node tools/publish.mjs --static-only   skip the browser part of the check
//
// The newest iteration is the last entry in journal.json. This script
// validates the journal, confirms nothing from the past was touched, runs the
// check, and only then copies the three files to the root. It does not commit
// or push. If it exits non-zero, nothing at the root has changed.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, FILES, KINDS } from "./rules.mjs";
import { check } from "./check.mjs";

function fail(problems) {
  console.error("NOT published:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

function readJournal() {
  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(path.join(ROOT, "journal.json"), "utf8"));
  } catch (e) {
    fail([`journal.json could not be read: ${e.message}`]);
  }
  if (!Array.isArray(journal) || journal.length === 0) fail(["journal.json has no entries"]);

  const problems = [];
  const str = (v) => typeof v === "string" && v.trim().length > 0;
  journal.forEach((e, i) => {
    const at = `journal entry ${i}`;
    if (e?.n !== i) problems.push(`${at}: "n" must be ${i}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e?.date ?? "")) problems.push(`${at}: "date" must be YYYY-MM-DD`);
    if (!str(e?.title)) problems.push(`${at}: "title" is required`);
    if (!str(e?.idea)) problems.push(`${at}: "idea" is required`);
    if (!KINDS.includes(e?.kind)) problems.push(`${at}: "kind" must be one of ${KINDS.join(", ")}`);
    if (!Array.isArray(e?.techniques) || !e.techniques.length || !e.techniques.every(str)) {
      problems.push(`${at}: "techniques" must be a non-empty list of strings`);
    }
    if (!(e?.thread === null || str(e?.thread))) problems.push(`${at}: "thread" must be a string or null`);
    if (!fs.existsSync(path.join(ROOT, String(i), "index.html"))) problems.push(`${at}: folder /${i}/ is missing`);
  });
  if (problems.length) fail(problems);
  return journal;
}

// Past iterations and the shared button are never edited by a daily run.
function untouchedPast(n) {
  let out;
  try {
    execFileSync("git", ["rev-parse", "--verify", "HEAD"], { cwd: ROOT, stdio: "ignore" });
    out = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" });
  } catch {
    return []; // not a git repository, or no commits yet
  }
  const ok = new Set(["journal.json", ...FILES, ...FILES.map((f) => `${n}/${f}`)]);
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((p) => !ok.has(p))
    .map((p) => `unexpected change outside iteration ${n}: ${p}`);
}

const staticOnly = process.argv.includes("--static-only");
const journal = readJournal();
const n = journal.length - 1;

const problems = [...untouchedPast(n), ...(await check(n, { staticOnly }))];
if (problems.length) fail(problems);

for (const f of FILES) fs.copyFileSync(path.join(ROOT, String(n), f), path.join(ROOT, f));
console.log(`Published iteration ${n}: "${journal[n].title}"${staticOnly ? " (static checks only)" : ""}. Ready to commit.`);
