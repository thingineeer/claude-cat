import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBestFit, measureMaxWidth } from "../src/layout/select.js";

test("measureMaxWidth: single line plain", () => {
  assert.equal(measureMaxWidth("hello"), 5);
});

test("measureMaxWidth: picks widest line in multi-line block", () => {
  assert.equal(measureMaxWidth("abc\nabcdefgh\nab"), 8);
});

test("measureMaxWidth: ignores ANSI escapes", () => {
  assert.equal(measureMaxWidth("\x1b[32mhi\x1b[0m"), 2);
});

test("measureMaxWidth: counts emoji as 2 cells", () => {
  // 🍣 is U+1F363, Misc Symbols & Pictographs → width 2
  assert.equal(measureMaxWidth("ab🍣"), 4);
});

test("measureMaxWidth: counts CJK as 2 cells", () => {
  assert.equal(measureMaxWidth("안녕"), 4);
});

test("measureMaxWidth: empty string is 0", () => {
  assert.equal(measureMaxWidth(""), 0);
});

const tiers = [
  { name: "XL", minWidth: 120 },
  { name: "L",  minWidth: 90  },
  { name: "M",  minWidth: 70  },
  { name: "S",  minWidth: 50  },
  { name: "XS", minWidth: 0   },
];

test("pickBestFit: returns richest tier that fits", () => {
  const render = (t) => {
    if (t.name === "XL") return "a".repeat(130);
    if (t.name === "L")  return "a".repeat(95);
    if (t.name === "M")  return "a".repeat(68);
    if (t.name === "S")  return "a".repeat(48);
    return "a".repeat(30);
  };
  const out = pickBestFit({ tiers, render, availableWidth: 100, safetyMargin: 0 });
  // 100 → L (95 fits), XL (130) overflows
  assert.equal(out.tier.name, "L");
  assert.equal(out.measuredWidth, 95);
});

test("pickBestFit: safetyMargin subtracts from budget", () => {
  const render = () => "a".repeat(95);
  const out = pickBestFit({ tiers, render, availableWidth: 100, safetyMargin: 10 });
  // budget 90, everything is 95 → fallback is last rendered
  assert.equal(out.measuredWidth, 95);
});

test("pickBestFit: returns null tier if render returns null for all", () => {
  const out = pickBestFit({
    tiers,
    render: () => null,
    availableWidth: 100,
  });
  assert.equal(out, null);
});

test("pickBestFit: skips tiers whose render returns null", () => {
  const render = (t) => t.name === "M" ? "a".repeat(60) : null;
  const out = pickBestFit({ tiers, render, availableWidth: 80, safetyMargin: 0 });
  assert.equal(out.tier.name, "M");
});

test("pickBestFit: when nothing fits, returns poorest attempt", () => {
  // All candidates overflow a 10-col terminal.
  const render = (t) => "a".repeat(t.minWidth || 30);
  const out = pickBestFit({ tiers, render, availableWidth: 10, safetyMargin: 0 });
  // Poorest is XS (minWidth 0) which rendered 30 cells
  assert.equal(out.tier.name, "XS");
});
