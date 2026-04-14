---
name: resume-claude-cat
description: Resume claude-cat session — auto-pulls, reads save point, and prints briefing.
disable-model-invocation: true
---

# Resume — claude-cat

## 1. Sync with remote

Run `git fetch origin --prune` in `~/Desktop/claude-cat`. If the local `dev` branch is behind, run `git pull --ff-only origin dev`. If diverged, warn the user — do NOT force pull.

## 2. Project rules

@CLAUDE.md

## 3. Work state

@docs/checkpoints/SESSION-STATE.md

## 4. Git status

Run `git status` and `git branch --show-current`, then show recent commits using the larger of:

- All commits from today: `git log --oneline --since="midnight"`
- Last 10 commits: `git log --oneline -10`

Use whichever returns more results. Also run `git worktree list` so any leftover side worktrees are visible.

## 5. Key files

Read all files listed in the "Key Files" section of `docs/checkpoints/SESSION-STATE.md`. At minimum: `CLAUDE.md`, `docs/SESSION-RESUME.md`, `CHANGELOG.md`, `README.md`.

## 6. Build / test environment

Verify the test fixtures still render cleanly:

```bash
npm run test:sample
npm run test:full
```

If `./.env` is missing (fresh machine), surface the bootstrap sequence from `docs/SESSION-RESUME.md` §3 — do NOT auto-run it.

If `~/.claude/settings.json` doesn't have a `statusLine` block pointing at this repo's `bin/cli.js`, surface that too — do NOT silently rewrite.

## 7. Briefing

Print:

---
**Project**: claude-cat (Claude Code statusLine renderer maintained by `thingineeer`)
**Branch**: {current branch — should be `dev`}
**Tip**: {short SHA + subject}
**npm**: `claude-cat@{npm view claude-cat version}` (latest published)
**Done**: {Completed items from SESSION-STATE.md, condensed}
**Current**: {In Progress items}
**Next**: {Remaining backlog, top 3}
---

Ask: "Ready to continue?"
