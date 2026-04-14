import { buildCommand, buildSettings } from "./writer.js";

export function renderPreview(answers) {
  const statusLine = buildSettings(answers);
  const lines = [];

  lines.push("");
  lines.push("  \x1b[1m── Preview ──\x1b[0m");
  lines.push("");
  lines.push(`  command:         ${statusLine.command}`);
  lines.push(`  padding:         ${statusLine.padding}`);
  lines.push(`  refreshInterval: ${statusLine.refreshInterval}`);
  if (statusLine.env) {
    for (const [k, v] of Object.entries(statusLine.env)) {
      lines.push(`  env.${k}: ${v}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}
