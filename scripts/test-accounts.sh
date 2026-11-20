#!/usr/bin/env bash
# Shared cache with several live accounts (terminals started before a
# cswap / /login keep their old account). Each account keeps its own
# bucket; idle terminals see the freshest numbers of THEIR account;
# stale terminals never roll fresh numbers back.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home"; mkdir -p "$HOME"
CLI="$ROOT/bin/cli.js"
CACHE="$HOME/.claude/claude-cat/rate-limits-cache.json"
A=4102444800; B=4102531200            # two accounts' weekly resets
s() { printf '{"model":{"display_name":"%s"},"rate_limits":{"seven_day":{"used_percentage":%s,"resets_at":%s}}}' "$1" "$2" "$3"; }
r() { node "$CLI" "$@" | sed -E $'s/\x1b\\[[0-9;]*m//g'; }
fail() { echo "FAIL: $*"; exit 1; }

# Account A: an active terminal reaches 40%, an idle one still says 30%.
s "Opus 5.5" 40 $A | r >/dev/null
OUT="$(s "Opus 5.5" 30 $A | r)"
echo "$OUT" | grep -q "week ▓▓▓▓░░░░░░ 40%" || fail "idle A terminal not lifted to 40%: $OUT"

# The stale 30% didn't roll the bucket back.
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const b = c.accounts[process.argv[2]];
  if (!b || b.rate_limits.seven_day.used_percentage !== 40) throw new Error(JSON.stringify(c.accounts));
' "$CACHE" "$A" || fail "bucket A rolled back"

# Account B (another terminal) keeps its own numbers, never A's.
OUT="$(s "Opus 5.5" 70 $B | r)"
echo "$OUT" | grep -q "70%" || fail "account B lost its own value: $OUT"
OUT="$(s "Opus 5.5" 30 $A | r)"
echo "$OUT" | grep -q "40%" || fail "account A picked up B: $OUT"

# A session without rate_limits borrows the account that moved most
# recently (B changed last), and B's idle re-render doesn't flip it.
s "Opus 5.5" 70 $B | r >/dev/null
OUT="$(printf '{"model":{"display_name":"Opus 5.5"}}' | r)"
echo "$OUT" | grep -q "70%" || fail "fresh session didn't borrow latest account: $OUT"
s "Opus 5.5" 41 $A | r >/dev/null                  # A moves → A is latest now
s "Opus 5.5" 70 $B | r >/dev/null                  # idle B re-render (no change)
OUT="$(printf '{"model":{"display_name":"Opus 5.5"}}' | r)"
echo "$OUT" | grep -q "41%" || fail "idle account flipped the top level: $OUT"

# Top level stays readable for older readers (written_at + rate_limits).
node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (!c.written_at || !c.rate_limits?.seven_day) throw new Error("compat fields missing");
' "$CACHE" || fail "top-level compat"

# Old-format cache (no accounts) upgrades cleanly.
printf '{"written_at":%s,"rate_limits":{"seven_day":{"used_percentage":12,"resets_at":%s}}}' "$(date +%s)" $A > "$CACHE"
OUT="$(s "Opus 5.5" 50 $A | r)"
echo "$OUT" | grep -q "50%" || fail "old-format cache: $OUT"

echo "OK: per-account shared cache"
