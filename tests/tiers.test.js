import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, tierForWidth, preferredTier } from "../src/layout/tiers.js";

test("TIERS: ordered richest→poorest by minWidth (desc)", () => {
  const widths = TIERS.map((t) => t.minWidth);
  const sorted = [...widths].sort((a, b) => b - a);
  assert.deepEqual(widths, sorted);
});

test("TIERS: last tier catches everything (minWidth 0)", () => {
  assert.equal(TIERS[TIERS.length - 1].minWidth, 0);
});

test("tierForWidth: boundary at 120 → XL, 119 → L", () => {
  assert.equal(tierForWidth(120).name, "XL");
  assert.equal(tierForWidth(119).name, "L");
});

test("tierForWidth: boundary at 90 → L, 89 → M", () => {
  assert.equal(tierForWidth(90).name, "L");
  assert.equal(tierForWidth(89).name, "M");
});

test("tierForWidth: boundary at 70 → M, 69 → S", () => {
  assert.equal(tierForWidth(70).name, "M");
  assert.equal(tierForWidth(69).name, "S");
});

test("tierForWidth: boundary at 50 → S, 49 → XS", () => {
  assert.equal(tierForWidth(50).name, "S");
  assert.equal(tierForWidth(49).name, "XS");
});

test("tierForWidth: 0 and negatives still land on XS", () => {
  assert.equal(tierForWidth(0).name, "XS");
  assert.equal(tierForWidth(-5).name, "XS");
});

test("preferredTier: wide → XL-class", () => {
  assert.equal(preferredTier({ layout: "wide" }).name, "XL");
});

test("preferredTier: full+kawaii → XL-class", () => {
  assert.equal(preferredTier({ layout: "full", catTheme: "kawaii" }).name, "XL");
});

test("preferredTier: full → full-no-cat tier", () => {
  const t = preferredTier({ layout: "full" });
  assert.equal(t.renderer, "full-no-cat");
});

test("preferredTier: compact → compact tier", () => {
  const t = preferredTier({ layout: "compact" });
  assert.equal(t.renderer, "compact");
});

test("TIERS: each tier has required fields", () => {
  for (const t of TIERS) {
    assert.ok(typeof t.name === "string", `name in ${JSON.stringify(t)}`);
    assert.ok(typeof t.minWidth === "number");
    assert.ok(typeof t.renderer === "string");
    assert.ok(typeof t.labelStyle === "string");
    assert.ok(typeof t.barCells === "number");
    assert.ok(Array.isArray(t.chips));
    assert.ok(typeof t.wrap === "boolean");
  }
});

test("TIERS: chips never expand going down the ladder", () => {
  // Each tier's chips must be a subset of the previous tier's chips.
  for (let i = 1; i < TIERS.length; i++) {
    const prev = new Set(TIERS[i - 1].chips);
    for (const c of TIERS[i].chips) {
      assert.ok(
        prev.has(c),
        `tier ${TIERS[i].name} has chip '${c}' not in tier ${TIERS[i - 1].name}`,
      );
    }
  }
});

test("TIERS: bar width never grows going down the ladder", () => {
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(
      TIERS[i].barCells <= TIERS[i - 1].barCells,
      `bar grew at tier ${TIERS[i].name}`,
    );
  }
});
