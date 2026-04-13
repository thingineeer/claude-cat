// claude-cat statusline renderer.
// Reads a single JSON object from stdin (fed by Claude Code) and prints
// one or more lines suitable for the statusLine feature.
//
// Expected (partial) schema:
//   cost.total_cost_usd: number
//   rate_limits.five_hour:  { used_percentage, resets_at }
//   rate_limits.seven_day:  { used_percentage, resets_at }
//   rate_limits.seven_day_opus_4x?: same shape (sonnet-only style limits vary)
//   model.display_name: string
// Missing fields are treated as optional — Claude Code only populates
// rate_limits for Pro/Max subscribers after the first assistant response.

import { pickCat } from "./cats.js";
import { bar, fmtCountdown, fmtCost, colorByPct, colors as C } from "./format.js";

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", () => resolve(buf));
  });
}

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function collectWindows(d) {
  const out = [];
  const rl = d.rate_limits || {};
  if (rl.five_hour) {
    out.push({
      key: "session",
      label: "5h",
      pct: rl.five_hour.used_percentage ?? 0,
      resets_at: rl.five_hour.resets_at,
    });
  }
  if (rl.seven_day) {
    out.push({
      key: "weekly",
      label: "7d",
      pct: rl.seven_day.used_percentage ?? 0,
      resets_at: rl.seven_day.resets_at,
    });
  }
  // Sonnet-only / opus-only windows have been observed under different keys
  // across Claude Code versions; pick up any extra known shapes.
  const extras = ["seven_day_opus", "seven_day_opus_4x", "seven_day_sonnet"];
  for (const k of extras) {
    if (rl[k]) {
      out.push({
        key: k,
        label: k.replace("seven_day_", "7d·"),
        pct: rl[k].used_percentage ?? 0,
        resets_at: rl[k].resets_at,
      });
    }
  }
  return out;
}

function renderCompact(d) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const parts = [];
  parts.push(`${C.cyan}${cat.face}${C.reset}`);

  if (windows.length === 0) {
    // Fallback: no Pro/Max rate limits yet. Show cost if present.
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}session${C.reset} ${cs}`);
    else    parts.push(`${C.dim}warming up…${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const cd = fmtCountdown(w.resets_at);
      const tail = cd ? ` ${C.dim}(${cd})${C.reset}` : "";
      parts.push(`${C.dim}${w.label}${C.reset} ${bar(pct)} ${colorByPct(pct)}${pct}%${C.reset}${tail}`);
    }
    const cs = fmtCost(cost);
    if (cs) parts.push(`${C.dim}${cs}${C.reset}`);
  }

  return parts.join(`  ${C.gray}·${C.reset}  `);
}

function renderFull(d) {
  const windows = collectWindows(d);
  const cost = d?.cost?.total_cost_usd;
  const model = d?.model?.display_name;
  const maxPct = windows.length ? Math.max(...windows.map((w) => w.pct)) : 0;
  const cat = pickCat(maxPct);

  const lines = [];
  const header = [`${C.cyan}${cat.face}${C.reset}`];
  if (model) header.push(`${C.dim}${model}${C.reset}`);
  const cs = fmtCost(cost);
  if (cs) header.push(`${C.dim}${cs}${C.reset}`);
  lines.push(header.join(`  ${C.gray}·${C.reset}  `));

  if (windows.length === 0) {
    lines.push(`  ${C.dim}(rate limits appear after the first reply; API users only see cost)${C.reset}`);
  } else {
    for (const w of windows) {
      const pct = Math.round(w.pct);
      const cd = fmtCountdown(w.resets_at);
      const label = w.label.padEnd(6);
      const right = cd ? ` ${C.dim}reset ${cd}${C.reset}` : "";
      lines.push(`  ${C.dim}${label}${C.reset}${bar(pct, 14)} ${colorByPct(pct)}${String(pct).padStart(3)}%${C.reset}${right}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes("--full") || args.includes("-f");
  const raw = await readStdin();
  const d = safeParse(raw);

  const out = full ? renderFull(d) : renderCompact(d);
  process.stdout.write(out + "\n");
}

main().catch((err) => {
  // Never break the user's status line — print a tiny fallback.
  process.stdout.write(`${C.dim}/ᐠ ? ᐟ\\ claude-cat error${C.reset}\n`);
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(0);
});
