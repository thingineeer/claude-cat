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

## Default working loop (what Claude does in this repo)

When a user asks for a change in this repo, the default sequence is:

1. `git fetch origin`
2. `git worktree add ../claude-cat.<kind>-<topic> -b <kind>/<topic> origin/dev`
3. Work in that worktree. Commit by **logical unit**, not "end of
   session". Each commit subject follows Conventional Commits
   (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`).
4. `git push -u origin <kind>/<topic>`
5. `gh pr create --base dev --head <kind>/<topic>` with a filled-in
   template.
6. Wait for CI. If CI fails, fix and push; don't merge red.
7. `gh pr merge <num> --squash --delete-branch`.
8. Clean up: `git worktree remove …`, `git branch -D …`, fetch + pull
   the tip of `dev` into the local dev checkout.

**Release** (only when the user explicitly says "let's cut a release"
or similar):
- branch `release/x.y.z` from `dev`, bump `package.json` + update
  `CHANGELOG.md`, open PR `release/x.y.z → main`, squash-merge, tag
  `vx.y.z`, publish the GitHub Release draft, then fast-forward `dev`
  onto `main`.

**Never** merge to `main` without explicit user confirmation that
this merge is a release cut.

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

- labels and reset phrases are **English-fixed**, to match the
  `/usage` popup verbatim. Only the session countdown is localized.
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

- CONTRIBUTING.md — contributor-facing workflow (branches, commits,
  release checklist)
- README.md — user-facing install/install/layout docs + scenario gallery
- CHANGELOG.md — "Unreleased" section is where in-flight notes live
- examples/*.json — fixtures for each scenario
- scripts/capture-all.sh — render every (fixture × layout × theme)
  into tmp/snapshots/ before opening a PR
