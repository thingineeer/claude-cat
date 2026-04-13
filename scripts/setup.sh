#!/usr/bin/env bash
# Apply .env values to the local git config and enable commit hooks.
# Idempotent — safe to re-run.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [[ ! -f .env ]]; then
  echo "✖ .env not found. Copy .env.example first:" >&2
  echo "    cp .env.example .env" >&2
  exit 1
fi

# Load .env without exporting into the shell ancestry.
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${GIT_USER_NAME:?GIT_USER_NAME missing in .env}"
: "${GIT_USER_EMAIL:?GIT_USER_EMAIL missing in .env}"
HOOKS_PATH="${GIT_HOOKS_PATH:-.githooks}"

git config --local user.name  "$GIT_USER_NAME"
git config --local user.email "$GIT_USER_EMAIL"
git config --local core.hooksPath "$HOOKS_PATH"

echo "✓ git user.name  = $(git config --local user.name)"
echo "✓ git user.email = $(git config --local user.email)"
echo "✓ core.hooksPath = $(git config --local core.hooksPath)"

# Maintainer-only: if the .env carries an npm publish token (it does in
# the private vault, not in .env.example), wire it into ~/.npmrc so
# `npm publish` works without an extra login on every new machine.
# Contributors won't have NPM_TOKEN set and this block is a no-op for them.
if [[ -n "${NPM_TOKEN:-}" ]]; then
  npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN" >/dev/null
  echo "✓ ~/.npmrc //registry.npmjs.org/:_authToken set (npm publish ready)"
fi
