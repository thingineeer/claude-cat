// Opt-in stdin dump, for reverse-engineering the shape of Claude Code's
// statusLine payload. Enabled only when CLAUDE_CAT_DEBUG=1 (or a truthy
// value). Writes the most recent payload to disk so a maintainer can
// inspect which rate_limits.* keys are actually populated and whether
// extra-usage information is present in the JSON.
//
// Files written (default inside $CLAUDE_CAT_DEBUG_DIR or ~/.claude/claude-cat):
//   last-stdin.json  — raw JSON text as received (pretty-printed if possible)
//   last-keys.txt    — a one-line map of top-level keys and rate_limits.* keys
//   history.log      — append-only timestamped key list (rotates at ~200 lines)
//
// This module is a read-only sink: it must never throw in a way that
// breaks the status line. All IO is wrapped and swallowed.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function isEnabled() {
  const v = process.env.CLAUDE_CAT_DEBUG;
  return v === "1" || v === "true" || v === "yes";
}

function debugDir() {
  return process.env.CLAUDE_CAT_DEBUG_DIR
    || join(homedir(), ".claude", "claude-cat");
}

function summarizeKeys(obj) {
  if (!obj || typeof obj !== "object") return "(no object)";
  const top = Object.keys(obj).sort();
  const rl = obj.rate_limits && typeof obj.rate_limits === "object"
    ? Object.keys(obj.rate_limits).sort()
    : [];
  return `top=${top.join(",")} | rate_limits=${rl.join(",") || "(none)"}`;
}

export function maybeDumpStdin(rawJsonText, parsed) {
  if (!isEnabled()) return;
  try {
    const dir = debugDir();
    mkdirSync(dir, { recursive: true });

    // Pretty-print when possible; fall back to raw.
    let pretty = rawJsonText;
    try { pretty = JSON.stringify(parsed, null, 2); } catch {}

    writeFileSync(join(dir, "last-stdin.json"), pretty);
    writeFileSync(join(dir, "last-keys.txt"), summarizeKeys(parsed) + "\n");

    // Append a dated keys line to history.log, capped at ~200 lines.
    const line = `${new Date().toISOString()}  ${summarizeKeys(parsed)}\n`;
    const logPath = join(dir, "history.log");
    let prev = "";
    try { prev = readFileSync(logPath, "utf8"); } catch {}
    const merged = (prev + line).split("\n").slice(-200).join("\n");
    writeFileSync(logPath, merged);
  } catch {
    // Debug path must never break the status line.
  }
}

export function debugEnabled() {
  return isEnabled();
}
