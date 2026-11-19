// `claude-cat update` — bring every local copy of claude-cat up to the
// latest published version, in one command.
//
// Why this exists: the recommended statusLine command is
// `npx -y claude-cat@latest`, and npx keeps a cached install under
// <npm cache>/_npx/<hash>/. That cache can keep serving an old version
// for a while after a release, and users who pinned a version
// (`claude-cat@1.4.0`) or installed globally never move at all.
//
// What it does (each step is skipped when there's nothing to do):
//   1. look up the latest version on the npm registry
//   2. drop stale npx cache entries that hold an older claude-cat
//   3. `npm install -g claude-cat@<latest>` if a global copy is older
//   4. bump a pinned `claude-cat@x.y.z` in ~/.claude/settings.json
//   5. pre-warm npx with the new version so the next status-line
//      render doesn't pay the install cost
//
// Network: this is the ONLY code path in claude-cat that touches the
// network, and it only talks to the npm registry — never Anthropic,
// never credentials. It runs only when the user types the command;
// the status-line render path stays network-free.
//
// Flags:
//   --dry-run   print what would change, change nothing
//   --no-warm   skip step 5 (the npx pre-install)
// Env:
//   CLAUDE_CAT_UPDATE_LATEST=x.y.z  skip the registry lookup (tests/CI)

import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const PKG = "claude-cat";
const SEMVER = /^\d+\.\d+\.\d+$/;
const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

const c = {
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

export function ownVersion() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    return JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;
  } catch {
    return null;
  }
}

// Compare two x.y.z strings. Returns <0, 0, >0. Non-semver sorts low so
// anything unparseable is treated as "older".
export function cmpVersion(a, b) {
  const pa = SEMVER.test(a ?? "") ? a.split(".").map(Number) : [-1, -1, -1];
  const pb = SEMVER.test(b ?? "") ? b.split(".").map(Number) : [-1, -1, -1];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// npm on Windows is npm.cmd; execFileSync needs the real name.
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

function npm(args, { timeout = 60000, inherit = false } = {}) {
  return execFileSync(NPM, args, {
    encoding: "utf8",
    timeout,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "ignore"],
    shell: process.platform === "win32",
  });
}

async function latestVersion() {
  const forced = process.env.CLAUDE_CAT_UPDATE_LATEST;
  if (forced) return SEMVER.test(forced) ? forced : null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://registry.npmjs.org/${PKG}/latest`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);
    if (res.ok) {
      const v = (await res.json())?.version;
      if (SEMVER.test(v ?? "")) return v;
    }
  } catch {}
  // Fallback: let npm resolve it (honors the user's registry config).
  try {
    const v = npm(["view", PKG, "version"], { timeout: 20000 }).trim();
    return SEMVER.test(v) ? v : null;
  } catch {
    return null;
  }
}

function npmCacheDir() {
  if (process.env.npm_config_cache) return process.env.npm_config_cache;
  try {
    const v = npm(["config", "get", "cache"], { timeout: 10000 }).trim();
    if (v) return v;
  } catch {}
  return join(homedir(), ".npm");
}

// npx installs live in <cache>/_npx/<hash>/. Only report entries whose
// manifest asks for claude-cat and nothing else — we never delete an
// npx dir that another tool shares.
export function findNpxCopies(cacheDir) {
  const root = join(cacheDir, "_npx");
  let dirs = [];
  try { dirs = readdirSync(root); } catch { return []; }
  const out = [];
  for (const h of dirs) {
    const dir = join(root, h);
    try {
      const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const deps = Object.keys(manifest.dependencies || {});
      if (deps.length !== 1 || deps[0] !== PKG) continue;
      const installed = JSON.parse(
        readFileSync(join(dir, "node_modules", PKG, "package.json"), "utf8"),
      ).version;
      out.push({ dir, version: installed });
    } catch {}
  }
  return out;
}

function globalCopy() {
  try {
    const root = npm(["root", "-g"], { timeout: 10000 }).trim();
    const p = join(root, PKG, "package.json");
    if (!existsSync(p)) return null;
    return { version: JSON.parse(readFileSync(p, "utf8")).version };
  } catch {
    return null;
  }
}

// Find a pinned `claude-cat@x.y.z` in the statusLine command. `@latest`
// and unpinned commands need no rewrite — clearing the npx cache is
// enough for them.
export function pinnedInCommand(command) {
  if (typeof command !== "string") return null;
  const m = command.match(/claude-cat@(\d+\.\d+\.\d+)(?![\w.-])/);
  return m ? m[1] : null;
}

function readSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeSettings(obj) {
  const tmp = join(dirname(SETTINGS_PATH), `.settings-tmp-${randomBytes(4).toString("hex")}.json`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  renameSync(tmp, SETTINGS_PATH);
}

export async function run(argv = process.argv.slice(3)) {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const warm = !argv.includes("--no-warm");
  const tag = dryRun ? `${c.yellow}[dry-run]${c.reset} ` : "";
  const say = (s) => process.stdout.write(s + "\n");

  const running = ownVersion();
  say(`${c.bold}🐾 claude-cat update${c.reset}${dryRun ? `  ${c.dim}(dry run — nothing will change)${c.reset}` : ""}`);

  const latest = await latestVersion();
  if (!latest) {
    say(`${c.red}✖ couldn't reach the npm registry — check your network and retry.${c.reset}`);
    process.exitCode = 1;
    return;
  }
  say(`  latest on npm   ${c.green}${latest}${c.reset}`);
  say(`  running now     ${running ?? "unknown"}`);

  let changed = 0;

  // 1. stale npx cache entries
  const cacheDir = npmCacheDir();
  const copies = findNpxCopies(cacheDir);
  const stale = copies.filter((x) => cmpVersion(x.version, latest) < 0);
  if (copies.length === 0) {
    say(`  npx cache       ${c.dim}no cached copy${c.reset}`);
  } else if (stale.length === 0) {
    say(`  npx cache       ${c.green}up to date${c.reset}`);
  }
  for (const s of stale) {
    say(`  ${tag}npx cache       remove ${s.version} ${c.dim}${s.dir}${c.reset}`);
    if (!dryRun) {
      try { rmSync(s.dir, { recursive: true, force: true }); changed++; }
      catch (e) { say(`  ${c.red}✖ couldn't remove ${s.dir}: ${e.message}${c.reset}`); }
    }
  }

  // 2. global install
  const g = globalCopy();
  if (g && cmpVersion(g.version, latest) < 0) {
    say(`  ${tag}global install  ${g.version} → ${latest}`);
    if (!dryRun) {
      try { npm(["install", "-g", `${PKG}@${latest}`], { timeout: 180000, inherit: true }); changed++; }
      catch { say(`  ${c.red}✖ npm install -g failed — run it yourself: npm install -g ${PKG}@${latest}${c.reset}`); }
    }
  } else if (g) {
    say(`  global install  ${c.green}${g.version} (up to date)${c.reset}`);
  }

  // 3. pinned version in ~/.claude/settings.json
  const settings = readSettings();
  const cmd = settings?.statusLine?.command;
  const pinned = pinnedInCommand(cmd);
  if (typeof cmd !== "string" || !cmd.includes(PKG)) {
    say(`  settings.json   ${c.dim}claude-cat isn't your statusLine yet — run: npx -y claude-cat@latest configure${c.reset}`);
  } else if (pinned && cmpVersion(pinned, latest) < 0) {
    const next = cmd.replace(`${PKG}@${pinned}`, `${PKG}@${latest}`);
    say(`  ${tag}settings.json   statusLine pin ${pinned} → ${latest}`);
    say(`  ${c.dim}  - ${cmd}${c.reset}`);
    say(`  ${c.dim}  + ${next}${c.reset}`);
    if (!dryRun) {
      try {
        writeSettings({ ...settings, statusLine: { ...settings.statusLine, command: next } });
        changed++;
      } catch (e) {
        say(`  ${c.red}✖ couldn't write ${SETTINGS_PATH}: ${e.message}${c.reset}`);
      }
    }
  } else {
    say(`  settings.json   ${c.green}${pinned ? `pinned ${pinned} (up to date)` : "uses @latest"}${c.reset}`);
  }

  // 4. pre-warm npx so the next status-line render is instant.
  // npx keys its cache dir by the *spec string*, so warm exactly the
  // spec the statusLine runs: `claude-cat@latest` for the default
  // command, `claude-cat@<latest>` for a pinned one. Warming a
  // different spec would install a copy the status line never uses.
  const usesNpx = typeof cmd !== "string" || /\bnpx\b|\bnpm\s+exec\b/.test(cmd);
  if (warm && usesNpx) {
    const spec = pinned ? `${PKG}@${latest}` : `${PKG}@latest`;
    say(`  ${tag}npx cache       warm ${spec}`);
    if (!dryRun) {
      try {
        npm(["exec", "--yes", `--package=${spec}`, "--", PKG, "--version"], { timeout: 180000 });
      } catch {
        say(`  ${c.dim}  (pre-warm skipped — the next status-line render will install it)${c.reset}`);
      }
    }
  }

  if (dryRun) {
    say(`${c.dim}Dry run finished — re-run without --dry-run to apply.${c.reset}`);
  } else if (changed > 0) {
    say(`${c.green}✔ claude-cat ${latest} is ready.${c.reset} The status line picks it up on its next refresh.`);
  } else {
    say(`${c.green}✔ Already on the latest version (${latest}).${c.reset}`);
  }
}
