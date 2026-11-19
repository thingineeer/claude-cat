#!/usr/bin/env bash
# Unused / reset windows read 0% instead of disappearing or keeping a
# stale number.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
run() { HOME="$TMP/$1" node "$ROOT/bin/cli.js" "${@:2}" | sed -E $'s/\x1b\\[[0-9;]*m//g'; }
fail() { echo "FAIL: $*"; exit 1; }

# Weekly window whose reset already passed → 0%, no reset phrase, not "API mode".
OUT="$(echo '{"cost":{"total_cost_usd":3},"rate_limits":{"seven_day":{"used_percentage":66,"resets_at":1700000000}}}' | run a)"
echo "$OUT" | grep -q "week ░░░░░░░░░░ 0%" || fail "expired week not 0%: $OUT"
echo "$OUT" | grep -q "ready now\|API mode" && fail "expired week rendered as stale/API: $OUT"

# Claude Code dropped seven_day after its reset but five_hour is there → week 0%.
OUT="$(echo '{"rate_limits":{"five_hour":{"used_percentage":12,"resets_at":4102444800}}}' | run b)"
echo "$OUT" | grep -q "week ░░░░░░░░░░ 0%" || fail "dropped week not shown as 0%: $OUT"

# Gateway-only payload → no synthetic week.
OUT="$(echo '{"rate_limits":{"spend_limit":{"used_percentage":63,"resets_at":4102444800}}}' | run c)"
echo "$OUT" | grep -q "week" && fail "synthetic week on gateway payload: $OUT"

# API key (no rate_limits at all) → still cost-only.
OUT="$(run d < "$ROOT/examples/sample-api-cost-only.json")"
echo "$OUT" | grep -q "API mode" || fail "api-key payload lost cost-only state: $OUT"

# Long labels keep a gap before the bar in --full.
OUT="$(echo '{"rate_limits":{"seven_day":{"used_percentage":5,"resets_at":4102444800},"seven_day_sonnet":{"used_percentage":5,"resets_at":4102444800}}}' | run e --full --no-cat)"
echo "$OUT" | grep -q "(Sonnet only) ▓" || fail "label glued to bar: $OUT"

echo "OK: unused/reset windows read 0%"
