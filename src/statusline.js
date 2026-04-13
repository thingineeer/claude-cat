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
import { detectLocale, t } from "./i18n.js";
import { padEndDisplay, displayWidth } from "./width.js";

// Build the reset phrase for a given window.
// - session (five_hour): relative, the only locale-dependent string we emit
//   ('3h 15m' / '3시간 15분 후')
// - every other window: absolute, English-fixed, no timezone
//   ('Resets 7pm' / 'Resets Apr 17, 1pm')
function fmtResetPhrase(key, resetsAtSec, locale) {
  if (!resetsAtSec) return null;
  if (key === "five_hour") {
    const v = fmtCountdown(resetsAtSec, { locale });
    if (v === "ready") return t("ready_now");
    return v;
  }
  const parts = absoluteResetParts(resetsAtSec);
  if (!parts) return null;
  if (parts === "ready") return t("ready_now");
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
function labelFor(key) {
  if (key === "five_hour") return t("current_session");
  if (key === "seven_day") return t("current_week_all");
  if (key.startsWith("seven_day_")) {
    const suffix = key.slice("seven_day_".length);
    const pretty = suffix
      .split("_")
      .map((p) => (p === "4x" ? "4x" : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
    return t("current_week_scope", pretty);
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

// Compact context-window chip for the header. Matches the phrasing of
// thingineeer's prior shell status line so the switch to claude-cat
// feels invisible: 'ctx 23% used (77% left)'. Label is fixed English —
// terminal real estate beats literal translation for a six-word chip.
function renderContextChip(d) {
  const ctx = d?.context_window;
  if (!ctx || typeof ctx.used_percentage !== "number") return null;
  const used = Math.round(ctx.used_percentage);
  const left = typeof ctx.remaining_percentage === "number"
    ? Math.round(ctx.remaining_percentage)
    : Math.max(0, 100 - used);
  return `ctx ${used}% used (${left}% left)`;
}

function renderCompact(d, { iconMode = "none", locale = "en", catTheme = "compact", showDebugChip = true } = {}) {
  const windows = collectWindows(d);
  const state = inferState(d, windows);
  const cost = d?.cost?.total_cost_usd;
  const ctx = renderContextChip(d);
  const face = inlineCatGlyph({ windows, state: state === "normal" ? null : "resting" }, catTheme);

  const parts = [];
  if (face) parts.push(`${C.cyan}${face}${C.reset}`);

  if (state !== "normal") {
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
    const hint = stateHint(state);
    if (hint) parts.push(`${C.dim}${hint}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const tail = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.dim}${icon}${w.label}${C.reset} ${bar(pct)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
  }

  const dbg = debugChip({ showDebugChip });
  if (dbg) parts.push(`${C.dim}${dbg}${C.reset}`);

  return parts.join(`  ${C.gray}·${C.reset}  `);
}

// Build the 'data block' lines for the full layout:
//   line 0   — header  (model · cost · ctx · [Debug])
//   line 1+  — one per window, OR a single short status hint
// No indentation here; callers add padding if they place the block
// next to cat art.
function buildDataBlock(d, { iconMode, locale, state, showDebugChip = true }) {
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
    const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
    const icon = iconFor(iconMode, w.key);
    const label = padEndDisplay(icon + w.label, labelCols);
    const right = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
    lines.push(`${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
  }
  return lines;
}

function renderFull(d, { iconMode = "none", locale = "en", catTheme = "compact", showDebugChip = true } = {}) {
  const windows = collectWindows(d);
  const state = inferState(d, windows);
  const art = catArt(
    state === "normal" ? { windows } : { state: "resting" },
    catTheme,
  );
  const data = buildDataBlock(d, { iconMode, locale, state, showDebugChip });

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

// Wide layout: everything on a single line separated by middle-dots.
// Useful for heavy users who don't want the status line growing taller
// as more windows appear.
function renderWide(d, { iconMode = "none", locale = "en", catTheme = "compact", showDebugChip = true } = {}) {
  const windows = collectWindows(d);
  const state = inferState(d, windows);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const ctx = renderContextChip(d);
  const face = inlineCatGlyph(
    state === "normal" ? { windows } : { state: "resting" },
    catTheme,
  );

  const parts = [];
  if (face) parts.push(`${C.cyan}${face}${C.reset}`);
  if (model) parts.push(`${C.dim}${model}${C.reset}`);

  if (state !== "normal") {
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
    const hint = stateHint(state);
    if (hint) parts.push(`${C.dim}${hint}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const tail = phrase ? ` ${C.dim}${phrase}${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.dim}${icon}${w.label}${C.reset} ${bar(pct, 8)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
  }

  const dbg = debugChip({ showDebugChip });
  if (dbg) parts.push(`${C.dim}${dbg}${C.reset}`);

  return parts.join(`  ${C.gray}·${C.reset}  `);
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

async function main() {
  const args = process.argv.slice(2);
  const layout = parseLayout(args);
  const iconMode = parseIconMode(args);
  const catTheme = parseCatTheme(args);
  const showDebugChip = !args.includes("--no-debug-chip");
  const locale = detectLocale();
  const raw = await readStdin();
  const d = safeParse(raw);

  // Opt-in: dump the payload we just received so we can confirm which
  // rate_limits.* keys (and any extra-usage fields) the server actually
  // sends on this machine/plan. No-op unless CLAUDE_CAT_DEBUG=1.
  maybeDumpStdin(raw, d);

  const opts = { iconMode, locale, catTheme, showDebugChip };
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
