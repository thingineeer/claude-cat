import { test } from "node:test";
import assert from "node:assert/strict";
import { detectWidth, DEFAULT_FALLBACK } from "../src/layout/detect-width.js";

// Minimal spawn/openTty stubs so strategies don't touch the real system.
const noSpawn = () => { const e = new Error("spawn disabled"); throw e; };
const noOpenTty = () => null;
const noProc = { stderr: { isTTY: false } };
const baseCtx = {
  env: {},
  spawn: noSpawn,
  openTty: noOpenTty,
  proc: noProc,
  getPid: () => 1,
  platform: "linux",
};

test("detectWidth: stdin d.columns wins over everything", () => {
  const width = detectWidth({
    ...baseCtx,
    stdinJson: { columns: 99 },
    env: { CLAUDE_CAT_COLUMNS: "77", COLUMNS: "55" },
  });
  assert.equal(width, 99);
});

test("detectWidth: CLAUDE_CAT_COLUMNS override beats everything except stdin", () => {
  const width = detectWidth({
    ...baseCtx,
    env: { CLAUDE_CAT_COLUMNS: "77", COLUMNS: "55" },
  });
  assert.equal(width, 77);
});

test("detectWidth: CI short-circuits to fallback (no spawns)", () => {
  let spawnCalls = 0;
  const width = detectWidth({
    ...baseCtx,
    env: { CI: "true" },
    spawn: () => { spawnCalls++; throw new Error("should not spawn"); },
  });
  assert.equal(width, DEFAULT_FALLBACK);
  assert.equal(spawnCalls, 0);
});

test("detectWidth: GITHUB_ACTIONS counts as headless", () => {
  const width = detectWidth({
    ...baseCtx,
    env: { GITHUB_ACTIONS: "true" },
  });
  assert.equal(width, DEFAULT_FALLBACK);
});

test("detectWidth: falls back to 120 when all strategies return null", () => {
  const width = detectWidth(baseCtx);
  assert.equal(width, DEFAULT_FALLBACK);
});

test("detectWidth: honors custom fallback", () => {
  const width = detectWidth({ ...baseCtx, fallback: 80 });
  assert.equal(width, 80);
});

test("detectWidth: $COLUMNS is last-resort env", () => {
  const width = detectWidth({
    ...baseCtx,
    env: { COLUMNS: "66" },
  });
  assert.equal(width, 66);
});

test("detectWidth: stty size parse", () => {
  const spawn = (cmd) => {
    if (cmd.startsWith("stty size")) return Buffer.from("24 88");
    throw new Error("unexpected cmd: " + cmd);
  };
  const width = detectWidth({ ...baseCtx, spawn });
  assert.equal(width, 88);
});

test("detectWidth: parent-process walk finds tty on ancestor", () => {
  // openTty and stty fail; stderr fails; $COLUMNS missing; we should
  // fall through to parentProcessTty which walks up 1 level.
  let step = 0;
  const spawn = (cmd) => {
    step++;
    if (cmd === "stty size </dev/tty") throw new Error("no /dev/tty");
    if (cmd.startsWith("ps -o ppid")) return Buffer.from("42");
    if (cmd.startsWith("ps -o tty")) return Buffer.from("ttys003");
    if (cmd.startsWith("stty size </dev/ttys003")) return Buffer.from("30 144");
    throw new Error("unexpected: " + cmd);
  };
  const width = detectWidth({ ...baseCtx, spawn });
  assert.equal(width, 144);
});

test("detectWidth: parent-process walk is skipped on Windows", () => {
  const spawn = (cmd) => {
    if (cmd.startsWith("stty")) throw new Error("no");
    if (cmd.startsWith("ps")) throw new Error("should not call ps on win32");
    return Buffer.from("");
  };
  const width = detectWidth({
    ...baseCtx,
    spawn,
    platform: "win32",
  });
  assert.equal(width, DEFAULT_FALLBACK);
});

test("detectWidth: ignores malformed stdin columns", () => {
  const width = detectWidth({
    ...baseCtx,
    stdinJson: { columns: "not a number" },
    env: { CLAUDE_CAT_COLUMNS: "77" },
  });
  assert.equal(width, 77);
});

test("detectWidth: stdin missing columns falls through", () => {
  const width = detectWidth({
    ...baseCtx,
    stdinJson: { foo: "bar" },
    env: { CLAUDE_CAT_COLUMNS: "77" },
  });
  assert.equal(width, 77);
});
