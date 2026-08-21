#!/usr/bin/env bash
# Smoke test for the model chip (model name + effort level).
#
# Asserts both directions of every toggle — a test that only ran the
# CLI and checked the exit code would pass even if a flag were
# ignored, or if the chip stopped rendering entirely:
#
#   default      → chip present, spelled with its space ('opus 5'),
#                  effort appended ('opus 5 · high')
#   --no-effort  → model stays, effort gone
#   --no-model   → whole chip absent (effort rides on the model chip)
#   --full       → untouched display_name + effort in the header
#   bogus effort → effort silently dropped, model chip intact
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
 "effort":{"level":"high"},
 "cost":{"total_cost_usd":1.23},
 "rate_limits":{"five_hour":{"used_percentage":20,"resets_at":$RESET}}}
JSON
)"

# Effort that fails the [a-z] whitelist — must not reach the terminal.
BOGUS_JSON="$(cat <<JSON
{"model":{"display_name":"Opus 5 (1M context)"},
 "effort":{"level":"../etc/PASSWD"},
 "cost":{"total_cost_usd":1.23},
 "rate_limits":{"five_hour":{"used_percentage":20,"resets_at":$RESET}}}
JSON
)"

run() {
  printf '%s' "$STDIN_JSON" | HOME="$TMPHOME" node "$ROOT/bin/cli.js" "$@"
}
run_bogus() {
  printf '%s' "$BOGUS_JSON" | HOME="$TMPHOME" node "$ROOT/bin/cli.js" "$@"
}

DEFAULT_OUT="$(run)"
NOEFFORT_OUT="$(run --no-effort)"
NOMODEL_OUT="$(run --no-model)"
FULL_OUT="$(run --full)"
BOGUS_OUT="$(run_bogus)"
BOGUS_FULL_OUT="$(run_bogus --full)"

printf '%s\n' "$DEFAULT_OUT"
printf '%s\n' "$FULL_OUT"

# 1. chip renders, with the space kept ('opus 5', not 'opus5')
printf '%s\n' "$DEFAULT_OUT" | grep -Fq 'opus 5' \
  || { echo "FAIL: model chip missing from compact output"; exit 1; }

# 2. the parenthetical variant is dropped
printf '%s\n' "$DEFAULT_OUT" | grep -Fqi '1m context' \
  && { echo "FAIL: '(1M context)' should not reach the compact chip"; exit 1; }

# 3. effort rides right after the model, dot-joined
printf '%s\n' "$DEFAULT_OUT" | grep -Fq 'opus 5 · high' \
  || { echo "FAIL: effort level missing from compact model chip"; exit 1; }

# 4. --no-effort drops only the effort
printf '%s\n' "$NOEFFORT_OUT" | grep -Fq 'opus 5' \
  || { echo "FAIL: --no-effort dropped the model chip too"; exit 1; }
printf '%s\n' "$NOEFFORT_OUT" | grep -Fq 'high' \
  && { echo "FAIL: --no-effort did not drop the effort"; exit 1; }

# 5. --no-model actually suppresses the whole chip (model + effort)
printf '%s\n' "$NOMODEL_OUT" | grep -Fqi 'opus' \
  && { echo "FAIL: --no-model did not drop the chip"; exit 1; }
printf '%s\n' "$NOMODEL_OUT" | grep -Fq 'high' \
  && { echo "FAIL: --no-model left the effort behind"; exit 1; }

# 6. --no-model doesn't take the rest of the line with it
printf '%s\n' "$NOMODEL_OUT" | grep -qE "▓|░" \
  || { echo "FAIL: --no-model dropped the usage bars too"; exit 1; }

# 7. --full keeps the full, unshortened display_name, effort appended
printf '%s\n' "$FULL_OUT" | grep -Fq 'Opus 5 (1M context) · high' \
  || { echo "FAIL: --full header lost the display_name + effort"; exit 1; }

# 8. an unsafe effort value is dropped, model chip survives (both layouts)
printf '%s\n' "$BOGUS_OUT" | grep -Fqi 'passwd' \
  && { echo "FAIL: bogus effort leaked into compact output"; exit 1; }
printf '%s\n' "$BOGUS_OUT" | grep -Fq 'opus 5' \
  || { echo "FAIL: bogus effort took the model chip with it"; exit 1; }
printf '%s\n' "$BOGUS_FULL_OUT" | grep -Fqi 'passwd' \
  && { echo "FAIL: bogus effort leaked into full output"; exit 1; }

echo "OK: model chip (model + effort) toggles correctly"
