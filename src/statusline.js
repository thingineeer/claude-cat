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

import { pickCat, catArt, THEME_NAMES } from "./cats.js";
import { bar, fmtCountdown, absoluteResetParts, fmtCost, colorByPct, colors as C } from "./format.js";
import { parseIconMode, iconFor } from "./icons.js";
import { maybeDumpStdin, debugEnabled } from "./debug.js";
import { writeCacheIfActive, readCacheForIdle } from "./cache.js";
import { t } from "./i18n.js";
import { padEndDisplay, displayWidth } from "./width.js";

// Build the reset phrase for a given window.
// - session (five_hour): relative, universal format (`3h 34m`, `15m`,
//   `2d 4h`) — English letters only, readable in any terminal locale.
// - every other window: absolute, English-fixed, no timezone
//     variant='long'  → 'Resets 7pm'           / 'Resets Apr 17, 1pm'
//     variant='short' → '7pm'                  / 'Fri 1pm'
function fmtResetPhrase(key, resetsAtSec, { variant = "long" } = {}) {
  if (!resetsAtSec) return null;
  if (key === "five_hour") {
    const v = fmtCountdown(resetsAtSec);
    if (v === "ready") return t("ready_now");
    return v;
  }
  const parts = absoluteResetParts(resetsAtSec);
  if (!parts) return null;
  if (parts === "ready") return t("ready_now");
  if (variant === "short") {
    // Same-day → just the clock ('7pm'). Other day → weekday + clock
    // ('Fri 1pm'). Drops the 'Resets' prefix entirely — the parentheses
    // that wrap the phrase in compact/wide already imply "resets at".
    const wd = new Date(resetsAtSec * 1000)
      .toLocaleDateString("en-US", { weekday: "short" });
    return parts.date ? `${wd} ${parts.clock}` : parts.clock;
  }
  return parts.date
    ? t("resets_on", parts.date, parts.clock)
    : t("resets_at", parts.clock);
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

// Window labels mirror the official Claude /usage screen *verbatim*.
// English only — we want the in-terminal wording identical to the popup
// so users don't have to map two sets of phrases. Only the session
// countdown is localized.
function labelFor(key, { variant = "long" } = {}) {
  const modelPretty = (suffix) =>
    suffix
      .split("_")
      .map((p) => (p === "4x" ? "4x" : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");

  if (variant === "short") {
    // Single-line layouts (compact / wide) pack a lot of info onto one
    // line; trim labels so the status line still fits an 80-col pane.
    //
    //   five_hour       → '5h'
    //   seven_day       → 'week'
    //   seven_day_<m>   → '<m>' (lower-cased), e.g. 'sonnet', 'opus'.
    //     We drop the 'week·' prefix: the model name alone already
    //     reads as "the weekly bucket for that model" in context.
    if (key === "five_hour") return "5h";
    if (key === "seven_day") return "week";
    if (key.startsWith("seven_day_")) {
      return key.slice("seven_day_".length).toLowerCase();
    }
    return key;
  }

  if (key === "five_hour") return t("current_session");
  if (key === "seven_day") return t("current_week_all");
  if (key.startsWith("seven_day_")) {
    return t("current_week_scope", modelPretty(key.slice("seven_day_".length)));
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

function collectWindows(d, { variant = "long" } = {}) {
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
      label: labelFor(k, { variant }),
      pct: v.used_percentage ?? 0,
      resets_at: v.resets_at,
    }));
}

// Label width / padding — delegated to src/width.js which understands
// East Asian Width (Korean labels take 2 columns per glyph).

// Inline cat glyph for single-line layouts (compact / wide). Kawaii
// art is multi-line so we fall back to the compact glyph there — the
// kawaii 3-line art only makes sense in 'full'.
function inlineCatGlyph({ windows, state }, theme) {
  if (theme === "none") return null;
  const art = catArt({ windows, state }, "compact");  // always single-line here
  return art ? art.lines[0] : null;
}

// Classify the *situation* independent of usage percent. Drives which
// fallback phrase to print and whether the cat should rest instead of
// react to windows. Signals:
//   - windows.length > 0                       → 'normal'
//   - cost > 0 and no windows                  → 'cost_only'
//     (API-key or provider that reports cost but not rate_limits)
//   - cost === 0 and no windows and ctx exists → 'warming_up'
//     (Pro/Max session before the first reply, most common)
//   - nothing at all                           → 'warming_up' (conservative)
function inferState(d, windows) {
  if (windows.length > 0) return "normal";
  const cost = d?.cost?.total_cost_usd;
  if (typeof cost === "number" && cost > 0) return "cost_only";
  return "warming_up";
}

function stateHint(state) {
  if (state === "cost_only")   return t("cost_only_mode");
  if (state === "warming_up")  return t("warming_up");
  return null;
}

// Debug chip for the header. Kept to a short tag ('[Debug]') since the
// actual dump path is documented and the user knows where to look.
// Suppressed entirely when the caller passes showDebugChip=false — useful
// for clean screenshots while CLAUDE_CAT_DEBUG is still dumping JSON.
function debugChip({ showDebugChip = true } = {}) {
  if (!showDebugChip) return null;
  return debugEnabled() ? t("debug_tag") : null;
}

// Context-window chip.
//   variant='long'  → 'ctx 23% used (77% left)' (full-layout header)
//   variant='short' → 'ctx 23%'                 (compact/wide tail)
// Label is fixed English — terminal real estate beats literal
// translation for a chip this small.
function renderContextChip(d, { variant = "long" } = {}) {
  const ctx = d?.context_window;
  if (!ctx || typeof ctx.used_percentage !== "number") return null;
  const used = Math.round(ctx.used_percentage);
  if (variant === "short") return `ctx ${used}%`;
  const left = typeof ctx.remaining_percentage === "number"
    ? Math.round(ctx.remaining_percentage)
    : Math.max(0, 100 - used);
  return `ctx ${used}% used (${left}% left)`;
}

// How wide is the actual terminal (columns)?
//
// Claude Code spawns statusLine scripts with stdin/stdout/stderr as
// pipes, so process.stdout.columns is undefined and $COLUMNS reflects
// the *parent shell* at launch time, not the current terminal. To get
// the live width we have to ask the controlling terminal directly via
// /dev/tty — that file descriptor still points at the real terminal
// even when stdout is a pipe.
//
// Priority:
//   1. CLAUDE_CAT_COLUMNS env — explicit override
//   2. stty size </dev/tty — live, updates on resize
//   3. tput cols </dev/tty — same idea, different tool
//   4. COLUMNS env — only correct if the shell exports live updates
//   5. process.stdout.columns — rare (when stdout happens to be a TTY)
//   6. fallback 200 — high default so an unknown width doesn't wrap
//      prematurely; users on narrow panes can still force it with
//      --stack=always or --max-cols.
import { execSync } from "node:child_process";

function parsePositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ttyColumnsViaStty() {
  try {
    // stty size prints "<rows> <cols>"; read cols.
    const out = execSync("stty size </dev/tty", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 200,
    }).toString().trim();
    const m = out.match(/\d+\s+(\d+)/);
    return m ? parsePositiveInt(m[1]) : null;
  } catch { return null; }
}

function ttyColumnsViaTput() {
  try {
    const out = execSync("tput cols </dev/tty", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 200,
    }).toString().trim();
    return parsePositiveInt(out);
  } catch { return null; }
}

