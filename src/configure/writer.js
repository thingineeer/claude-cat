import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

export function buildCommand(answers) {
  const flags = [];

  if (answers.layout === "full") flags.push("--full");
  else if (answers.layout === "wide") flags.push("--wide");

  if (answers.layout === "full") {
    if (answers.catTheme === "kawaii") flags.push("--kawaii");
    else if (answers.catTheme === "none") flags.push("--no-cat");
  }

  return `npx -y claude-cat@latest${flags.length ? " " + flags.join(" ") : ""}`;
}

export function buildSettings(answers) {
  const env = {};
  if (answers.plan && answers.plan !== "auto") {
    env.CLAUDE_CAT_PLAN = answers.plan;
  }

  const statusLine = {
    type: "command",
    command: buildCommand(answers),
    // Match the recommended value in README's manual-setup prompts —
    // padding: 0 hands the full terminal width to the status line so
    // long bars and chips don't wrap prematurely on narrower panes.
    padding: 0,
    refreshInterval: answers.refresh,
  };

  if (Object.keys(env).length > 0) {
    statusLine.env = env;
  }

  return statusLine;
}

export function readCurrentSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function buildDiff(answers) {
  const current = readCurrentSettings();
  const statusLine = buildSettings(answers);

  const next = { ...current, statusLine };

  return {
    before: current.statusLine ?? null,
    after: statusLine,
    full: next,
  };
}

export function applySettings(answers) {
  const { full } = buildDiff(answers);

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  const tmp = join(
    dirname(SETTINGS_PATH),
    `.settings-tmp-${randomBytes(4).toString("hex")}.json`,
  );
  writeFileSync(tmp, JSON.stringify(full, null, 2) + "\n", "utf8");
  renameSync(tmp, SETTINGS_PATH);

  return SETTINGS_PATH;
}
