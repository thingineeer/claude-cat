#!/usr/bin/env bash
# Stale cache tmp files (left behind when a render is killed mid-write)
# are swept on the next active render; fresh ones are left alone.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPHOME="$(mktemp -d)"
trap 'rm -rf "$TMPHOME"' EXIT
DIR="$TMPHOME/.claude/claude-cat"
mkdir -p "$DIR"
: > "$DIR/.ratelimits-tmp-deadbeef.json"
touch -t 202001010000 "$DIR/.ratelimits-tmp-deadbeef.json"   # old → swept
: > "$DIR/.ratelimits-tmp-cafebabe.json"                     # fresh → kept

HOME="$TMPHOME" node "$ROOT/bin/cli.js" < "$ROOT/examples/sample-ultra.json" >/dev/null

[ ! -e "$DIR/.ratelimits-tmp-deadbeef.json" ] || { echo "FAIL: stale tmp not swept"; exit 1; }
[ -e "$DIR/.ratelimits-tmp-cafebabe.json" ]   || { echo "FAIL: fresh tmp removed"; exit 1; }
[ -s "$DIR/rate-limits-cache.json" ]          || { echo "FAIL: cache not written"; exit 1; }
echo "OK: stale cache tmp files swept"
