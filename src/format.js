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
    return rh > 0 ? `${d}d${rh}h` : `${d}d`;
  }
  if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
  return `${m}m`;
}

export function fmtCost(usd) {
  if (typeof usd !== "number" || !isFinite(usd)) return null;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1)    return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export const colors = C;
