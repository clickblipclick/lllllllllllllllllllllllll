// Tries a prompt on this computer without touching the real site.
//
//   node tools/try.mjs                     use drafts/prompt.md
//   node tools/try.mjs drafts/other.md     use another prompt file
//
// It makes a throwaway copy of the site as it is in the last commit, runs the
// prompt there with the `claude` command-line tool, and then serves the copy
// so the result can be looked at. Nothing is committed or pushed, and this
// folder is not changed. Press Ctrl-C when done; the copy is deleted.
//
// The trial runs on this computer, not in a sandbox, so it is fenced in:
//   - the copy is a separate clone with no remote, so there is nowhere to push
//   - the scripts it is allowed to run (tools/, node_modules/) and everything
//     else a daily run must not touch are made read-only in the copy, and
//     editing them is also denied by rule, so it cannot rewrite a script and
//     then run it
//   - the only commands it may run are the check and publish scripts, the
//     date, and read-only git commands
//
// Environment variables:
//   MODEL   model to use (default: claude-fable-5-2, the same as the nightly run)
//   PORT    port to serve the result on (default: 8001)
//   KEEP=1  keep the throwaway copy after exiting, and print where it is

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT } from "./rules.mjs";
import { serve } from "./serve.mjs";

const promptFile = path.resolve(process.argv[2] ?? path.join(ROOT, "drafts", "prompt.md"));
const model = process.env.MODEL || "claude-fable-5-2";
const port = Number(process.env.PORT || 8001);

if (!fs.existsSync(promptFile)) {
  console.error(`No prompt file at ${promptFile}\nPut the prompt to try in drafts/prompt.md, or pass a file: npm run try -- path/to/prompt.md`);
  process.exit(1);
}

// A local trial must never publish. This is appended to whatever prompt is
// being tried, and the git commands are also blocked outright below.
const TRIAL_RULES = `

LOCAL TRIAL RULES (these override anything above)

This is a trial on a throwaway copy of the site. Do everything the procedure
says up to and including a successful \`node tools/publish.mjs\`, then stop.
Do not run \`npm install\`; the dependencies are already in place. Do not
commit, do not push, and do not touch git in any way that changes anything.
Then give the final report.`;

const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

// Everything a daily run must leave alone. In the copy these are read-only.
const PROTECTED = ["tools", "shared", "node_modules", "README.md", "404.html", "CNAME", "package.json", "package-lock.json", ".gitignore", ".nojekyll"];

const copy = fs.mkdtempSync(path.join(os.tmpdir(), "site-trial-"));
execFileSync("git", ["clone", "--quiet", "--no-local", "--depth", "1", pathToFileURL(ROOT).href, copy]);
git(["remote", "remove", "origin"], copy);

// Its own copy of the dependencies (not a link back to the real ones), kept
// out of git's sight so the publish script's "nothing else changed" guard is
// not tripped by it.
fs.cpSync(path.join(ROOT, "node_modules"), path.join(copy, "node_modules"), { recursive: true, verbatimSymlinks: true });
fs.appendFileSync(path.join(copy, ".git", "info", "exclude"), "\nnode_modules\n");

const lock = (mode) => {
  for (const name of PROTECTED) {
    const target = path.join(copy, name);
    if (fs.existsSync(target)) execFileSync("chmod", ["-R", mode, target]);
  }
};
lock("a-w");

let cleaned = false;
function cleanUp() {
  if (cleaned) return;
  cleaned = true;
  if (process.env.KEEP) {
    console.log(`\nKept the trial copy at ${copy}`);
    return;
  }
  try {
    lock("u+w");
    fs.rmSync(copy, { recursive: true, force: true });
  } catch {
    console.error(`Could not remove ${copy}; delete that folder by hand.`);
  }
}
process.on("exit", cleanUp);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const before = JSON.parse(fs.readFileSync(path.join(copy, "journal.json"), "utf8")).length;
console.log(`Trying ${path.relative(ROOT, promptFile)} with ${model} on a copy of the site (${before} piece${before === 1 ? "" : "s"} so far).`);
console.log("This usually takes several minutes. Nothing here or on the live site will change.\n");

const allowed = [
  "Read", "Write", "Edit", "Glob", "Grep",
  "Bash(node tools/publish.mjs:*)", "Bash(node tools/check.mjs:*)",
  "Bash(date:*)", "Bash(TZ=America/Chicago date:*)",
  "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)",
];
const blocked = [
  "Bash(git push:*)", "Bash(git commit:*)", "Bash(git remote:*)", "Bash(npm:*)", "Bash(npx:*)",
  "WebFetch", "WebSearch",
  ...PROTECTED.map((name) => `Edit(${["tools", "shared", "node_modules"].includes(name) ? name + "/**" : name})`),
  "Edit(.git/**)",
];

const child = spawn(
  "claude",
  [
    "--print",
    "--model", model,
    "--permission-mode", "acceptEdits",
    "--setting-sources", "project",
    "--strict-mcp-config",
    "--allowedTools", ...allowed,
    "--disallowedTools", ...blocked,
  ],
  { cwd: copy, stdio: ["pipe", "inherit", "inherit"] },
);
child.on("error", (e) => {
  console.error(e.code === "ENOENT" ? "The `claude` command-line tool was not found on this computer." : e.message);
  process.exit(1);
});
child.stdin.end(fs.readFileSync(promptFile, "utf8") + TRIAL_RULES);

child.on("close", async (code) => {
  if (code !== 0) {
    console.error(`\nThe run ended with an error (exit code ${code}).`);
    process.exit(1);
  }

  let journal = [];
  try {
    journal = JSON.parse(fs.readFileSync(path.join(copy, "journal.json"), "utf8"));
  } catch {}
  const n = journal.length - 1;
  const made = journal.length > before && fs.existsSync(path.join(copy, String(n), "index.html"));
  const published = made && fs.existsSync(path.join(copy, "index.html")) &&
    fs.readFileSync(path.join(copy, "index.html"), "utf8") === fs.readFileSync(path.join(copy, String(n), "index.html"), "utf8");

  if (!made) {
    console.error("\nThe run finished but did not produce a new piece.");
    process.exit(1);
  }
  console.log(`\nMade piece ${n}: "${journal[n].title}"${published ? "" : " (it did NOT pass publish; the root still shows the previous piece)"}`);

  try {
    const server = await serve(copy, port);
    console.log(`Look at it here:  http://localhost:${server.address().port}/${n}/\nCtrl-C to stop and delete the trial copy.`);
  } catch (e) {
    console.error(e.code === "EADDRINUSE" ? `Port ${port} is in use. Run again with PORT=${port + 1}, or use KEEP=1 to keep the copy.` : e.message);
    process.exit(1);
  }
});
