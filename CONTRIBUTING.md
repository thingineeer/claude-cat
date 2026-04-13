# Contributing to claude-cat

Thanks for considering a contribution. A few house rules keep the repo sane.

## Branch model

```
           PR (review + CI)           PR (release)
 feat/*  ─────────────────▶  dev  ─────────────────▶  main
 fix/*                        │                        │
 chore/*                      │                  tagged v1.2.3
 docs/*                       │                  GitHub Release
                    all daily work lands here
```

- **`main`** — what's actually released. Protected; only accepts PRs
  from `dev` (or hotfix branches) after CI is green. Every merge to
  `main` should correspond to a version bump + tag + GitHub Release.
- **`dev`** — the integration branch for day-to-day work. Protected;
  only accepts PRs. CI runs on every PR targeting `dev`.
- **`feat/<topic>` / `fix/<topic>` / `chore/<topic>` / `docs/<topic>`**
  — short-lived branches for one logical change each. PR target is
  **`dev`**, not `main`.
- **`release/x.y.z`** — optional. Only used when we want to stabilize
  a cut of `dev` before fast-forwarding it into `main`.

### Where do I open my PR?

| Your change is… | Branch from | PR into |
| --- | --- | --- |
| a new feature (`feat/*`) | `dev` | `dev` |
| a bug fix (`fix/*`) | `dev` | `dev` |
| docs / refactor / CI (`chore/*`, `docs/*`) | `dev` | `dev` |
| a release cut (maintainer only) | `dev` | `main` |
| a production hotfix (maintainer only) | `main` | both `main` and `dev` |

External contributors: always target `dev`. The maintainer handles the
`dev → main` release PR.

## Workflow: one worktree per topic

The primary checkout (the directory you cloned into) stays on `dev`
and is **read-only** — just fetch and pull. All editing happens in
**side worktrees** on short-lived branches.

```
~/code/claude-cat                 ← primary checkout, stays on dev, read-only
~/code/claude-cat.feat-foo        ← side worktree for feat/foo
~/code/claude-cat.fix-bar         ← side worktree for fix/bar
~/code/claude-cat.chore-baz       ← yet another
```

`pre-commit` and `pre-push` hooks reject commits or pushes on `main`
and `dev`, so an accidental edit in the primary checkout gets caught
locally before it reaches the server.

### Create a side worktree

```bash
git fetch origin
git worktree add ../claude-cat.feat-<topic> -b feat/<topic> origin/dev
cd ../claude-cat.feat-<topic>
./scripts/setup.sh                # first time only — wires hooks + .env identity
# … focused, logical commits …
git push -u origin feat/<topic>
gh pr create --base dev --head feat/<topic>
```

### After the PR merges

```bash
# from the primary checkout
git worktree remove ../claude-cat.feat-<topic>
git branch -D feat/<topic>
git fetch origin && git pull --ff-only origin dev
```

### Rules
- One topic per worktree. Unrelated changes go in separate worktrees.
- Run several side worktrees in parallel when several topics are in
  flight. They share the same `.git` store, so it's cheap.
- Split commits by **logical unit**, not "end of day". Reviewers (and
  CodeRabbit) should be able to read commits one by one.
- Rebase on `origin/dev` before opening a PR.
- Squash-merge is the default; fast-forward is fine when history is
  already linear.

## Commit messages

- Conventional Commits preferred: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`.
- Korean or English — both fine. Keep the subject ≤ 72 chars.
- **No AI-tool attribution lines.** Do not add AI co-author / generator
  footers to commit messages. A `commit-msg` hook rejects them
  automatically.
- Commit under your own git identity. Use the GitHub no-reply address
  to avoid leaking your personal email.

### One-time setup

Copy the environment template and enable the hooks:

```bash
cp .env.example .env     # fill in GIT_USER_NAME / GIT_USER_EMAIL locally
./scripts/setup.sh       # applies .env to local git config + hooks path
```

`.env` is git-ignored — nothing you put there is ever pushed.

## Security

- Never commit secrets. `.env`, `*.pem`, `*.p8`, `*.p12`, `.credentials.json` are git-ignored.
- Do not read from `~/.claude/.credentials.json` or the macOS Keychain — claude-cat only consumes the stdin JSON that Claude Code officially provides to statusLine scripts.
- If you discover a security issue, please open a private advisory on GitHub rather than a public issue.

## Testing

```bash
npm run test:sample      # normal usage, compact layout
npm run test:full        # multi-line layout
npm run test:critical    # high-usage cat face
npm run test:sonnet      # three-window layout
npm run test:warming     # no rate_limits yet
npm run test:saturated   # weekly at 91%, session idle
npm run test:apicost     # API key (cost only)
./scripts/capture-all.sh # eyes-on: renders every fixture × layout × theme
```

CI runs the same `test:*` scripts on every PR targeting `dev` or `main`.

## Release flow (maintainer)

1. Bump `package.json` version and update `CHANGELOG.md` on a
   `release/x.y.z` branch cut from `dev`.
2. Open PR: `release/x.y.z → main`. Wait for CI, self-review.
3. Squash-merge into `main`. Tag the merge commit `vx.y.z`. Push tag.
4. Create a GitHub Release from the tag (paste CHANGELOG entry).
5. Fast-forward `dev` onto `main` so the two stay in sync.

Hotfixes follow the same shape but branch from `main` and merge into
both `main` and `dev`.
