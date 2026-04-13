// Small phrase table. Labels mirror Claude's `/usage` popup verbatim
// (English only) so the terminal and the in-app UI read the same on any
// machine. There is no locale dispatch — the session countdown is now
// also English (`3h 34m`), which keeps one format for every terminal
// worldwide.
const LABELS = {
  current_session:     "Current session",
  current_week_all:    "Current week (all models)",
  current_week_scope:  (model) => `Current week (${model} only)`,
  extra_usage:         "Extra usage",
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
  cost_not_tracked:    "cost not tracked on this provider",
  debug_tag:           "[Debug]",
};

export function t(key, ...args) {
  const entry = LABELS[key];
  if (typeof entry === "function") return entry(...args);
  return entry ?? key;
}
