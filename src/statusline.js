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
import { padEndDisplay } from "./width.js";

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
function inlineCatGlyph(pct, theme) {
  if (theme === "none") return null;
  const art = catArt(pct, "compact");  // always single-line here
  return art ? art.lines[0] : null;
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

function renderCompact(d, { iconMode = "none", locale = "en", catTheme = "compact" } = {}) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const ctx = renderContextChip(d);
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const face = inlineCatGlyph(maxPct, catTheme);

  const parts = [];
  if (face) parts.push(`${C.cyan}${face}${C.reset}`);

  if (windows.length === 0) {
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
    if (!cs && !ctx) parts.push(`${C.dim}${t("warming_up")}${C.reset}`);
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

  return parts.join(`  ${C.gray}·${C.reset}  `);
}

function renderFull(d, { iconMode = "none", locale = "en", catTheme = "compact" } = {}) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const ctx = renderContextChip(d);
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const art = catArt(maxPct, catTheme);

  const lines = [];

  // Kawaii art is multi-line; render it above the window block. Compact
  // art stays inline in the header so the first visible line still
  // carries model + cost + ctx.
  if (art && art.lines.length > 1) {
    for (const line of art.lines) lines.push(`${C.cyan}${line}${C.reset}`);
  }

  const header = [];
  if (art && art.lines.length === 1) header.push(`${C.cyan}${art.lines[0]}${C.reset}`);
  if (model) header.push(`${C.dim}${model}${C.reset}`);
  const cs = fmtCost(cost);
  if (cs)  header.push(`${C.dim}${cs}${C.reset}`);
  if (ctx) header.push(`${C.dim}${ctx}${C.reset}`);
  if (header.length) lines.push(header.join(`  ${C.gray}·${C.reset}  `));

  // Labels are English-fixed; widest is 'Current week (Sonnet only)' = 26 cols.
  const labelCols = 26;
  if (windows.length === 0) {
    lines.push(`  ${C.dim}${t("api_only_hint")}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const icon = iconFor(iconMode, w.key);
      const label = padEndDisplay(icon + w.label, labelCols);
      const right = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      lines.push(`  ${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
    }
  }
  return lines.join("\n");
}

// Wide layout: everything on a single line separated by middle-dots.
// Useful for heavy users who don't want the status line growing taller
// as more windows appear.
function renderWide(d, { iconMode = "none", locale = "en", catTheme = "compact" } = {}) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const ctx = renderContextChip(d);
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const face = inlineCatGlyph(maxPct, catTheme);

  const parts = [];
  if (face) parts.push(`${C.cyan}${face}${C.reset}`);
  if (model) parts.push(`${C.dim}${model}${C.reset}`);
  if (windows.length === 0) {
    const cs = fmtCost(cost);
    if (cs)  parts.push(`${C.dim}${cs}${C.reset}`);
    if (ctx) parts.push(`${C.dim}${ctx}${C.reset}`);
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
  const locale = detectLocale();
  const raw = await readStdin();
  const d = safeParse(raw);

  // Opt-in: dump the payload we just received so we can confirm which
  // rate_limits.* keys (and any extra-usage fields) the server actually
  // sends on this machine/plan. No-op unless CLAUDE_CAT_DEBUG=1.
  maybeDumpStdin(raw, d);

  const opts = { iconMode, locale, catTheme };
  let out;
  if (layout === "wide") out = renderWide(d, opts);
  else if (layout === "full") out = renderFull(d, opts);
  else out = renderCompact(d, opts);

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
