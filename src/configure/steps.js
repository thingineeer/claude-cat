export const STEPS = [
  {
    id: "layout",
    label: "Layout",
    description: "How should the status line look?",
    items: [
      { label: "compact — single line, bars + cost (recommended)", value: "compact" },
      { label: "full — 3 rows, cat on the left", value: "full" },
      { label: "wide — single line, wider bars", value: "wide" },
    ],
    defaultValue: "compact",
  },
  {
    id: "catTheme",
    label: "Cat theme",
    description: "Which cat style?",
    items: [
      { label: "kawaii — 3-line ASCII art with mood props", value: "kawaii" },
      { label: "compact — single-line face", value: "compact" },
      { label: "none — no cat", value: "none" },
    ],
    defaultValue: "kawaii",
    skip: (answers) => answers.layout === "compact" || answers.layout === "wide",
  },
  {
    id: "cost",
    label: "Cost chip ($)",
    description: "Show this session's running cost — e.g. $13.17",
    items: [
      { label: "auto — hide on Pro/Max, show on API-key (recommended)", value: "auto" },
      { label: "show — always $13.17", value: "show" },
      { label: "hide — never show cost", value: "hide" },
    ],
    defaultValue: "auto",
  },
  {
    id: "tokens",
    label: "Tokens chip",
    description: "Show this session's token usage — e.g. tok 42k",
    items: [
      { label: "auto — show on every plan (recommended)", value: "auto" },
      { label: "show — always tok 42k", value: "show" },
      { label: "hide — never show tokens", value: "hide" },
    ],
    defaultValue: "auto",
  },
  {
    id: "context",
    label: "Context chip",
    description: "Show context-window fill — e.g. ctx 20%",
    items: [
      { label: "show — ctx 20% (recommended)", value: "show" },
      { label: "hide", value: "hide" },
    ],
    defaultValue: "show",
  },
  {
    id: "refresh",
    label: "Refresh interval",
    description: "How often to refresh (seconds)?",
    items: [
      { label: "300 — every 5 min (recommended)", value: 300 },
      { label: "60 — every minute", value: 60 },
      { label: "600 — every 10 min", value: 600 },
    ],
    defaultValue: 300,
  },
  {
    id: "plan",
    label: "Plan",
    description: "Your Claude subscription plan?",
    items: [
      { label: "auto — show whatever the server sends (recommended)", value: "auto" },
      { label: "pro — hide weekly bars (Pro has generous limits)", value: "pro" },
      { label: "max — show all bars", value: "max" },
    ],
    defaultValue: "auto",
  },
];
