// Content-aware tier selector.
//
// Given an available width and a list of candidate renders (richest
// first), pick the first one whose longest line fits. If nothing
// fits, return the poorest candidate — we'd rather render something
// slightly too wide than nothing at all.
//
// Candidates come from `tiers.js` + a renderer function map supplied
// by the caller. This module is a pure selector; it does not own any
// render logic itself.

import { displayWidth } from "../width.js";

// Max column width of a rendered block, honoring multi-line output.
export function measureMaxWidth(rendered) {
  if (!rendered) return 0;
  return rendered.split("\n").reduce((max, line) => {
    const w = displayWidth(line);
    return w > max ? w : max;
  }, 0);
}

/**
 * Pick the richest tier whose render fits into `availableWidth`.
 *
 * @param {object} args
 * @param {Array}  args.tiers            Candidate tiers, richest first.
 * @param {Function} args.render         (tier) => rendered string (or null if
 *                                       this tier can't render for this data).
 * @param {number} args.availableWidth   Columns we can occupy.
 * @param {number} [args.safetyMargin]   Subtracted from availableWidth to
 *                                       account for Claude Code's UI chrome.
 *                                       Default 4.
 * @returns {object} { tier, rendered, measuredWidth }
 */
export function pickBestFit({
  tiers,
  render,
  availableWidth,
  safetyMargin = 4,
}) {
  const budget = Math.max(0, availableWidth - safetyMargin);
  let fallback = null;
  for (const tier of tiers) {
    const rendered = render(tier);
    if (rendered == null) continue;
    const width = measureMaxWidth(rendered);
    if (width <= budget) {
      return { tier, rendered, measuredWidth: width };
    }
    // Keep the last-rendered candidate as a worst-case fallback.
    fallback = { tier, rendered, measuredWidth: width };
  }
  // Nothing fit — return the poorest attempt we made (that's the last
  // tier we rendered, which also happens to be the most compact).
  return fallback;
}
