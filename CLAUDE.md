# CLAUDE.md — session playbook

This file is automatically loaded into Claude Code sessions started in
this repo. It encodes the project's working rules so every session
(and every contributor, AI-assisted or not) follows them without
having to dig through CONTRIBUTING.md each time.

## Branch model — read this first

```
  feat/*   ──PR──▶  dev   ──release PR──▶  main   ──tagged──▶  GitHub Release
  fix/*              │                      │
  chore/*            │                 (maintainer
  docs/*             │                  only decides
                     │                  when to cut)
        day-to-day integration         released versions
```

- `main` is **released** software. Never commit or push to it
  directly. Only the maintainer opens `dev → main` PRs when a release
  is ready.
- `dev` is where daily work integrates. Never commit or push to it
  directly either — open a PR from a feature branch.
- `feat/<topic>` / `fix/<topic>` / `chore/<topic>` / `docs/<topic>`
  — short-lived, one-topic branches. **PR base is always `dev`**,
  unless the maintainer says otherwise.

The `pre-commit` and `pre-push` hooks reject direct work on `main`
and `dev` locally. GitHub branch protection enforces the same rule
server-side.

## Worktree-only policy — hard rule

The primary checkout (`~/Desktop/claude-cat`) stays on `dev` and is
**read-only for humans and AI alike**:

- ✅ `git fetch origin`
- ✅ `git pull --ff-only origin dev` (sync after PRs merge)
- ✅ `git worktree add …` / `git worktree remove …`
- ❌ editing files in the primary checkout
- ❌ `git commit` in the primary checkout
- ❌ `git push` of the primary checkout

All editing, committing, and pushing happens in **side worktrees**:

```
~/Desktop/claude-cat                          ← primary, dev, read-only
~/Desktop/claude-cat.feat-<topic-a>           ← side worktree for topic A
~/Desktop/claude-cat.fix-<topic-b>            ← side worktree for topic B
~/Desktop/claude-cat.chore-<topic-c>          ← another side worktree
```

**One topic = one worktree = one branch = one PR.** Never stack
multiple unrelated changes on the same branch — reviewers (and
CodeRabbit) should see one coherent change per PR.

Worktree kind prefixes (must match what CI / hooks expect):
`feat/` `fix/` `chore/` `docs/` `refactor/` `test/` `ci/`.

## Default working loop

When a user asks for a change in this repo:

1. `git fetch origin` in the primary checkout.
2. `git worktree add ../claude-cat.<kind>-<topic> -b <kind>/<topic> origin/dev`.
3. `cd` into the side worktree. Run `./scripts/setup.sh` the first
   time so local identity + hooks are wired.
4. Work there. Commit by **logical unit**, not "end of session". Each
   commit subject follows Conventional Commits (`feat:`, `fix:`,
   `chore:`, `refactor:`, `docs:`, `test:`, `ci:`).
5. `git push -u origin <kind>/<topic>`.
6. `gh pr create --base dev --head <kind>/<topic>` with a filled-in
   template.
7. Wait for CI + CodeRabbit review. If red, fix and push; don't merge
   red.
8. `gh pr merge <num> --merge --delete-branch` — **merge commit, not
   squash**. The repo prefers preserving branch topology so every PR
   shows up as a visible fork/join in the graph; squash flattens that
   history out.
9. Back in the primary checkout: `git fetch origin && git pull --ff-only origin dev`.
10. Clean up the side worktree: `git worktree remove ../claude-cat.<kind>-<topic>`
    and `git branch -D <kind>/<topic>`.

### Parallel work

When several topics are in flight, spin up several side worktrees at
once. They share the same .git store (cheap) and CI runs per PR, so
review cycles don't block each other:

```
~/Desktop/claude-cat                                 [dev]
~/Desktop/claude-cat.feat-daemon                     [feat/daemon]
~/Desktop/claude-cat.fix-alignment                   [fix/alignment]
~/Desktop/claude-cat.chore-docs                      [chore/docs]
```

Each worktree ships a separate PR. Don't share branches between
topics — if two changes are truly coupled, keep them together in one
worktree and ship them as one PR.

## Releases

**Only when the user explicitly says "let's cut a release" (or
equivalent)**:

- branch `release/x.y.z` from `dev`
- bump `package.json` + update `CHANGELOG.md`
- open PR `release/x.y.z → main`, merge with `gh pr merge --merge`
  (merge commit — same as day-to-day PRs, for topology)
- tag `vx.y.z`, publish the GitHub Release draft
- fast-forward `dev` onto `main` with `ALLOW_DIRECT_PUSH=1`

