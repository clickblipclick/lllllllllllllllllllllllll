// Adds up what the current Claude Code session has used so far, so the
// publish script can record it in the journal.
//
// Claude Code keeps a transcript of each session on the machine it runs on,
// and every reply in it carries its token counts. This finds the transcript
// of the session that is running this script and totals them. If there is no
// such session or no transcript (someone ran the script by hand, say), it
// returns null and nothing is recorded.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function findTranscript(sessionId) {
  const base = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
  for (const dir of fs.readdirSync(base)) {
    const file = path.join(base, dir, `${sessionId}.jsonl`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

export function sessionUsage() {
  try {
    const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
    if (!sessionId || !/^[\w-]+$/.test(sessionId)) return null;
    const file = findTranscript(sessionId);
    if (!file) return null;

    // One reply can span several lines of the transcript, each repeating the
    // same counts, so keep one set of counts per reply.
    const replies = new Map();
    let started = null;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.timestamp && !started) started = Date.parse(event.timestamp);
      const usage = event.type === "assistant" && event.message?.usage;
      if (usage && event.message.id) replies.set(event.message.id, usage);
    }
    if (!replies.size) return null;

    const total = { input: 0, cache_write: 0, cache_read: 0, output: 0 };
    for (const u of replies.values()) {
      total.input += u.input_tokens || 0;
      total.cache_write += u.cache_creation_input_tokens || 0;
      total.cache_read += u.cache_read_input_tokens || 0;
      total.output += u.output_tokens || 0;
    }
    return { ...total, replies: replies.size, seconds: started ? Math.round((Date.now() - started) / 1000) : null };
  } catch {
    return null;
  }
}
