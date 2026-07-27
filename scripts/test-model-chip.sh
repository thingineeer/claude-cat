#!/usr/bin/env bash
# Smoke test for the compact layout's model chip.
#
# Asserts both directions of the toggle — a test that only ran the CLI
# and checked the exit code would pass even if --no-model were ignored,
# or if the chip stopped rendering entirely:
#
#   default      → chip present, spelled with its space ('opus 5')
#   --no-model   → chip absent
#   --full       → untouched display_name still in the header
#
# HOME is a throwaway dir so the shared rate-limits cache can't overlay
# `model` from whatever session last wrote it. stdin carries rate_limits
# so the idle/cache-read path isn't taken either.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPHOME="$(mktemp -d)"
trap 'rm -rf "$TMPHOME"' EXIT

NOW="$(date +%s)"
RESET=$((NOW + 7200))

STDIN_JSON="$(cat <<JSON
{"model":{"display_name":"Opus 5 (1M context)"},
 "cost":{"total_cost_usd":1.23},
 "rate_limits":{"five_hour":{"used_percentage":20,"resets_at":$RESET}}}
JSON
)"

run() {
  printf '%s' "$STDIN_JSON" | HOME="$TMPHOME" node "$ROOT/bin/cli.js" "$@"
}

DEFAULT_OUT="$(run)"
NOMODEL_OUT="$(run --no-model)"
FULL_OUT="$(run --full)"

printf '%s\n' "$DEFAULT_OUT"

# 1. chip renders, with the space kept ('opus 5', not 'opus5')
printf '%s\n' "$DEFAULT_OUT" | grep -Fq 'opus 5' \
  || { echo "FAIL: model chip missing from compact output"; exit 1; }

# 2. the parenthetical variant is dropped
printf '%s\n' "$DEFAULT_OUT" | grep -Fqi '1m context' \
  && { echo "FAIL: '(1M context)' should not reach the compact chip"; exit 1; }

# 3. --no-model actually suppresses it
printf '%s\n' "$NOMODEL_OUT" | grep -Fqi 'opus' \
  && { echo "FAIL: --no-model did not drop the chip"; exit 1; }

# 4. --no-model doesn't take the rest of the line with it
printf '%s\n' "$NOMODEL_OUT" | grep -qE "▓|░" \
  || { echo "FAIL: --no-model dropped the usage bars too"; exit 1; }

# 5. --full keeps the full, unshortened display_name
printf '%s\n' "$FULL_OUT" | grep -Fq 'Opus 5 (1M context)' \
  || { echo "FAIL: --full header lost the untouched display_name"; exit 1; }

echo "OK: model chip toggles correctly"
