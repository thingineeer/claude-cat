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
// English uses compact units ("3h 51m"). Korean uses native words
// ("3시간 51분 후"). In both we drop trailing zero units.
export function fmtCountdown(resetsAtSec, { locale = "en" } = {}) {
  if (!resetsAtSec) return null;
  const s = resetsAtSec - Math.floor(Date.now() / 1000);
  if (s <= 0) return "ready";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (locale === "ko") {
    if (d > 0) return h > 0 ? `${d}일 ${h}시간 후` : `${d}일 후`;
    if (h > 0) return m > 0 ? `${h}시간 ${m}분 후` : `${h}시간 후`;
    return `${m}분 후`;
  }
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// 12-hour clock in the same compact form as Claude's /usage screen:
//   "7pm", "1:00 pm" (en) / "오후 7시", "오후 1시 30분" (ko)
function fmtClock(date, locale) {
  const h24 = date.getHours();
  const h12 = h24 % 12 || 12;
  const m = date.getMinutes();
  if (locale === "ko") {
    const ampm = h24 < 12 ? "오전" : "오후";
    return m === 0 ? `${ampm} ${h12}시` : `${ampm} ${h12}시 ${m}분`;
  }
  const ampm = h24 < 12 ? "am" : "pm";
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtShortDate(date, locale) {
  if (locale === "ko") return `${date.getMonth() + 1}월 ${date.getDate()}일`;
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

// Absolute reset phrase data for long windows (weekly / 7d), returned as
// a struct so the renderer can compose the locale-specific sentence via
// i18n instead of hard-coding word order. Shape:
//   { clock: "1pm", date: "Apr 17" | null, tz: "Asia/Seoul" | null }
// If 'resets_at' is in the past, returns "ready".
export function absoluteResetParts(resetsAtSec, { now = new Date(), locale = "en" } = {}) {
  if (!resetsAtSec) return null;
  const target = new Date(resetsAtSec * 1000);
  if (target.getTime() - now.getTime() <= 0) return "ready";
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sameDay = startOfDay(target) === startOfDay(now);
  return {
    clock: fmtClock(target, locale),
    date: sameDay ? null : fmtShortDate(target, locale),
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
