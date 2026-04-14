// Label shortening tokens.
//
// Every user-facing label has 4 lengths. A tier picks which column
// to use. Add a new label → add a row. Add a new length → add a column.
//
// Keys:
//   long    — full /usage-parity text (Current session, Resets Apr 17 1:26 pm)
//   medium  — label kept, reset phrase trimmed (session, Apr 17 1pm)
//   short   — label kept, reset phrase absolute short (session, Apr 17)
//   xshort  — window key only, no phrase (5h, wk)

export const LABELS = {
  session: {
    long:   "Current session",
    medium: "session",
    short:  "session",
    xshort: "5h",
  },
  weeklyAll: {
    long:   "Current week (all models)",
    medium: "week",
    short:  "week",
    xshort: "wk",
  },
  // {m} is replaced with the model suffix, e.g. "Sonnet", "Opus".
  weeklyModel: {
    long:   "Current week ({m} only)",
    medium: "{m} week",
    short:  "{m}",
    xshort: "{m}",
  },
};

// Helper: pick `labels.<name>[style]`, substituting {m} if needed.
export function pickLabel(name, style, model) {
  const row = LABELS[name];
  if (!row) return name;
  const tpl = row[style] ?? row.long;
  return model ? tpl.replace("{m}", model) : tpl;
}
