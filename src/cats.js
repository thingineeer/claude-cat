// Cat faces reflect the highest usage across available rate-limit windows.
// Thresholds are inclusive on the lower bound.
export const CATS = [
  { max: 30,  face: "/ᐠ - ˕ - ᐟ\\",  mood: "chill"    },
  { max: 60,  face: "/ᐠ ｡ㅅ｡ᐟ\\",    mood: "curious"  },
  { max: 85,  face: "/ᐠ •ㅅ• ᐟ\\",   mood: "alert"    },
  { max: 95,  face: "/ᐠ ≻ㅅ≺ ᐟ\\",  mood: "nervous"  },
  { max: 101, face: "/ᐠ ✖ㅅ✖ ᐟ\\",  mood: "critical" },
];

export function pickCat(percent) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  for (const c of CATS) if (p < c.max) return c;
  return CATS[CATS.length - 1];
}
