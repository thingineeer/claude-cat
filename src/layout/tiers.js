// Tier ladder — think CSS media queries for terminal width.
//
// Each tier declares:
//   name       — human-facing tag (debug/logging)
//   minWidth   — tier activates when availableWidth >= minWidth AND
//                no higher tier matched first (ladder searched top→bottom)
//   renderer   — which render-* module handles this tier
//   labelStyle — pointer into ./labels.js LABELS columns
//   barCells   — bar length in cells (0 = no bar)
//   chips      — which non-critical chips survive
//                (order = priority ranking, unknown chips ignored)
//   wrap       — whether a single-line result may wrap to multi-line
//                (true only in compact tiers; kawaii forbids wrap)
//
// Adding a new tier = push a row.
// Tuning a breakpoint = change minWidth.
// Dropping a chip earlier = remove from chips array.

export const TIERS = [
  {
    name:       "XL",
    minWidth:   120,
    renderer:   "full-kawaii",
    labelStyle: "long",
    barCells:   14,
    chips:      ["model", "cost", "ctx", "debug"],
    wrap:       false,
  },
  {
    name:       "L",
    minWidth:   90,
    renderer:   "full-kawaii",
    labelStyle: "medium",
    barCells:   12,
    chips:      ["model", "cost", "ctx"],
    wrap:       false,
  },
  {
    name:       "M",
    minWidth:   70,
    renderer:   "full-no-cat",
    labelStyle: "medium",
    barCells:   10,
    chips:      ["cost", "ctx"],
    wrap:       false,
  },
  {
    name:       "S",
    minWidth:   50,
    renderer:   "compact",
    labelStyle: "short",
    barCells:   6,
    chips:      ["cost"],
    wrap:       true,
  },
  {
    name:       "XS",
    minWidth:   0,
    renderer:   "compact",
    labelStyle: "xshort",
    barCells:   0,
    chips:      [],
    wrap:       true,
  },
];

// Look up a tier by width alone — used when we need a default before
// content-aware measurement runs.
export function tierForWidth(width) {
  for (const t of TIERS) {
    if (width >= t.minWidth) return t;
  }
  return TIERS[TIERS.length - 1];
}

// User-chosen layout flags (from `--full`, `--wide`, `--kawaii`, etc.)
// map to a *preferred* starting tier. The selector may still drop
// lower if the preferred layout won't fit.
export function preferredTier({ layout, catTheme }) {
  if (layout === "wide") return TIERS[0];            // wide is always XL-ish
  if (layout === "full" && catTheme === "kawaii") {
    return TIERS[0];                                  // aim for kawaii first
  }
  if (layout === "full") return TIERS.find((t) => t.renderer === "full-no-cat") ?? TIERS[2];
  return TIERS.find((t) => t.renderer === "compact") ?? TIERS[3];
}
