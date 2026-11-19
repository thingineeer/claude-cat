// Small phrase table. Labels mirror Claude's `/usage` popup verbatim
// (English only) so the terminal and the in-app UI read the same on any
// machine. There is no locale dispatch — the session countdown is now
// also English (`3h 34m`), which keeps one format for every terminal
// worldwide.
const LABELS = {
  current_session:     "Current session",
  current_week_all:    "Current week (all models)",
  current_week_scope:  (model) => `Current week (${model} only)`,
  // Fable's weekly window — `seven_day_fable` or the older
  // `seven_day_overage_included` (billing-term key); label it by the
  // model family so it survives point releases (Fable 5 → 5.2 …).
  current_week_fable:  "Current week (Fable)",
  // Claude apps gateway spend cap (`rate_limits.spend_limit`).
  spend_limit:         "Spend limit",
  // Reset phrase — concise, no timezone (always local time).
  //   'Resets 7pm'          — same-day windows
  //   'Resets Apr 17, 1pm'  — different-day windows
  resets_at:           (clock) => `Resets ${clock}`,
  resets_on:           (date, clock) => `Resets ${date}, ${clock}`,
  ready_now:           "ready now",
  // Short status phrases shown beside the resting cat when we have no
  // rate_limits to draw. Each must fit a typical terminal width without
  // wrapping; keep them under ~40 columns.
  warming_up:          "resting — waiting for first reply",
  cost_only_mode:      "API mode — cost only",
  // Marker on bars drawn from a stale cache entry (idle terminal, last
  // active session was a while ago). 'ago' phrase comes from fmtAgo.
  stale_marker:        (ago) => `stale · ${ago}`,
  debug_tag:           "[Debug]",
};

export function t(key, ...args) {
  const entry = LABELS[key];
  if (typeof entry === "function") return entry(...args);
  return entry ?? key;
}
