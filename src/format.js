// ANSI colors. Keep minimal — status lines render in many terminals.
import { countdown } from "./i18n.js";

const C = {
  reset: "\x1b[0m",
  dim:   "\x1b[2m",
  bold:  "\x1b[1m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  red:   "\x1b[31m",
  cyan:  "\x1b[36m",
  gray:  "\x1b[90m",
  magenta:"\x1b[35m",
  // Claude brand peach (#DE7356, RGB 222/115/86) for short window labels
  // in compact/wide. Uses 24-bit truecolor; modern terminals (iTerm2,
  // macOS Terminal, Alacritty, kitty, WezTerm, Windows Terminal) all
  // support it. On terminals without truecolor the CSI is ignored and
  // the text falls back to default foreground — no visual break.
  brand: "\x1b[38;2;222;115;86m",
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

// Short relative countdown for the session window. This is the only
// locale-dependent string in claude-cat — the English copy is "3h 15m",
// Korean is "3시간 15분 후".
export function fmtCountdown(resetsAtSec, { locale = "en" } = {}) {
  if (!resetsAtSec) return null;
  const s = resetsAtSec - Math.floor(Date.now() / 1000);
  if (s <= 0) return "ready";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return countdown(locale, "days_hours", d, h);
  if (h > 0) return countdown(locale, "hours_min", h, m);
  return countdown(locale, "minutes", m);
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
