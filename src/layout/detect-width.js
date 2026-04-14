// Terminal-width detection, strategy-chain style.
//
// Claude Code spawns statusLine scripts with stdin/stdout/stderr as
// pipes, so process.stdout.columns is undefined and $COLUMNS reflects
// the *parent shell* at launch time, not the current terminal.
//
// Each strategy returns a positive int on success, null on "no answer"
// so the chain can fall through. All I/O-ish strategies are wrapped so
// they never throw — hot path runs every statusline tick.
//
// Strategies are ordered by (reliability × cost):
//
//   1. stdinColumns        — stdin JSON d.columns (future Claude Code)
//   2. envOverride         — CLAUDE_CAT_COLUMNS (explicit user override)
//   3. headlessShortCircuit — CI env → skip spawns, return null for fallback
//   4. ttyReadStreamIoctl  — /dev/tty + TIOCGWINSZ via tty.ReadStream
//   5. sttySize            — stty size </dev/tty (legacy, still reliable)
//   6. parentProcessTty    — walk ppid chain to find a real tty
//                            (ccstatusline-style, catches wrapper envs)
//   7. stderrIoctl         — process.stderr.getWindowSize() (cheap probe)
//   8. envColumns          — $COLUMNS (last resort before fallback)
//
// Dependency injection: detectWidth() takes { env, spawn, openTty,
// process } so tests can mock without touching the real system.

import { execSync as defaultExecSync } from "node:child_process";
import { openSync as defaultOpenSync, closeSync as defaultCloseSync } from "node:fs";
import { ReadStream as DefaultReadStream } from "node:tty";

export const DEFAULT_FALLBACK = 120;

function parsePositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// 1. stdin JSON may carry `columns` (subagent statusline already does,
//    main statusline likely will eventually — zero cost to check).
function stdinColumns({ stdinJson }) {
  if (!stdinJson || typeof stdinJson !== "object") return null;
  return parsePositiveInt(stdinJson.columns);
}

// 2. Explicit user override — always wins when set.
function envOverride({ env }) {
  return parsePositiveInt(env.CLAUDE_CAT_COLUMNS);
}

// 3. Headless environments (CI) — skip all spawns, fall through to fallback.
function headlessShortCircuit({ env }) {
  if (env.CI === "true" || env.GITHUB_ACTIONS || env.GITLAB_CI
      || env.BUILDKITE || env.CIRCLECI || env.TRAVIS) {
    // Throwing a sentinel so the chain stops and we use the fallback.
    const err = new Error("HEADLESS");
    err.__headless = true;
    throw err;
  }
  return null;
}

// 4. Best strategy for local interactive terminals — in-process ioctl,
//    no spawn. Works in VS Code, JetBrains, tmux, Warp, iTerm, kitty,
//    gnome-terminal, WSL, etc.
function ttyReadStreamIoctl({ openTty }) {
  let fd = null;
  try {
    fd = openTty();
    if (fd == null) return null;
    const stream = new DefaultReadStream(fd);
    const size = stream.getWindowSize?.();
    // Clean up the stream we just created — we only want its ioctl.
    stream.destroy?.();
    if (Array.isArray(size) && size.length >= 1) {
      return parsePositiveInt(size[0]);
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd != null) {
      try { defaultCloseSync(fd); } catch { /* ignore */ }
    }
  }
}

// 5. Legacy but reliable — subprocess parse.
function sttySize({ spawn }) {
  try {
    const out = spawn("stty size </dev/tty", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 200,
    }).toString().trim();
    const m = out.match(/\d+\s+(\d+)/);
    return m ? parsePositiveInt(m[1]) : null;
  } catch { return null; }
}

// 6. Parent-process TTY walk — the ccstatusline trick. When Claude
//    Code wraps us (our own /dev/tty fails), an ancestor process's
//    controlling tty often still points at the real terminal.
//
//    Unix-only. Walks up to 8 levels. Each hop is a cheap `ps` call.
function parentProcessTty({ spawn, getPid, platform }) {
  if (platform === "win32") return null;
  try {
    let pid = getPid();
    for (let i = 0; i < 8; i++) {
      const parentOut = spawn(`ps -o ppid= -p ${pid}`, {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 200,
      }).toString().trim();
      const parentPid = parsePositiveInt(parentOut);
      if (!parentPid) return null;
      pid = parentPid;
      const ttyOut = spawn(`ps -o tty= -p ${pid}`, {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 200,
      }).toString().trim();
      if (ttyOut && ttyOut !== "?" && ttyOut !== "??") {
        const sizeOut = spawn(`stty size </dev/${ttyOut}`, {
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 200,
        }).toString().trim();
        const m = sizeOut.match(/\d+\s+(\d+)/);
        if (m) return parsePositiveInt(m[1]);
      }
    }
    return null;
  } catch { return null; }
}

// 7. stderr sometimes stays a TTY even when stdout is piped. Under
//    Claude Code it's piped too, but no harm checking — it's free.
function stderrIoctl({ proc }) {
  try {
    if (proc.stderr && proc.stderr.isTTY && proc.stderr.getWindowSize) {
      const size = proc.stderr.getWindowSize();
      if (Array.isArray(size) && size.length >= 1) {
        return parsePositiveInt(size[0]);
      }
    }
  } catch { /* ignore */ }
  return null;
}

// 8. Last resort before fallback.
function envColumns({ env }) {
  return parsePositiveInt(env.COLUMNS);
}

export const STRATEGIES = [
  stdinColumns,
  envOverride,
  headlessShortCircuit,
  ttyReadStreamIoctl,
  sttySize,
  parentProcessTty,
  stderrIoctl,
  envColumns,
];

// Default /dev/tty opener. Returns fd or null on failure.
function defaultOpenTty() {
  try {
    return defaultOpenSync("/dev/tty", "r");
  } catch {
    return null;
  }
}

/**
 * Resolve the available terminal column count.
 *
 * @param {object} ctx
 * @param {object} [ctx.stdinJson]  Parsed stdin payload (for d.columns future-compat).
 * @param {object} [ctx.env]        Environment (default: process.env).
 * @param {Function} [ctx.spawn]    execSync-compatible (default: real execSync).
 * @param {Function} [ctx.openTty]  Returns fd or null (default: open /dev/tty).
 * @param {object}  [ctx.proc]      Process-like for stderr probe (default: global process).
 * @param {number}  [ctx.fallback]  Final fallback if every strategy returns null.
 * @returns {number} columns
 */
export function detectWidth(ctx = {}) {
  const {
    stdinJson = null,
    env = process.env,
    spawn = defaultExecSync,
    openTty = defaultOpenTty,
    proc = process,
    fallback = DEFAULT_FALLBACK,
    getPid = () => process.pid,
    platform = process.platform,
  } = ctx;

  const callCtx = { stdinJson, env, spawn, openTty, proc, getPid, platform };

  for (const strategy of STRATEGIES) {
    try {
      const v = strategy(callCtx);
      if (v != null) return v;
    } catch (err) {
      if (err && err.__headless) return fallback; // short-circuit
      // Other errors in a strategy are swallowed — keep the chain alive.
    }
  }
  return fallback;
}