function detectTerminalColumns() {
  return (
    parsePositiveInt(process.env.CLAUDE_CAT_COLUMNS) ||
    ttyColumnsViaStty() ||
    ttyColumnsViaTput() ||
    parsePositiveInt(process.env.COLUMNS) ||
    (process.stdout && process.stdout.columns) ||
    200
  );
}

// Greedy multi-line pack. `head` is locked to the first line (it's
// usually the cat). `body` items fill line 1 until the next one would
// overflow; the overflow starts line 2, which fills the same way; and
// so on. `tail` items (cost / ctx / debug) attach to the last line
// when they fit, otherwise they open one more line. Continuation
// lines get a small indent so the block reads as one entry, not a
// list of siblings.
function joinWithWrap({ head, body, tail, sep, lineSep, cap }) {
  const sepWidth = displayWidth(sep);
  const full = [...head, ...body, ...tail].join(sep);
  if (displayWidth(full) <= cap) return full;

  const indent = "  ";
  const indentW = indent.length;

  // Start with the locked head on line 1 (no indent).
  const lines = [[...head]];
  const widthOf = (line, isContinuation) =>
    (isContinuation ? indentW : 0) +
    (line.length === 0 ? 0 : displayWidth(line.join(sep)));

  const pushItem = (item) => {
    const last = lines[lines.length - 1];
    const isCont = lines.length > 1;
    const candidate = [...last, item];
    if (widthOf(candidate, isCont) <= cap) {
      last.push(item);
    } else if (last.length === 0) {
      // Single item wider than cap — accept it as-is rather than drop.
      last.push(item);
    } else {
      lines.push([item]);
    }
  };

  for (const p of body) pushItem(p);
  for (const p of tail) pushItem(p);

  return lines
    .map((line, i) => (i === 0 ? line.join(sep) : indent + line.join(sep)))
    .join(lineSep);
}

