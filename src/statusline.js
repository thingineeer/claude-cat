// claude-cat statusline renderer.
// Reads a single JSON object from stdin (fed by Claude Code) and prints
// one or more lines suitable for the statusLine feature.
//
// Expected (partial) schema:
//   cost.total_cost_usd: number
//   rate_limits.five_hour:  { used_percentage, resets_at }
//   rate_limits.seven_day:  { used_percentage, resets_at }
//   rate_limits.seven_day_opus_4x?: same shape (sonnet-only style limits vary)
//   model.display_name: string
// Missing fields are treated as optional — Claude Code only populates
// rate_limits for Pro/Max subscribers after the first assistant response.

import { pickCat } from "./cats.js";
import { bar, fmtResetFor, fmtCost, colorByPct, colors as C } from "./format.js";
import { parseIconMode, iconFor } from "./icons.js";
import { maybeDumpStdin, debugEnabled } from "./debug.js";

// "resets in 3h 51m" for relative windows; "resets Fri 1:00 PM" for absolute.
function fmtResetPhrase(key, resetsAtSec) {
  const t = fmtResetFor(key, resetsAtSec);
  if (!t) return null;
  if (t === "ready") return "ready now";
  if (key === "five_hour") return `resets in ${t}`;
  return `resets ${t}`;
}

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", () => resolve(buf));
  });
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

// Window labels mirror the official Claude usage UI.
function labelFor(key) {
  if (key === "five_hour") return "Session";
  if (key === "seven_day") return "Weekly";
  if (key.startsWith("seven_day_")) {
    const suffix = key.slice("seven_day_".length);
    const pretty = suffix
      .split("_")
      .map((p) => (p === "4x" ? "4x" : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
    return `Weekly · ${pretty}`;
  }
  return key;
}

// Accept any shape the server sends: collect every rate_limits.* entry
// that looks like { used_percentage, resets_at, ... }. This lets
// model-scoped weekly buckets (e.g. Sonnet-only) appear automatically,
// regardless of the exact key Claude Code chooses.
function isWindowEntry(v) {
  return v && typeof v === "object" && !Array.isArray(v)
    && (typeof v.used_percentage === "number" || typeof v.resets_at === "number");
}

// Ordering: five_hour first, then seven_day, then every other weekly-style
// key (alphabetical), then anything else. Deterministic and predictable.
function orderKey(k) {
  if (k === "five_hour") return [0, k];
  if (k === "seven_day") return [1, k];
  if (k.startsWith("seven_day_")) return [2, k];
  return [3, k];
}

function collectWindows(d) {
  const rl = d.rate_limits || {};
  return Object.entries(rl)
    .filter(([, v]) => isWindowEntry(v))
    .sort(([a], [b]) => {
      const [oa, ka] = orderKey(a);
      const [ob, kb] = orderKey(b);
      return oa - ob || ka.localeCompare(kb);
    })
    .map(([k, v]) => ({
      key: k,
      label: labelFor(k),
      pct: v.used_percentage ?? 0,
      resets_at: v.resets_at,
    }));
}

function renderCompact(d, { iconMode = "none" } = {}) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const parts = [];
  parts.push(`${C.cyan}${cat.face}${C.reset}`);

  if (windows.length === 0) {
    // Fallback: no Pro/Max rate limits yet. Show cost if present.
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}session${C.reset} ${cs}`);
    else    parts.push(`${C.dim}warming up…${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at);
      const tail = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.dim}${icon}${w.label}${C.reset} ${bar(pct)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
  }

  return parts.join(`  ${C.gray}·${C.reset}  `);
}

function renderFull(d, { iconMode = "none" } = {}) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const lines = [];
  const header = [`${C.cyan}${cat.face}${C.reset}`];
  if (model) header.push(`${C.dim}${model}${C.reset}`);
  const cs = fmtCost(cost);
  if (cs) header.push(`${C.dim}${cs}${C.reset}`);
  lines.push(header.join(`  ${C.gray}·${C.reset}  `));

  if (windows.length === 0) {
    lines.push(`  ${C.dim}(rate limits appear after the first reply; API users only see cost)${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at);
      const icon = iconFor(iconMode, w.key);
      const label = (icon + w.label).padEnd(icon ? 20 : 18);
      const right = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      lines.push(`  ${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes("--full") || args.includes("-f");
  const iconMode = parseIconMode(args);
  const raw = await readStdin();
  const d = safeParse(raw);

  // Opt-in: dump the payload we just received so we can confirm which
  // rate_limits.* keys (and any extra-usage fields) the server actually
  // sends on this machine/plan. No-op unless CLAUDE_CAT_DEBUG=1.
  maybeDumpStdin(raw, d);

  let out = full ? renderFull(d, { iconMode }) : renderCompact(d, { iconMode });
  if (debugEnabled()) {
    out += `  ${C.dim}[debug→~/.claude/claude-cat]${C.reset}`;
  }
  process.stdout.write(out + "\n");
}

main().catch((err) => {
  // Never break the user's status line — print a tiny fallback.
  process.stdout.write(`${C.dim}/ᐠ ? ᐟ\\ claude-cat error${C.reset}\n`);
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(0);
});
