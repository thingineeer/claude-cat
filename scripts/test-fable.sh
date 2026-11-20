#!/usr/bin/env bash
# Offline tests for the opt-in --fable-usage overlay. Never reads real
# credentials or calls the network: the refresher is fed a canned
# /api/oauth/usage response via CLAUDE_CAT_FABLE_FIXTURE and HOME points
# at a throwaway directory.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home"
export CLAUDE_CAT_FABLE_FIXTURE="$ROOT/scripts/fixtures/oauth-usage-ultra.json"
DIR="$HOME/.claude/claude-cat"
mkdir -p "$DIR"
CLI="$ROOT/bin/cli.js"
WEEK=4071301200                       # fixture's weekly reset (2099-01-05 13:00 UTC)
strip() { sed -E $'s/\x1b\\[[0-9;]*m//g'; }
stdin_week() { # <weekly resets_at> [extra rate_limits json]
  printf '{"model":{"display_name":"Opus 5.5"},"version":"2.1.327","rate_limits":{"seven_day":{"used_percentage":66,"resets_at":%s}%s}}' "$1" "${2:-}"
}
fail() { echo "FAIL: $*"; exit 1; }

# 1. Without the flag nothing happens — no bar, no refresher, no files.
OUT="$(stdin_week $WEEK | node "$CLI" | strip)"
echo "$OUT" | grep -q "fable" && fail "fable shown without --fable-usage"
sleep 1
[ ! -e "$DIR/fable-cache.json" ] || fail "refresher ran without --fable-usage"

# 2. First render with the flag: no cache yet → returns fast, spawns the
#    background refresher, shows no Fable bar yet.
start=$(node -e 'console.log(Date.now())')
OUT="$(stdin_week $WEEK | node "$CLI" --fable-usage | strip)"
elapsed=$(( $(node -e 'console.log(Date.now())') - start ))
echo "$OUT" | grep -q "fable" && fail "fable shown before any fetch"
[ "$elapsed" -lt 3000 ] || fail "render blocked for ${elapsed}ms"
for _ in $(seq 1 30); do [ -s "$DIR/fable-cache.json" ] && break; sleep 0.2; done
[ -s "$DIR/fable-cache.json" ] || fail "background refresher didn't write the cache"
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (c.fable.used_percentage !== 34) throw new Error("pct " + c.fable.used_percentage);
  if (c.fable.resets_at !== 4071301200) throw new Error("ISO→epoch " + c.fable.resets_at);
  if (c.weekly_resets_at !== 4071301200) throw new Error("weekly " + c.weekly_resets_at);
  if (JSON.stringify(c).includes("Bearer")) throw new Error("token-ish data in cache");
' "$DIR/fable-cache.json" || fail "cache contents"
[ ! -e "$DIR/fable-refresh.lock" ] || fail "lock left behind"

# 3. Same account → week + fable on one line.
OUT="$(stdin_week $WEEK | node "$CLI" --fable-usage | strip)"
printf '%s\n' "$OUT"
echo "$OUT" | grep -q "fable ▓▓▓░░░░░░░ 34%" || fail "fable bar missing"

# 4. Different account (weekly reset differs) → no Fable bar, and only
#    one early re-fetch for that account — not one every minute.
OTHER=$((WEEK - 86400))
node -e '
  const f = process.argv[1], c = JSON.parse(require("fs").readFileSync(f, "utf8"));
  c.fetched_at -= 90; require("fs").writeFileSync(f, JSON.stringify(c));   // past MIN_GAP, inside TTL
' "$DIR/fable-cache.json"
OUT="$(stdin_week $OTHER | node "$CLI" --fable-usage | strip)"
echo "$OUT" | grep -q "fable" && fail "fable from another account shown"
for _ in $(seq 1 30); do grep -q "\"$OTHER\"" "$DIR/fable-cache.json" 2>/dev/null && break; sleep 0.2; done
grep -q "\"$OTHER\"" "$DIR/fable-cache.json" || fail "mismatch didn't trigger one early refresh"
first="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).fetched_at)' "$DIR/fable-cache.json")"
node -e '
  const f = process.argv[1], c = JSON.parse(require("fs").readFileSync(f, "utf8"));
  c.fetched_at -= 90; require("fs").writeFileSync(f, JSON.stringify(c));
' "$DIR/fable-cache.json"
stdin_week $OTHER | node "$CLI" --fable-usage >/dev/null
sleep 1.5
again="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).fetched_at)' "$DIR/fable-cache.json")"
[ "$again" = "$((first - 90))" ] || fail "re-fetched again for the same other account"

# 5. Claude Code already sends a Fable bucket → exactly one fable bar.
OUT="$(stdin_week $WEEK ',"seven_day_fable":{"used_percentage":40,"resets_at":4071301200}' \
  | node "$CLI" --fable-usage | strip)"
[ "$(echo "$OUT" | grep -o "fable ▓" | wc -l | tr -d ' ')" = "1" ] || fail "duplicate fable bar"
echo "$OUT" | grep -q "40%" || fail "native fable value not preferred"

# 6. Idle session (no rate_limits on stdin) reuses the shared cache, gets
#    the Fable overlay, and does NOT overwrite rate-limits-cache.json.
rm -f "$DIR/rate-limits-cache.json"                 # step 5's native fable is legit; start clean
stdin_week $WEEK | node "$CLI" >/dev/null           # active session writes the shared cache
before="$(cat "$DIR/rate-limits-cache.json")"
OUT="$(printf '{"model":{"display_name":"Opus 5.5"}}' | node "$CLI" --fable-usage | strip)"
echo "$OUT" | grep -q "fable" || fail "idle session lost the fable overlay"
[ "$(cat "$DIR/rate-limits-cache.json")" = "$before" ] || fail "idle render rewrote the shared cache"
grep -q "seven_day_fable" "$DIR/rate-limits-cache.json" && fail "fable leaked into shared cache"

# 7. Failure keeps the last good numbers and backs off.
CLAUDE_CAT_FABLE_FIXTURE="$TMP/missing.json" node "$CLI" __fable-refresh
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (c.status !== "bad_response") throw new Error("status " + c.status);
  if (!(c.next_try_at > Date.now() / 1000)) throw new Error("no backoff");
  if (c.fable?.used_percentage !== 34) throw new Error("lost last good value");
' "$DIR/fable-cache.json" || fail "backoff"

# 8. `security -w` hex output (non-ASCII value) decodes to the JSON.
node --input-type=module -e '
  const m = await import(process.argv[1]);
  const j = JSON.stringify({ claudeAiOauth: { accessToken: "x" }, note: "é" });
  if (m.decodeSecurityOutput(Buffer.from(j).toString("hex") + "\n") !== j) throw new Error("hex");
  if (m.decodeSecurityOutput(j + "\n") !== j) throw new Error("plain");
' "$ROOT/src/fable.js" || fail "security output decoding"

echo "OK: --fable-usage overlay"
