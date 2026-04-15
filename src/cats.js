// Cat art — each theme exposes moods keyed either to usage percentage
// or to an explicit state (e.g. 'resting' while waiting for the first
// assistant reply). Themes return either a single-line string (compact)
// or an array of lines (kawaii).
//
// USAGE-DRIVEN MOODS:
//   chill     0–30%    — calm, enjoying something
//   curious   30–60%   — focused, working
//   alert     60–85%   — starting to feel the load
//   nervous   85–95%   — tired, needs a break
//   critical  95%+     — conked out
//
// STATE-DRIVEN MOODS:
//   resting            — no windows yet (warming up, api-only, etc.)
//                        dozing pose, independent of usage percent

import { getRenderNowSec } from "./format.js";

const THRESHOLDS = [
  { max: 30,  mood: "chill"    },
  { max: 60,  mood: "curious"  },
  { max: 85,  mood: "alert"    },
  { max: 95,  mood: "nervous"  },
  { max: 101, mood: "critical" },
];

// One-line cat for the compact theme.
// A single 'eyes + ᴥ + eyes' family. Only the eye glyph changes across
// moods so the face shape stays consistent and reads the same in every
// monospace font — previous mixed-width glyphs (｡, ≻, ⌒) wobbled the
// cursor column in some terminals.
const COMPACT = {
  chill:    "/ᐠ ^ᴥ^ ᐟ\\",  // smiling eyes — the face users see most, should feel friendly
  curious:  "/ᐠ •ᴥ• ᐟ\\",  // round eyes, watching
  alert:    "/ᐠ ◉ᴥ◉ ᐟ\\",  // wide open
  nervous:  "/ᐠ ⊙ᴥ⊙ ᐟ\\",  // dilated
  critical: "/ᐠ ✖ᴥ✖ ᐟ\\",  // X eyes, done
  resting:  "/ᐠ -ᴥ- ᐟ\\",  // dozing, eyes shut
};

// Kawaii 3-line cat with a mood-specific prop.
const KAWAII = {
  chill:    [" /\\_/\\",  "( ^ω^ )",   " / >🍣"],
  curious:  [" /\\_/\\",  "( •ㅅ•)",   " / >⌨️"],
  alert:    [" /\\_/\\",  "( -ㅅ-)",   " / づ☕"],
  nervous:  [" /\\_/\\",  "( xㅅx)",   " / づ💤"],
  critical: [" /\\_/|",   "( -.-)zzZ", " /   \\"],
  resting:  [" /\\_/\\",  "( -.-)",    " / >🚬~"], // chilling with a smoke while it waits
};

const THEMES = { compact: COMPACT, kawaii: KAWAII, none: null };

export const THEME_NAMES = Object.keys(THEMES);

// Map a single percentage to a mood (legacy; prefer moodFromWindows).
export function moodFor(percent) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  for (const t of THRESHOLDS) if (p < t.max) return t.mood;
  return THRESHOLDS[THRESHOLDS.length - 1].mood;
}

// Pick a mood from the full window set.
//
// Policy — "weekly drives the mood, session can escalate it":
//   - Session windows that already reset (resets_at ≤ now) are ignored
//     — a 100% session that's about to flip doesn't make the cat panic.
//   - critical  if any remaining window ≥ 95
//   - nervous   if any remaining window ≥ 85
//   - alert     if weekly ≥ 60, OR session ≥ 75 (short burst)
//   - curious   if any remaining window ≥ 30
//   - chill     otherwise (incl. no windows at all)
//
// The rationale: the 5-hour bar resets fast and is forgiving; the 7-day
// bar is the one that actually constrains your week. So weekly
// saturation is weighted earlier (60%) than session saturation (75%).
export function moodFromWindows(windows, { now = getRenderNowSec() } = {}) {
  const live = (windows || []).filter((w) => !(w.resets_at && w.resets_at <= now));
  if (live.length === 0) return "chill";

  const pct = (key) => {
    const w = live.find((x) => x.key === key);
    return w ? w.pct ?? 0 : 0;
  };
  const session = pct("five_hour");
  const weekly = Math.max(
    ...live.filter((w) => w.key.startsWith("seven_day")).map((w) => w.pct ?? 0),
    0,
  );
  const anyMax = Math.max(...live.map((w) => w.pct ?? 0), 0);

  if (anyMax >= 95) return "critical";
  if (anyMax >= 85) return "nervous";
  if (weekly >= 60 || session >= 75) return "alert";
  if (anyMax >= 30) return "curious";
  return "chill";
}

// Pick art for a given mood. Accepts either:
//   catArt(percent, theme)                — legacy, uses moodFor(pct)
//   catArt({ windows, state }, theme)     — preferred
// State takes priority over window-derived mood when provided.
//
// Returns { lines, mood } or null.
export function catArt(source, theme = "compact") {
  const table = THEMES[theme];
  if (!table) return null;

  let mood;
  if (typeof source === "number") {
    mood = moodFor(source);
  } else if (source && typeof source === "object") {
    if (source.state === "resting") {
      mood = "resting";
    } else {
      mood = moodFromWindows(source.windows || []);
    }
  } else {
    return null;
  }

  const art = table[mood];
  if (!art) return null;
  const lines = Array.isArray(art) ? art : [art];
  return { lines, mood };
}

// Back-compat shim for the old single-face API.
export function pickCat(percent) {
  const mood = moodFor(percent);
  return { mood, face: COMPACT[mood] };
}
