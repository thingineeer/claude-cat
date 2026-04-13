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
import { bar, fmtCountdown, absoluteResetParts, fmtCost, colorByPct, colors as C } from "./format.js";
import { parseIconMode, iconFor } from "./icons.js";
import { maybeDumpStdin, debugEnabled } from "./debug.js";
import { detectLocale, t } from "./i18n.js";

// Build the reset phrase for a given window, in the active locale.
// Session windows stay relative ("3h 51m" / "3시간 51분 후"); weekly
// windows use absolute time ("Resets 7pm (Asia/Seoul)" /
// "오후 7시에 재설정 (Asia/Seoul)").
function fmtResetPhrase(key, resetsAtSec, locale) {
  if (!resetsAtSec) return null;
  if (key === "five_hour") {
    const v = fmtCountdown(resetsAtSec, { locale });
    if (v === "ready") return t(locale, "ready_now");
    return v; // already includes locale-specific suffix ("후" / implicit english)
  }
  const parts = absoluteResetParts(resetsAtSec, { locale });
  if (!parts) return null;
  if (parts === "ready") return t(locale, "ready_now");
  return parts.date
    ? t(locale, "resets_on", parts.date, parts.clock, parts.tz)
    : t(locale, "resets_at", parts.clock, parts.tz);
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

// Window labels mirror the official Claude /usage screen, in the active
// locale. 'seven_day_<model>' keys flow through the locale's template so
// e.g. 'seven_day_sonnet' → "Current week (Sonnet only)" / "이번 주 (Sonnet만)".
function labelFor(key, locale) {
  if (key === "five_hour") return t(locale, "current_session");
  if (key === "seven_day") return t(locale, "current_week_all");
  if (key.startsWith("seven_day_")) {
    const suffix = key.slice("seven_day_".length);
    const pretty = suffix
      .split("_")
      .map((p) => (p === "4x" ? "4x" : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
    return t(locale, "current_week_scope", pretty);
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

function collectWindows(d, locale) {
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
      label: labelFor(k, locale),
      pct: v.used_percentage ?? 0,
      resets_at: v.resets_at,
    }));
}

// Visible (printable) width — strip ANSI escapes first, then count code
// points. Used to pad multi-byte labels (e.g. Korean) to the same column
// in the 'full' layout without double-padding on ANSI bytes.
function visibleWidth(s) {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  return [...stripped].length;
}
function padRight(s, width) {
  const pad = width - visibleWidth(s);
  return pad > 0 ? s + " ".repeat(pad) : s;
}

// Context window as a quietly-colored bar. We show it only in full mode
// so compact stays tight, and only when the server actually reports it.
function renderContextLine(d, locale) {
  const ctx = d?.context_window;
  if (!ctx || typeof ctx.used_percentage !== "number") return null;
  const pct = Math.round(ctx.used_percentage);
  const label = padRight(t(locale, "context_window"), locale === "ko" ? 16 : 18);
  return `  ${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}`;
}

function renderCompact(d, { iconMode = "none", locale = "en" } = {}) {
  const windows = collectWindows(d, locale);
  const cost = d?.cost?.total_cost_usd;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const parts = [];
  parts.push(`${C.cyan}${cat.face}${C.reset}`);

  if (windows.length === 0) {
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
    else    parts.push(`${C.dim}${t(locale, "warming_up")}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const tail = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.dim}${icon}${w.label}${C.reset} ${bar(pct)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
  }

  return parts.join(`  ${C.gray}·${C.reset}  `);
}

function renderFull(d, { iconMode = "none", locale = "en" } = {}) {
  const windows = collectWindows(d, locale);
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

  const labelWidth = locale === "ko" ? 16 : 26; // "Current week (all models)" ≈ 25 chars
  if (windows.length === 0) {
    lines.push(`  ${C.dim}${t(locale, "api_only_hint")}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const icon = iconFor(iconMode, w.key);
      const label = padRight(icon + w.label, labelWidth);
      const right = phrase ? ` ${C.dim}· ${phrase}${C.reset}` : "";
      lines.push(`  ${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
    }
  }
  const ctxLine = renderContextLine(d, locale);
  if (ctxLine) lines.push(ctxLine);
  return lines.join("\n");
}

// Wide layout: everything on a single line separated by middle-dots.
// Useful for heavy users who don't want the status line growing taller
// as more windows appear.
function renderWide(d, { iconMode = "none", locale = "en" } = {}) {
  const windows = collectWindows(d, locale);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const parts = [`${C.cyan}${cat.face}${C.reset}`];
  if (model) parts.push(`${C.dim}${model}${C.reset}`);
  if (windows.length === 0) {
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const phrase = fmtResetPhrase(w.key, w.resets_at, locale);
      const tail = phrase ? ` ${C.dim}${phrase}${C.reset}` : "";
      const icon = iconFor(iconMode, w.key);
      parts.push(`${C.dim}${icon}${w.label}${C.reset} ${bar(pct, 8)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const ctx = d?.context_window;
    if (ctx && typeof ctx.used_percentage === "number") {
      const pct = Math.round(ctx.used_percentage);
      parts.push(`${C.dim}${t(locale, "context_window")}${C.reset} ${bar(pct, 6)} ${colorByPct(pct)}${pct}%${C.reset}`);
    }
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
  }
  return parts.join(`  ${C.gray}·${C.reset}  `);
}

function parseLayout(args) {
  if (args.includes("--layout=wide") || args.includes("--wide")) return "wide";
  if (args.includes("--full") || args.includes("-f") || args.includes("--layout=full")) return "full";
  return "compact";
}

async function main() {
  const args = process.argv.slice(2);
  const layout = parseLayout(args);
  const iconMode = parseIconMode(args);
  const locale = detectLocale();
  const raw = await readStdin();
  const d = safeParse(raw);

  // Opt-in: dump the payload we just received so we can confirm which
  // rate_limits.* keys (and any extra-usage fields) the server actually
  // sends on this machine/plan. No-op unless CLAUDE_CAT_DEBUG=1.
  maybeDumpStdin(raw, d);

  const opts = { iconMode, locale };
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