**Never** merge to `main` without that explicit signal — the branch
model treats main as the released timeline, and unannounced merges
pollute the release history.

## Review: CodeRabbit

Every PR (base `dev` or `main`) gets an automated CodeRabbit review
once the app is installed on the repo. Config lives in
`.coderabbit.yaml` (chill profile, Korean output, auto-review on
PRs whose base is main). Don't merge over a CodeRabbit-request-
changes unless you've answered the comment.

One-time install (maintainer): https://github.com/apps/coderabbitai
→ install on `thingineeer/claude-cat`.

## Commit messages

- Conventional Commits. Korean or English, subject ≤ 72 chars.
- **No AI attribution.** Never add `Co-Authored-By:` lines naming AI
  tools, "🤖 Generated with …" footers, `noreply@anthropic.com` co-
  authors, or similar. A `commit-msg` hook rejects them.
- Author identity comes from `.env` → `scripts/setup.sh`. Use the
  GitHub no-reply email so personal addresses stay out of history.

## What to surface as a status-line script (the product)

claude-cat consumes **only** the stdin JSON Claude Code pipes into
statusLine scripts. Don't:
- read `~/.claude/.credentials.json` or the macOS Keychain
- hit `api.anthropic.com` or `claude.ai` endpoints
- write outside `~/.claude/claude-cat/` (debug dumps)
- add runtime dependencies unless essential — the script runs on every
  assistant message, cold start matters

If a future feature (Extra usage, Sonnet-only bar) really does need
the `/api/oauth/usage` endpoint, it goes behind an explicit opt-in
flag AND the README calls out the tradeoff (undocumented endpoint,
ToS gray area).

## Testing

```bash
npm run test:sample     # normal usage, compact layout
npm run test:full       # multi-line layout
npm run test:critical   # critical mood
npm run test:sonnet     # three-window layout
npm run test:warming    # no rate_limits yet — resting cat
npm run test:saturated  # weekly 91%, session idle
npm run test:apicost    # API key — cost only
./scripts/capture-all.sh  # eyes-on snapshot matrix into tmp/snapshots/
```

CI runs every `test:*` script on every PR into `dev` or `main`.

## Layout / mood invariants (don't break)

- labels, reset phrases, and the session countdown are all
  **English-fixed** (`3h 38m`, `15m`, `2d 4h`). Mirrors the `/usage`
  popup and reads the same in every terminal worldwide.
- window keys are auto-collected from `rate_limits.*` — don't
  hard-code a list of bucket names.
- mood policy is **weekly-first**: weekly ≥ 60 or session ≥ 75 → alert;
  any ≥ 85 → nervous; any ≥ 95 → critical; ignore windows whose
  `resets_at` has passed. When no rate_limits are present, the cat is
  **resting** regardless of percentage.
- side-by-side kawaii stays as a 3-row card in `--full`. Additional
  data rows extend the right side; the cat column stays 3 rows and
  pads empty cells with spaces.

## Useful pointers

- **docs/SESSION-RESUME.md** — if you're resuming work on a new
  machine or after a long break, read this first. Short playbook:
  branch model, where things live, new-machine setup, current state
  snapshot, known gaps still pending.
- **docs/MAINTAINER.md** — maintainer-only ops: cutting a release,
  npm publish, rotating the npm token. Contributors can ignore.
- CONTRIBUTING.md — contributor-facing workflow (branches, commits,
  release checklist)
- README.md — user-facing install/layout docs + scenario gallery
- CHANGELOG.md — "Unreleased" section is where in-flight notes live
- examples/*.json — fixtures for each scenario
- scripts/capture-all.sh — render every (fixture × layout × theme)
  into tmp/snapshots/ before opening a PR

## Maintainer: the private env vault

The maintainer's local `.env` (git identity, hooks path, **npm
publish token**) lives in a separate **private** GitHub repo at
[`thingineeer/thingineeer-env`](https://github.com/thingineeer/thingineeer-env).
It's cloned to `~/.env-vault` on each machine; `envpull claude-cat`
drops a symlink at `./.env` so `./scripts/setup.sh` can apply git
identity + hooks AND wire `NPM_TOKEN` into `~/.npmrc` for one-step
`npm publish`.

Contributors don't need this — they just run `cp .env.example .env`
and fill in their own git identity values; `NPM_TOKEN` is absent in
that template so the `~/.npmrc` step is a no-op for them.

Full new-machine + release-publish flow: see
[`docs/MAINTAINER.md`](docs/MAINTAINER.md).