function renderCompact(d, {
  iconMode = "none",
  showDebugChip = true,
  stack = "auto",
  cols,
} = {}) {
  const windows = collectWindows(d, { variant: "short" });
  const state = inferState(d, windows);
  const ctx = renderContextChip(d, { variant: "short" });
  const cs = fmtCost(d?.cost?.total_cost_usd);

  // Compact stays cat-less — the cat lives in --full --kawaii — but
  // cost now rides alongside ctx in the tail group. Max-plan users
  // asked for the $ back; the bold-white cost chip sits next to the
  // dim-cyan ctx chip so the bars still lead the eye.
  const head = [];

  const body = [];
  if (state !== "normal") {
    const hint = stateHint(state);
    if (hint) body.push(`${C.dim}${hint}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, { variant: "short" });
      // Compact packs reset time straight into parentheses, mirroring
      // the maintainer's previous shell status line:
      //    5h ▓▓░░░░░░░░ 10% (4h43m)
      //    week ▓▓░░░░░░░░ 18% (Fri 13:00)
      const tail = phrase ? ` ${C.dim}(${phrase})${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      body.push(`${C.brand}${icon}${w.label}${C.reset} ${bar(pct)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
  }

  const tailGroup = [];
  if (cs)  tailGroup.push(`${C.cost}${cs}${C.reset}`);
  if (ctx) tailGroup.push(`${C.ctx}${ctx}${C.reset}`);
  const dbg = debugChip({ showDebugChip });
  if (dbg) tailGroup.push(`${C.debug}${dbg}${C.reset}`);

  const sep = `  ${C.sep}|${C.reset}  `;
  const lineSep = "\n";
  const allParts = [...head, ...body, ...tailGroup];

  if (stack === "never") return allParts.join(sep);
  if (stack === "always") {
    const line1 = [...head, ...body].join(sep);
    const line2 = tailGroup.join(sep);
    return line2 ? `${line1}${lineSep}  ${line2}` : line1;
  }

  // auto
  const cap = typeof cols === "number" ? cols : detectTerminalColumns();
  return joinWithWrap({ head, body, tail: tailGroup, sep, lineSep, cap });
}

// Build the 'data block' lines for the full layout:
//   line 0   — header  (model · cost · ctx · [Debug])
//   line 1+  — one per window, OR a single short status hint
// No indentation here; callers add padding if they place the block
// next to cat art.
function buildDataBlock(d, { iconMode, state, showDebugChip = true }) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const ctx = renderContextChip(d);
  const dbg = debugChip({ showDebugChip });

  const lines = [];
  const header = [];
  if (model) header.push(`${C.dim}${model}${C.reset}`);
  const cs = fmtCost(cost);
  if (cs)  header.push(`${C.dim}${cs}${C.reset}`);
  if (ctx) header.push(`${C.dim}${ctx}${C.reset}`);
  if (dbg) header.push(`${C.dim}${dbg}${C.reset}`);
  if (header.length) lines.push(header.join(`  ${C.gray}·${C.reset}  `));

  if (state !== "normal") {
    const hint = stateHint(state);
    if (hint) lines.push(`${C.dim}${hint}${C.reset}`);
    return lines;
  }

  const labelCols = 26;
  for (const w of windows) {
    const pct = Math.round(w.pct);
    const phrase = fmtResetPhrase(w.key, w.resets_at);
    const icon = iconFor(iconMode, w.key);
    const label = padEndDisplay(icon + w.label, labelCols);
    const right = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
    lines.push(`${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
  }
  return lines;
}

function renderFull(d, { iconMode = "none", catTheme = "compact", showDebugChip = true } = {}) {
  const windows = collectWindows(d);
  const state = inferState(d, windows);
  const art = catArt(
    state === "normal" ? { windows } : { state: "resting" },
    catTheme,
  );
  const data = buildDataBlock(d, { iconMode, state, showDebugChip });

  // Compact-cat full: inline the 1-line face into the header and indent
  // every data line with 2 spaces, matching the previous look.
  if (!art || art.lines.length === 1) {
    const out = [];
    if (art) {
      const head = data[0] ? ` ${C.gray}·${C.reset}  ${data[0]}` : "";
      out.push(`${C.cyan}${art.lines[0]}${C.reset}${head ? "  " + head : ""}`);
      for (let i = 1; i < data.length; i++) out.push(`  ${data[i]}`);
    } else {
      for (let i = 0; i < data.length; i++) out.push(i === 0 ? data[i] : `  ${data[i]}`);
    }
    return out.join("\n");
  }

  // Multi-line cat (kawaii): sit to the left of the data block so the
  // whole status line reads as a single 3-ish-row card instead of a
  // tall stack. Row count is max(art, data); the shorter side gets
  // blank rows on the appropriate column.
  const artWidth = Math.max(...art.lines.map((l) => displayWidth(l)));
  const artCols = artWidth + 1;   // one trailing space inside the cat column
  const gutter = "  ";            // two spaces between cat and data

  const rows = Math.max(art.lines.length, data.length);
  const out = [];
  for (let i = 0; i < rows; i++) {
    const rawCat = art.lines[i] ?? "";
    const paddedCat = padEndDisplay(rawCat, artCols);
    const catCell = rawCat ? `${C.cyan}${paddedCat}${C.reset}` : " ".repeat(artCols);
    const right = data[i] ?? "";
    out.push(`${catCell}${gutter}${right}`);
  }
  return out.join("\n");
}

// Wide layout: every window on a single horizontal line. Cat-less
// like compact, but now carries the cost chip alongside ctx so Max-
// plan users can eyeball spend without leaving the row.
// Wide is for heavy users who don't want the line to ever wrap.
function renderWide(d, { iconMode = "none", showDebugChip = true } = {}) {
  const windows = collectWindows(d, { variant: "short" });
  const state = inferState(d, windows);
  const ctx = renderContextChip(d, { variant: "short" });
  const cs = fmtCost(d?.cost?.total_cost_usd);

  const parts = [];

  if (state !== "normal") {
    const hint = stateHint(state);
    if (hint) parts.push(`${C.dim}${hint}${C.reset}`);
    if (cs)   parts.push(`${C.cost}${cs}${C.reset}`);
    if (ctx)  parts.push(`${C.ctx}${ctx}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, { variant: "short" });
      const tail = phrase ? ` ${C.dim}(${phrase})${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.brand}${icon}${w.label}${C.reset} ${bar(pct, 8)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    if (cs)  parts.push(`${C.cost}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.ctx}${ctx}${C.reset}`);
  }

  const dbg = debugChip({ showDebugChip });
  if (dbg) parts.push(`${C.debug}${dbg}${C.reset}`);

  return parts.join(`  ${C.sep}|${C.reset}  `);
}

function parseLayout(args) {
  if (args.includes("--layout=wide") || args.includes("--wide")) return "wide";
  if (args.includes("--full") || args.includes("-f") || args.includes("--layout=full")) return "full";
  return "compact";
}

// --cat=compact|kawaii|none (default: compact). Also honors bare --kawaii
// and --no-cat shortcuts.
function parseCatTheme(args) {
  if (args.includes("--no-cat") || args.includes("--cat=none")) return "none";
  if (args.includes("--kawaii") || args.includes("--cat=kawaii")) return "kawaii";
  for (const a of args) {
    if (a.startsWith("--cat=")) {
      const v = a.slice("--cat=".length);
      if (THEME_NAMES.includes(v)) return v;
    }
  }
  return "compact";
}

// --stack=auto|always|never (default: auto). Controls whether the compact
// layout wraps into two lines when the terminal is narrow.
function parseStackMode(args) {
  if (args.includes("--stack") || args.includes("--stack=always")) return "always";
  if (args.includes("--no-stack") || args.includes("--stack=never")) return "never";
  for (const a of args) {
    if (a.startsWith("--stack=")) {
      const v = a.slice("--stack=".length);
      if (["auto", "always", "never"].includes(v)) return v;
    }
  }
  return "auto";
}

// --max-cols=<n> caps the single-line width used for auto-stack
// detection. Useful when COLUMNS / stdout.columns don't match what the
// user actually sees (e.g. embedded statusLine panes).
function parseMaxCols(args) {
  for (const a of args) {
    if (a.startsWith("--max-cols=")) {
      const n = parseInt(a.slice("--max-cols=".length), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const layout = parseLayout(args);
  const iconMode = parseIconMode(args);
  const catTheme = parseCatTheme(args);
  const stack = parseStackMode(args);
  const cols = parseMaxCols(args);
  const showDebugChip = !args.includes("--no-debug-chip");
  const raw = await readStdin();
  let d = safeParse(raw);

  // Opt-in: dump the payload we just received so we can confirm which
  // rate_limits.* keys (and any extra-usage fields) the server actually
  // sends on this machine/plan. No-op unless CLAUDE_CAT_DEBUG=1.
  maybeDumpStdin(raw, d);

  // Cross-terminal sync:
  //   Active session  → write rate_limits to shared cache file.
  //   Idle session    → stdin has no rate_limits; read from cache instead
  //                     so all terminals show the same current usage.
  const hasLimits = d.rate_limits && Object.keys(d.rate_limits).length > 0;
  if (hasLimits) {
    writeCacheIfActive(d);
  } else {
    const cached = readCacheForIdle();
    if (cached) {
      d = { ...d, ...cached };
    }
  }

  const opts = { iconMode, catTheme, showDebugChip, stack, cols };
  let out;
  if (layout === "wide") out = renderWide(d, opts);
  else if (layout === "full") out = renderFull(d, opts);
  else out = renderCompact(d, opts);

  process.stdout.write(out + "\n");
}

main().catch((err) => {
  // Never break the user's status line — print a tiny fallback.
  process.stdout.write(`${C.dim}/ᐠ ? ᐟ\\ claude-cat error${C.reset}\n`);
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(0);
});
