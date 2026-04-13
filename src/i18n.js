// Lightweight locale dictionary — claude-cat only needs a handful of strings.
// The goal is to mirror the phrasing users already see in Claude's UI,
// so the terminal feels like an extension of that UI instead of a remix.

// Labels and English copy are intentionally fixed — we mirror the
// official /usage screen verbatim so the terminal and the in-app popup
// read the same on any machine. Only the *relative countdown suffix*
// for the session window is localized (e.g. '3h 15m' vs '3시간 15분 후'),
// because that phrase is genuinely awkward in Korean without word order
// adjustment.
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

const COUNTDOWN = {
  en: {
    days_hours: (d, h) => (h > 0 ? `${d}d ${h}h` : `${d}d`),
    hours_min:  (h, m) => (m > 0 ? `${h}h ${m}m` : `${h}h`),
    minutes:    (m)    => `${m}m`,
  },
  ko: {
    days_hours: (d, h) => (h > 0 ? `${d}일 ${h}시간 후` : `${d}일 후`),
    hours_min:  (h, m) => (m > 0 ? `${h}시간 ${m}분 후` : `${h}시간 후`),
    minutes:    (m)    => `${m}분 후`,
  },
};

// Which locale applies to the *countdown suffix* ("후" / nothing).
export function detectLocale() {
  const override = process.env.CLAUDE_CAT_LANG;
  if (override && COUNTDOWN[override]) return override;
  const raw = process.env.LC_ALL || process.env.LANG || process.env.LANGUAGE || "";
  const code = raw.slice(0, 2).toLowerCase();
  return COUNTDOWN[code] ? code : "en";
}

// Fixed English labels / reset phrases — same on every machine.
export function t(key, ...args) {
  const entry = LABELS[key];
  if (typeof entry === "function") return entry(...args);
  return entry ?? key;
}

// Locale-dependent countdown suffix for the session window.
export function countdown(locale, kind, ...args) {
  const table = COUNTDOWN[locale] || COUNTDOWN.en;
  return table[kind](...args);
}
