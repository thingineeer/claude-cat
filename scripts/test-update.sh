#!/usr/bin/env bash
# Offline smoke test for `claude-cat update`.
#
# Builds a throwaway HOME + npm cache with:
#   - a stale npx copy of claude-cat (1.0.0)  → must be removed
#   - an npx dir owned by another package     → must be left alone
#   - settings.json pinning claude-cat@1.4.0  → must be bumped
# CLAUDE_CAT_UPDATE_LATEST skips the registry lookup and --no-warm skips
# the npx pre-install, so the test never touches the network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

export HOME="$TMP/home"
export npm_config_cache="$TMP/npm-cache"
export CLAUDE_CAT_UPDATE_LATEST="1.5.0"

mk_npx() { # <hash> <pkg> <version>
  local d="$npm_config_cache/_npx/$1"
  mkdir -p "$d/node_modules/$2"
  printf '{"dependencies":{"%s":"^%s"}}' "$2" "$3" > "$d/package.json"
  printf '{"name":"%s","version":"%s"}' "$2" "$3" > "$d/node_modules/$2/package.json"
}
mk_npx stalecat claude-cat 1.0.0
mk_npx othertool left-pad 1.3.0

mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'JSON'
{
  "model": "opus",
  "statusLine": { "type": "command", "command": "npx -y claude-cat@1.4.0 --full", "padding": 0 }
}
JSON

# --version
V="$(node "$ROOT/bin/cli.js" --version)"
[[ "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "FAIL: --version printed '$V'"; exit 1; }

# Dry run: reports, changes nothing.
DRY="$(node "$ROOT/bin/cli.js" update --dry-run --no-warm)"
printf '%s\n' "$DRY"
echo "$DRY" | grep -q "remove 1.0.0"        || { echo "FAIL: stale npx copy not reported"; exit 1; }
echo "$DRY" | grep -q "1.4.0 → 1.5.0"       || { echo "FAIL: pinned bump not reported"; exit 1; }
[ -d "$npm_config_cache/_npx/stalecat" ]    || { echo "FAIL: dry run deleted the npx copy"; exit 1; }
grep -q "claude-cat@1.4.0" "$HOME/.claude/settings.json" || { echo "FAIL: dry run edited settings"; exit 1; }

# Real run.
node "$ROOT/bin/cli.js" update --no-warm
[ ! -d "$npm_config_cache/_npx/stalecat" ]  || { echo "FAIL: stale npx copy still there"; exit 1; }
[ -d "$npm_config_cache/_npx/othertool" ]   || { echo "FAIL: removed another tool's npx dir"; exit 1; }
grep -q '"command": "npx -y claude-cat@1.5.0 --full"' "$HOME/.claude/settings.json" \
  || { echo "FAIL: pin not bumped"; cat "$HOME/.claude/settings.json"; exit 1; }
grep -q '"model": "opus"' "$HOME/.claude/settings.json" || { echo "FAIL: other settings lost"; exit 1; }

# Second run is a no-op.
AGAIN="$(node "$ROOT/bin/cli.js" update --no-warm)"
echo "$AGAIN" | grep -q "Already on the latest" || { echo "FAIL: second run not a no-op"; printf '%s\n' "$AGAIN"; exit 1; }

echo "OK: update command"
