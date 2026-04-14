import { test } from "node:test";
import assert from "node:assert/strict";
import { LABELS, pickLabel } from "../src/layout/labels.js";

test("pickLabel: session long", () => {
  assert.equal(pickLabel("session", "long"), "Current session");
});

test("pickLabel: session xshort = 5h", () => {
  assert.equal(pickLabel("session", "xshort"), "5h");
});

test("pickLabel: weeklyAll shrinks as style narrows", () => {
  assert.equal(pickLabel("weeklyAll", "long"), "Current week (all models)");
  assert.equal(pickLabel("weeklyAll", "medium"), "week");
  assert.equal(pickLabel("weeklyAll", "xshort"), "wk");
});

test("pickLabel: weeklyModel substitutes {m}", () => {
  assert.equal(pickLabel("weeklyModel", "long", "Sonnet"), "Current week (Sonnet only)");
  assert.equal(pickLabel("weeklyModel", "medium", "Sonnet"), "Sonnet week");
  assert.equal(pickLabel("weeklyModel", "short", "Sonnet"), "Sonnet");
});

test("pickLabel: unknown label returns name as-is", () => {
  assert.equal(pickLabel("notalabel", "long"), "notalabel");
});

test("pickLabel: unknown style falls back to long", () => {
  assert.equal(pickLabel("session", "zzz"), "Current session");
});

test("LABELS: every row has all four styles", () => {
  for (const [name, row] of Object.entries(LABELS)) {
    for (const style of ["long", "medium", "short", "xshort"]) {
      assert.ok(row[style], `LABELS.${name} missing ${style}`);
    }
  }
});
