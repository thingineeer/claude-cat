#!/usr/bin/env bash
# Shared cache with several live accounts (terminals started before a
# cswap / /login keep their old account). Each account keeps its own
# bucket; a session with rate_limits always renders its OWN numbers; in
# the bucket the most recent reply wins (not the highest number), so a
# stale session repeating an old value can't pin everyone to it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home"; mkdir -p "$HOME"
CLI="$ROOT/bin/cli.js"
CACHE="$HOME/.claude/claude-cat/rate-limits-cache.json"
A=4102444800; B=4102531200            # two accounts' weekly resets
# s <session_id> <pct> <resets_at> <api_ms>  — api_ms grows with each reply
s() { printf '{"session_id":"%s","model":{"display_name":"Opus 5.5"},"cost":{"total_cost_usd":1,"total_api_duration_ms":%s},"rate_limits":{"seven_day":{"used_percentage":%s,"resets_at":%s}}}' "$1" "$4" "$2" "$3"; }
r() { node "$CLI" "$@" | sed -E $'s/\x1b\\[[0-9;]*m//g'; }
idle() { printf '{"model":{"display_name":"Opus 5.5"}}' | r; }
bucket() {
  node -e '
    const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const b = c.accounts?.[process.argv[2]];
    process.stdout.write(String(b?.rate_limits?.seven_day?.used_percentage));
  ' "$CACHE" "$1"
}
fail() { echo "FAIL: $*"; exit 1; }

# 1. A confused/stale session on account A reports 85%; the live one 15%.
#    Each renders its OWN number, even though the bucket saw 85 first.
OUT="$(s stale 85 $A 100 | r)"
echo "$OUT" | grep -q "85%" || fail "stale session lost its own value: $OUT"
OUT="$(s live 15 $A 100 | r)"
echo "$OUT" | grep -q "week ▓▓░░░░░░░░ 15%" || fail "live session not showing own 15%: $OUT"
[ "$(bucket $A)" = 15 ] || fail "fresh lower reading didn't replace bucket: $(bucket $A)"

# 2. The stale session re-rendering the same payload doesn't win back.
s stale 85 $A 100 | r >/dev/null
s stale 85 $A 100 | r >/dev/null
[ "$(bucket $A)" = 15 ] || fail "stale repeat overrode bucket: $(bucket $A)"
OUT="$(idle)"
echo "$OUT" | grep -q "15%" || fail "idle terminal pinned to stale 85%: $OUT"

# 3. A new reply in the live session moves the bucket.
s live 16 $A 200 | r >/dev/null
[ "$(bucket $A)" = 16 ] || fail "live reply didn't update bucket: $(bucket $A)"

# 4. Same-window decrease from a session that got a new reply wins
#    (e.g. a mid-week reset ticket).
s live 3 $A 300 | r >/dev/null
[ "$(bucket $A)" = 3 ] || fail "post-reset decrease ignored: $(bucket $A)"

# 5. Account B (another terminal) keeps its own numbers, never A's.
OUT="$(s other 70 $B 100 | r)"
echo "$OUT" | grep -q "70%" || fail "account B lost its own value: $OUT"
[ "$(bucket $A)" = 3 ] || fail "account B touched A's bucket"

# 6. A session without rate_limits borrows the account that moved most
#    recently, and an idle re-render of another account doesn't flip it.
OUT="$(idle)"
echo "$OUT" | grep -q "70%" || fail "idle session didn't borrow latest account (B): $OUT"
s live 4 $A 400 | r >/dev/null                     # A gets a reply → latest
s other 70 $B 100 | r >/dev/null                   # B re-render, same payload
OUT="$(idle)"
echo "$OUT" | grep -q "4%" || fail "idle account flipped the top level: $OUT"

# 7. Payloads without session_id still render their own numbers.
OUT="$(printf '{"model":{"display_name":"Opus 5.5"},"rate_limits":{"seven_day":{"used_percentage":55,"resets_at":%s}}}' $A | r)"
echo "$OUT" | grep -q "55%" || fail "sid-less payload: $OUT"

# 8. Top level stays readable for older readers (written_at + rate_limits),
#    and the per-session map stays small and token-free.
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (!c.written_at || !c.rate_limits?.seven_day) throw new Error("compat fields missing");
  for (const b of Object.values(c.accounts)) {
    for (const [k, v] of Object.entries(b.seen || {})) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(k) || typeof v.s !== "string") throw new Error("bad seen entry");
    }
  }
' "$CACHE" || fail "top-level compat / seen shape"

# 9. Old-format caches (1.8.2 buckets without "seen", stuck at a stale
#    85%) upgrade cleanly; a session's first reply counts as fresh.
NOW="$(date +%s)"
printf '{"written_at":%s,"rate_limits":{"seven_day":{"used_percentage":12,"resets_at":%s}},"accounts":{"%s":{"updated_at":%s,"changed_at":1,"rate_limits":{"seven_day":{"used_percentage":85,"resets_at":%s}}}}}' \
  "$NOW" $A $A "$NOW" $A > "$CACHE"
OUT="$(s live2 20 $A 100 | r)"
echo "$OUT" | grep -q "20%" || fail "1.8.2 cache: own value not rendered: $OUT"
[ "$(bucket $A)" = 20 ] || fail "1.8.2 cache: stuck 85 not replaced: $(bucket $A)"

echo "OK: per-account shared cache"
