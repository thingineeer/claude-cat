#!/usr/bin/env bash
# Smoke test for the stale-cache rendering tier.
#
# Sets up a throwaway HOME with a cache entry aged past MAX_AGE_SEC (10m)
# but within STALE_MAX_SEC (6h), feeds cli.js stdin WITHOUT rate_limits
# (an idle session), and asserts the bars are still drawn AND flagged
# stale — i.e. the bar doesn't blink out the moment you step away.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPHOME="$(mktemp -d)"
trap 'rm -rf "$TMPHOME"' EXIT

CACHE_DIR="$TMPHOME/.claude/claude-cat"
mkdir -p "$CACHE_DIR"

NOW="$(date +%s)"
WRITTEN=$((NOW - 1800))     # 30 minutes ago → stale, not expired
RESET=$((NOW + 7200))       # session resets in 2h (still live)
WRESET=$((NOW + 200000))    # weekly resets in days

cat > "$CACHE_DIR/rate-limits-cache.json" <<JSON
{"written_at":$WRITTEN,"rate_limits":{"five_hour":{"used_percentage":42,"resets_at":$RESET},"seven_day":{"used_percentage":67,"resets_at":$WRESET}},"model":{"display_name":"Opus 4.7"}}
JSON

# Idle stdin: no rate_limits, so cli.js falls back to the cache.
OUT="$(printf '%s' '{"model":{"display_name":"Opus 4.7"}}' \
  | HOME="$TMPHOME" node "$ROOT/bin/cli.js" --full --kawaii)"

printf '%s\n' "$OUT"

echo "$OUT" | grep -q "stale"     || { echo "FAIL: stale marker missing"; exit 1; }
echo "$OUT" | grep -qE "▓|░"       || { echo "FAIL: bars missing"; exit 1; }
echo "$OUT" | grep -qE "42%|67%"   || { echo "FAIL: cached pct missing"; exit 1; }

echo "OK: stale bars rendered"
