// ANSI colors. Keep minimal — status lines render in many terminals.
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

// Short relative countdown — best for short windows (session / 5h).
// Inserts a space between units so readers can parse it at a glance:
//   "3h 51m", "45m", "1d 4h", "12m", "ready"
export function fmtCountdown(resetsAtSec) {
  if (!resetsAtSec) return null;
  const now = Math.floor(Date.now() / 1000);
  const s = resetsAtSec - now;
  if (s <= 0) return "ready";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  }
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// Absolute reset time — best for long windows (weekly / 7d).
// Uses weekday + wall-clock in the user's local time, with "today" and
// "tomorrow" shortcuts so the next reset feels concrete:
//   "today 5:30 PM", "tomorrow 1:00 AM", "Fri 1:00 PM", "Apr 20 1:00 PM"
export function fmtAbsoluteReset(resetsAtSec, now = new Date()) {
  if (!resetsAtSec) return null;
  const target = new Date(resetsAtSec * 1000);
  if (target.getTime() - now.getTime() <= 0) return "ready";

  const time = target.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);

  if (dayDiff === 0) return `today ${time}`;
  if (dayDiff === 1) return `tomorrow ${time}`;
  if (dayDiff >= 2 && dayDiff <= 6) {
    const wd = target.toLocaleDateString(undefined, { weekday: "short" });
    return `${wd} ${time}`;
  }
  const md = target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${md} ${time}`;
}

// Humanize a reset time for a given window key.
// Session/5h-style windows stay relative; weekly-style windows go absolute.
export function fmtResetFor(key, resetsAtSec, now = new Date()) {
  if (!resetsAtSec) return null;
  if (key === "five_hour") return fmtCountdown(resetsAtSec);
  if (key && key.startsWith("seven_day")) return fmtAbsoluteReset(resetsAtSec, now);
  return fmtCountdown(resetsAtSec);
}

export function fmtCost(usd) {
  if (typeof usd !== "number" || !isFinite(usd)) return null;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1)    return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export const colors = C;
