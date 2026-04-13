# SESSION-RESUME.md

A maintainer-facing "where we left off" file so a fresh Claude Code
session (on another machine, after a `git pull`, etc.) can pick the
project back up in one turn instead of having to re-read the whole
commit history.

> **For AI agents**: if the user says "resume", "이어서 하자",
> "어디까지 했지", or similar, read this file first, then run
> `git log --oneline -20 dev` to see the actual most-recent state
> (this file may lag behind the graph by a commit or two).

## 1. Branch model (hard rule)

```
  feat/*   ──PR──▶  dev   ──release PR──▶  main   ──tagged──▶  GitHub Release
  fix/*              │                      │
  chore/*            │                 (maintainer
  docs/*             │                  only decides
                     │                  when to cut)
```

- `main` = released code. Never commit/push to it directly.
- `dev` = integration branch. Never commit/push to it directly.
- `feat/* / fix/* / chore/* / docs/*` = short-lived, **PR base is dev**.
- Merges are **merge commits** (`gh pr merge --merge`), never squash,
  so the graph keeps every PR's fork/join visible.
- `pre-commit` and `pre-push` hooks enforce all of the above locally;
  GitHub branch protection enforces it server-side (including a
  `allowed-source` workflow that blocks PRs into main from unexpected
  branches).

See `CLAUDE.md` for the full playbook (worktree layout, naming
conventions, release checklist). See `CONTRIBUTING.md` for the
external-contributor-facing version.

## 2. Where things live

```
this repo (public)                      github.com/thingineeer/claude-cat
  │
  ├─ main           ← released code
  ├─ dev            ← day-to-day integration
  ├─ src/           ← statusline.js, format.js, cats.js, i18n.js,
  │                   width.js, icons.js, debug.js
  ├─ bin/cli.js     ← Node CLI entry
  ├─ examples/      ← stdin-JSON fixtures for every scenario
  ├─ scripts/       ← capture-all.sh, setup.sh
  ├─ assets/
  │   ├─ logo.svg + 5 face SVGs
  │   └─ screenshots/
  └─ .githooks/     ← pre-commit / pre-push / commit-msg

sibling private repo                    github.com/thingineeer/thingineeer-env
  │
  └─ projects/claude-cat/.env           ← GIT_USER_NAME / GIT_USER_EMAIL /
                                          GIT_HOOKS_PATH for the maintainer's
                                          side worktrees. Cloned to
                                          ~/.env-vault on each machine;
                                          `envpull claude-cat` makes a
                                          symlink from the project dir.
```

## 3. First-time setup on a new machine

```bash
# 1) public repo
gh repo clone thingineeer/claude-cat ~/Desktop/claude-cat
cd ~/Desktop/claude-cat

# 2) private env vault (maintainer only — contributors skip this)
gh repo clone thingineeer/thingineeer-env ~/.env-vault
cd ~/.env-vault && ./bin/bootstrap.sh     # exports `envpull` + `envpush` helpers

# 3) back in the project
cd ~/Desktop/claude-cat
envpull claude-cat        # symlinks ~/.env-vault/projects/claude-cat/.env ← ./.env
./scripts/setup.sh        # applies .env to local git config + core.hooksPath

# 4) Claude Code statusLine → add to ~/.claude/settings.json:
#    "statusLine": {
#      "type": "command",
#      "command": "node /Users/<you>/Desktop/claude-cat/bin/cli.js",
#      "padding": 1, "refreshInterval": 5
#    }
```

## 4. Resuming work

```bash
cd ~/Desktop/claude-cat
git fetch origin
git pull --ff-only origin dev
git log --oneline --graph -15           # what landed recently?
git worktree list                        # any stuck side worktrees?
```

Then open a side worktree for the next topic (**never edit the
primary checkout**):

```bash
git worktree add ../claude-cat.<kind>-<topic> -b <kind>/<topic> origin/dev
cd ../claude-cat.<kind>-<topic>
```

## 5. Current state snapshot (update on each release)

- Last merged PR on `dev`: **PR #21** — SESSION-RESUME playbook +
  vault pointer + AI-install section
- Last released tag: **v1.0.0** — cut on 2026-04-13,
  `package.json` version is `1.0.0`
- Open UX invariants (don't break in PRs without discussion):
  - `full` layout still mirrors `/usage` verbatim (English-fixed
    labels, `·` separator, dim palette)
  - `compact` / `wide` stay cat-less (the cat lives in `--full
    --kawaii`); both carry a bold-white `$` cost chip next to the
    dim-cyan `ctx` chip for Max-plan users
  - mood policy is weekly-first (weekly ≥ 60 → alert, any ≥ 85 →
    nervous, ≥ 95 → critical, windows already past `resets_at`
    ignored, no rate_limits ⇒ resting)
  - section separator is `|` for compact/wide, `·` for full
  - short labels: `5h` / `week` / `sonnet` / `opus` / etc.
  - Claude Peach (`#DE7356`) for the short labels only
  - countdown is **universal English** (`3h 38m`, `15m`, `2d 4h`) —
    no locale dispatch, no `CLAUDE_CAT_LANG`
  - statusline script must never read `~/.claude/.credentials.json`,
    never hit network endpoints, never write outside
    `~/.claude/claude-cat/`

## 6. Known gaps still pending

- **Sonnet bar** only appears when the server actually sends
  `rate_limits.seven_day_sonnet` in stdin JSON. On accounts with no
  Sonnet usage it's omitted — the bar just doesn't draw. Not a bug
  on our side.
- **Extra usage** ($X / $Y spent · Resets May 1) is **never** in
  stdin JSON. The `/usage` popup fetches it from
  `/api/oauth/usage` with the OAuth token. A daemon that calls that
  endpoint is the leading candidate — tracked as a future feature
  (opt-in behind an explicit flag, ToS gray area).

## 7. If you need to publish a release

See `CLAUDE.md` "Releases" section — short version:
`release/x.y.z` branch from `dev`, bump `package.json` + update
`CHANGELOG.md`, open `release/x.y.z → main` PR, merge commit,
tag `vx.y.z`, publish the GitHub Release draft, fast-forward
`dev → main`.
