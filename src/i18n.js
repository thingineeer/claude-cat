// Lightweight locale dictionary — claude-cat only needs a handful of strings.
// The goal is to mirror the phrasing users already see in Claude's UI,
// so the terminal feels like an extension of that UI instead of a remix.

const DICT = {
  en: {
    current_session:       "Current session",
    current_week_all:      "Current week (all models)",
    current_week_scope:    (model) => `Current week (${model} only)`,
    context_window:        "Context",
    // Reset phrasing — uses 12h clock like the /usage screen (e.g. "7pm").
    resets_at:             (clock, tz) => `Resets ${clock}${tz ? ` (${tz})` : ""}`,
    resets_on:             (date, clock, tz) => `Resets ${date}, ${clock}${tz ? ` (${tz})` : ""}`,
    ready_now:             "ready now",
    warming_up:            "warming up…",
    api_only_hint:         "(rate limits appear after the first reply; API users only see cost)",
  },
  ko: {
    current_session:       "현재 세션",
    current_week_all:      "이번 주 (모든 모델)",
    current_week_scope:    (model) => `이번 주 (${model}만)`,
    context_window:        "컨텍스트",
    resets_at:             (clock, tz) => `${clock}에 재설정${tz ? ` (${tz})` : ""}`,
    resets_on:             (date, clock, tz) => `${date} ${clock}에 재설정${tz ? ` (${tz})` : ""}`,
    ready_now:             "지금 재설정됨",
    warming_up:            "준비 중…",
    api_only_hint:         "(사용량 한도는 첫 응답 이후 표시됩니다. API 사용자는 비용만 표시됩니다)",
  },
};

export function detectLocale() {
  // Explicit override wins.
  const override = process.env.CLAUDE_CAT_LANG;
  if (override && DICT[override]) return override;
  // Otherwise: read LC_ALL / LANG / LANGUAGE, normalize to 2 letters.
  const raw = process.env.LC_ALL || process.env.LANG || process.env.LANGUAGE || "";
  const code = raw.slice(0, 2).toLowerCase();
  return DICT[code] ? code : "en";
}

export function t(locale, key, ...args) {
  const entry = (DICT[locale] || DICT.en)[key] ?? DICT.en[key];
  if (typeof entry === "function") return entry(...args);
  return entry ?? key;
}
