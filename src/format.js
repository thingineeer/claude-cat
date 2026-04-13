// ANSI colors. Keep minimal — status lines render in many terminals.

// Palette — organized by semantic role so each section of the status
// line reads at the same glance-weight:
//
//   bar / pct         progress (green → yellow → magenta → red)
//   brand             short window label "5h" / "week" (Claude Peach)
//   cat               cyan cat glyph
//   cost              bright white — most important number
//   separator         subtle but visible gray (not quite dim)
//   reset phrase      dim gray — secondary info
//   ctx chip          soft cyan — system info, pairs visually with cat
//   debug chip        magenta — intentionally loud, so "debug mode on"
//                     is impossible to miss
//   hint              dim gray
//
// Truecolor escapes are used for the brand peach and the soft-cyan
// ctx chip; terminals without truecolor ignore the CSI and fall back
// to default foreground.
const C = {
  reset:     "\x1b[0m",
  dim:       "\x1b[2m",
  bold:      "\x1b[1m",

  // progress-bar colors by percentage
  green:     "\x1b[32m",
  yellow:    "\x1b[33m",
  red:       "\x1b[31m",
  magenta:   "\x1b[35m",

  // cat glyph
  cat:       "\x1b[36m",              // cyan

  // section separator ('|') — brighter than dim so sections read apart
  sep:       "\x1b[37m\x1b[2m",       // white + dim = visible gray

  // cost is the single 'money' number — use bright white, no dim
  cost:      "\x1b[1m\x1b[37m",       // bold white

  // ctx chip — soft cyan to pair with the cat, dim so it sits behind
  // the window bars in scanning order
  ctx:       "\x1b[2m\x1b[36m",

  // debug chip — magenta so "debug on" is impossible to miss
  debug:     "\x1b[35m",

  // Claude Peach (#DE7356) — short window labels '5h' / 'week'
  brand:     "\x1b[38;2;222;115;86m",

  // Back-compat aliases so older call sites keep compiling.
  gray:      "\x1b[90m",
  cyan:      "\x1b[36m",
};

export function colorByPct(pct) {
  if (pct >= 95) return C.red;
  if (pct >= 85) return C.magenta;
  if (pct >= 60) return C.yellow;
  return C.green;
}

// 10-cell progress bar using block glyphs that render in most monospaced fonts.
export function bar(pct, width = 10) {
  const p = Math.max(0, Math.min(100, pct ?? 0));
  const filled = Math.round((p / 100) * width);
  const empty = width - filled;
  const col = colorByPct(p);
  return `${col}${"▓".repeat(filled)}${C.gray}${"░".repeat(empty)}${C.reset}`;
}

// Short relative countdown for the session window. Always English-
// Latin (`3h 34m` / `2d 4h` / `15m`): `h`/`m`/`d` are universally
// recognized unit abbreviations in developer-facing tooling, so the
// format reads the same in every terminal worldwide — no locale
// dispatch, no wrong-word-order edge cases.
export function fmtCountdown(resetsAtSec) {
  if (!resetsAtSec) return null;
  const s = resetsAtSec - Math.floor(Date.now() / 1000);
  if (s <= 0) return "ready";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  // Sub-minute remainders (s in [1, 59]) would round down to `0m`,
  // which misreads as "already reset". Floor at 1m instead.
  return `${Math.max(1, m)}m`;
}

// 12-hour clock in the exact form Claude's /usage screen uses:
//   "7pm", "1:00 pm". Always English; this matches the in-app UI.
function fmtClock(date) {
  const h24 = date.getHours();
  const h12 = h24 % 12 || 12;
  const m = date.getMinutes();
  const ampm = h24 < 12 ? "am" : "pm";
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// "Apr 17" — English short date, to match the /usage screen.
function fmtShortDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// IANA timezone (e.g. "Asia/Seoul"); null when the runtime can't resolve it.
export function tzName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// Absolute reset phrase data for long windows (weekly, extra usage),
// returned as a struct so the renderer composes the final sentence via
// i18n.t(). Shape:
//   { clock: "1pm", date: "Apr 17" | null, tz: "Asia/Seoul" | null }
// If resets_at is in the past, returns "ready".
export function absoluteResetParts(resetsAtSec, { now = new Date() } = {}) {
  if (!resetsAtSec) return null;
  const target = new Date(resetsAtSec * 1000);
  if (target.getTime() - now.getTime() <= 0) return "ready";
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sameDay = startOfDay(target) === startOfDay(now);
  return {
    clock: fmtClock(target),
    date: sameDay ? null : fmtShortDate(target),
    tz: tzName(),
  };
}

export function fmtCost(usd) {
  if (typeof usd !== "number" || !isFinite(usd)) return null;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1)    return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export const colors = C;
