// Cat art — each theme exposes 5 moods keyed to usage percentage.
// Themes return either a single-line string (compact) or an array of
// lines (kawaii). Thresholds below are inclusive on the lower bound.
//
// MOODS (shared by every theme):
//   chill     0–30%    — calm, enjoying something
//   curious   30–60%   — focused, working
//   alert     60–85%   — starting to feel the load
//   nervous   85–95%   — tired, needs a break
//   critical  95%+     — conked out

const THRESHOLDS = [
  { max: 30,  mood: "chill"    },
  { max: 60,  mood: "curious"  },
  { max: 85,  mood: "alert"    },
  { max: 95,  mood: "nervous"  },
  { max: 101, mood: "critical" },
];

// One-line cat that fits even the tightest compact layout.
const COMPACT = {
  chill:    "/ᐠ - ˕ - ᐟ\\",
  curious:  "/ᐠ ｡ㅅ｡ᐟ\\",
  alert:    "/ᐠ •ㅅ• ᐟ\\",
  nervous:  "/ᐠ ≻ㅅ≺ ᐟ\\",
  critical: "/ᐠ ✖ㅅ✖ ᐟ\\",
};

// Kawaii 3-line cat with a prop that shifts with the mood.
// Props (sushi / keyboard / coffee / zzz / sleeping) narrate the vibe
// without words. Kept to ASCII + a single emoji per pose so it renders
// on most terminals.
const KAWAII = {
  chill: [
    " /\\_/\\",
    "( ^ω^ )",
    " / >🍣",
  ],
  curious: [
    " /\\_/\\",
    "( •ㅅ•)",
    " / >⌨️",
  ],
  alert: [
    " /\\_/\\",
    "( -ㅅ-)",
    " / づ☕",
  ],
  nervous: [
    " /\\_/\\",
    "( xㅅx)",
    " / づ💤",
  ],
  critical: [
    " /\\_/|",
    "( -.-)zzZ",
    " /   \\",
  ],
};

const THEMES = { compact: COMPACT, kawaii: KAWAII, none: null };

export const THEME_NAMES = Object.keys(THEMES);

export function moodFor(percent) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  for (const t of THRESHOLDS) if (p < t.max) return t.mood;
  return THRESHOLDS[THRESHOLDS.length - 1].mood;
}

// Returns either:
//   { lines: [...], mood }   — art to render (compact is [line])
//   null                     — theme 'none' / unknown mood
export function catArt(percent, theme = "compact") {
  const mood = moodFor(percent);
  const table = THEMES[theme];
  if (!table) return null;
  const art = table[mood];
  if (!art) return null;
  const lines = Array.isArray(art) ? art : [art];
  return { lines, mood };
}

// Back-compat shim for the old single-face API. Existing callers can
// keep pickCat(pct).face without any changes.
export function pickCat(percent) {
  const mood = moodFor(percent);
  return { mood, face: COMPACT[mood] };
}
