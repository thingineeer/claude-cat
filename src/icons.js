// Label icons are an opt-in layer prepended to window labels.
//
// Modes:
//   none   — nothing prefixed (default; safest for unknown terminal fonts)
//   emoji  — standard Unicode emoji (⏱ 📅). No extra font required, but
//            rendering width varies across terminals.
//   nerd   — Nerd Font glyphs (,). Assumes the user has a Nerd Font
//            installed in their terminal.
//
// Only 'none' is wired up in this release — emoji/nerd land in a follow-up PR
// so the terminal output stays predictable for everyone on 1.x.
export const ICON_MODES = ["none", "emoji", "nerd"];

const TABLE = {
  none:  { five_hour: "", seven_day: "", seven_day_prefix: "" },
  emoji: { five_hour: "⏱ ", seven_day: "📅 ", seven_day_prefix: "📅 " },
  nerd:  { five_hour: " ", seven_day: " ", seven_day_prefix: " " },
};

export function parseIconMode(argv) {
  // Accept `--icons=<mode>` or bare `--icons` (defaults to 'emoji').
  for (const a of argv) {
    if (a === "--icons") return "emoji";
    if (a.startsWith("--icons=")) {
      const m = a.slice("--icons=".length);
      if (ICON_MODES.includes(m)) return m;
    }
  }
  return "none";
}

export function iconFor(mode, key) {
  const table = TABLE[mode] || TABLE.none;
  if (key === "five_hour") return table.five_hour;
  if (key === "seven_day") return table.seven_day;
  if (key && key.startsWith("seven_day_")) return table.seven_day_prefix;
  return "";
}
