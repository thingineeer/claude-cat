# MAINTAINER.md

Maintainer-only ops for `claude-cat`. Contributors can ignore this
file — it documents the bits that only the npm-package owner
(`thingineeer`) ever touches: cutting releases and publishing to npm.

For everyday contributor flow see [CONTRIBUTING.md](../CONTRIBUTING.md).
For session-resume context see [docs/SESSION-RESUME.md](./SESSION-RESUME.md).

## New machine setup (one-time)

Public repo + private env vault (the vault holds the maintainer's
git identity and the npm publish token):

```bash
# 1) public repo
gh repo clone thingineeer/claude-cat ~/Desktop/claude-cat
cd ~/Desktop/claude-cat

# 2) private env vault (maintainer only — contributors skip this)
gh repo clone thingineeer/thingineeer-env ~/.env-vault
cd ~/.env-vault && ./bin/bootstrap.sh   # installs `envpull` / `envpush` shell helpers
source ~/.zshrc                          # (or ~/.bashrc) to pick the helpers up

# 3) link the vault's .env into the project + apply it
cd ~/Desktop/claude-cat
envpull claude-cat        # symlinks ./.env → ~/.env-vault/projects/claude-cat/.env
./scripts/setup.sh        # writes git config + hooks path + ~/.npmrc token
```

After step 3 you should see four `✓` lines from `setup.sh`, ending
with `~/.npmrc //registry.npmjs.org/:_authToken set (npm publish ready)`.
That's the maintainer signal — you can `npm publish` without any
further login.

## Cutting a release (PRs already merged to `dev`)

Only when the user explicitly says "let's cut a release":

```bash
# from the primary checkout (dev)
cd ~/Desktop/claude-cat
git fetch origin
git worktree add ../claude-cat.release-X.Y.Z -b release/X.Y.Z origin/dev
cd ../claude-cat.release-X.Y.Z
```

In that worktree:

1. Bump `package.json` version to `X.Y.Z`.
2. Rewrite the `## Unreleased` section of `CHANGELOG.md` into a
   `## [X.Y.Z] - YYYY-MM-DD` block.
3. Commit (`chore(release): X.Y.Z`).
4. Push the `release/X.Y.Z` branch.
5. `gh pr create --base main --head release/X.Y.Z --title "chore(release): X.Y.Z"`.
6. Wait for CI + CodeRabbit. Resolve threads.
7. `gh pr merge <num> --merge` (merge commit, not squash).

Then back in the primary checkout:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git tag vX.Y.Z
git push origin vX.Y.Z

# extract just the version's CHANGELOG section for release notes
awk '/^## \[X\.Y\.Z\]/{p=1} /^## /&&!/^## \[X\.Y\.Z\]/&&p{exit} p' CHANGELOG.md > /tmp/notes.md
gh release create vX.Y.Z --title "claude-cat vX.Y.Z" --notes-file /tmp/notes.md

npm publish               # token already in ~/.npmrc from setup.sh

# fast-forward dev onto main
git checkout dev
ALLOW_DIRECT_PUSH=1 git push origin main:dev
git pull --ff-only origin dev

# clean up
git worktree remove ../claude-cat.release-X.Y.Z
git push origin --delete release/X.Y.Z
git branch -D release/X.Y.Z
```

Verify the published version:

```bash
npm view claude-cat version              # should print X.Y.Z
echo '{}' | npx -y claude-cat@latest     # smoke test (resting cat)
```

## npm token (granular access)

The token in the private vault is a **granular access token** with:

- **Permission**: Read and write
- **Packages**: All packages (or just `claude-cat`)
- **Bypass two-factor authentication (2FA)**: ✅ checked
- Expiration: ~1 year, rotate when it lapses

Why "Bypass 2FA": npm requires 2FA-or-bypass-token at publish time.
Without that checkbox the publish step fails with `E403` even when
the token is otherwise valid.

To rotate:

1. Browser → https://www.npmjs.com/settings/thingineeer/tokens
2. Generate New Token → Granular Access Token (with the settings
   above)
3. Copy the new `npm_…` value
4. Update `NPM_TOKEN=` in `~/.env-vault/projects/claude-cat/.env`
5. `cd ~/.env-vault && envpush` (or just `git add … && git commit && git push`)
6. Delete the old token in the npm UI
7. On every other machine: `cd ~/.env-vault && git pull && cd ~/Desktop/claude-cat && ./scripts/setup.sh`

Never paste the token into the public `claude-cat` repo, GitHub
Actions logs, screenshots, or any chat transcript that gets shared.

## Common gotchas

- **`npm publish` says `E403 Two-factor authentication or granular
  access token with bypass 2fa enabled is required`** — the token
  in `~/.npmrc` doesn't have "Bypass 2FA" checked. Rotate it (see
  above).
- **Same version, second publish** — npm refuses. Bump the version
  first; even a doc-only change needs `X.Y.Z+1` to update the npm
  tarball's `README.md`.
- **`commit-msg` hook rejects an AI-attribution line** — strip
  `Co-Authored-By: …`, `🤖 Generated with …`, etc. The hook is in
  `.githooks/commit-msg`.
- **`pre-commit` hook blocks a commit on `main` / `dev` /
  `release/*`** — that's the worktree-only policy. Either commit in
  a feature worktree, or set `ALLOW_DIRECT_COMMIT=1` for a docs
  push the maintainer explicitly intends (rare).
