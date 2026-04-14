# Session State — claude-cat

## Date
2026-04-14

## Branch
- `dev` tip: `4646aeb` (Merge PR #28 — npm publish setup automation)
- `main` = `v1.0.0` tag = `6c8a24f` (last released to npm as `claude-cat@1.0.0`)
- `dev` is **2 commits ahead of `main`** (both docs/tooling, no behavior changes — will fold into the next release cut)

## Completed (this session)
- [x] **v1.0.0 published to npm** as `claude-cat@1.0.0` — `npx -y claude-cat@latest` works for any user
- [x] GitHub Release v1.0.0 published with full CHANGELOG notes
- [x] Tag `v1.0.0` lives at the README-slim commit so npm-tarball / GitHub README / git tag are all in sync (modulo npm-tarball-immutability — see "Notes")
- [x] Multiple feature merges that landed in 1.0.0 after the initial cut:
  - `feat/resting-smoke` — kawaii resting cat now holds 🚬~ (PR #23)
  - `feat/ctx-cost` — `$` cost chip back on compact + wide tail (PR #24)
  - `feat/countdown-universal` — session countdown unified to `3h 38m` everywhere; `i18n.js` no longer locale-dispatches; sub-minute clamps to `1m` (PR #25)
- [x] Re-cut release PR #26 folded those + screenshots + `npm pkg fix` into a clean v1.0.0 cut
- [x] README rewrite (English + Korean) — slimmed from 560 → 216 lines (English) / 252 → 134 lines (Korean); added "Pick your mode" with ⭐ default, "Reading the output" legend that clarifies `$` is session cost (not Extra-usage / not subscription), per-mode install blocks with preview + Claude-Code prompt
- [x] Both screenshots refreshed with live captures: `compact-short.png` (`$37.37` chip example), `kawaii-full.png` (curious mood, English README hero), `kawaii-chill.png` (chill mood, Korean README hero)
- [x] **One-step npm publish on new machines** (PR #28) — `scripts/setup.sh` now writes `NPM_TOKEN` from the private vault into `~/.npmrc`. Granular token (Bypass 2FA enabled) lives in `thingineeer/thingineeer-env`'s `.env`, never in the public repo. New `docs/MAINTAINER.md` covers the full new-machine + release-publish + token-rotation flow.

## In Progress
Nothing — v1.0.0 is shipped end-to-end. Two doc/tooling commits sit on `dev` ready for the next release pickup.

## Remaining (post-1.0.0 backlog)
- **Extra usage daemon** — `/api/oauth/usage` proxy for plan-overage `$X / $Y` numbers (private endpoint; opt-in flag, ToS gray area)
- **Cross-terminal realtime sync** — small background cache so every terminal sees the same numbers
- **Sonnet-only weekly bar** — server only sometimes pipes `seven_day_sonnet` in stdin JSON; condition undocumented
- npm-tarball README is the pre-slim version (npm immutability rule). The next release (1.0.1 patch or 1.1.0) will re-publish the slim README + ship the `setup.sh` improvement. GitHub README is the source of truth meanwhile.

## Key Files
Read these first to get the full picture:
- `CLAUDE.md` — branch model, worktree-only policy, release flow, layout/mood invariants
- `docs/SESSION-RESUME.md` — long-form maintainer playbook (where things live, new-machine setup, current state snapshot, known gaps)
- `CHANGELOG.md` — `## [1.0.0] - 2026-04-13` section is the released cut
- `README.md` — single source of truth for users (slimmed); paired Korean is `README.ko.md`
- `src/statusline.js` — main renderer (all three layouts: `renderCompact`, `renderFull`, `renderWide`)
- `src/cats.js` — mood thresholds (`THRESHOLDS`, `moodFromWindows`) + ASCII art tables
- `src/format.js` — bars, palette, `fmtCountdown` (universal `3h 38m`), reset phrases
- `src/i18n.js` — label table only (no locale dispatch anymore)
- `examples/sample-*.json` — fixtures wired into `npm run test:*` scripts

## Notes
- **Worktree-only policy is enforced**: never edit / commit / push from `~/Desktop/claude-cat`. Open `git worktree add ../claude-cat.<kind>-<topic> -b <kind>/<topic> origin/dev` first. Hooks reject direct work; bypass is `ALLOW_DIRECT_COMMIT=1` / `ALLOW_DIRECT_PUSH=1` (reserved for release fast-forwards and the maintainer's quick docs pushes the user explicitly authorized).
- **PR base is always `dev`** (never `main`). Maintainer cuts `release/x.y.z → main` when ready.
- **Merge commits, not squash** (`gh pr merge --merge`) — the graph keeps every PR's fork/join visible.
- **No AI attribution** in commit messages — `commit-msg` hook rejects `Co-Authored-By` lines.
- **npm publish workflow** (after a release PR merges to `main`):
  1. tag `vX.Y.Z` at the merge commit, push tag
  2. publish GitHub Release from `## [X.Y.Z]` CHANGELOG section
  3. `cd ~/Desktop/claude-cat && npm publish` — token already in `~/.npmrc` (granular, Bypass 2FA = ✓)
  4. fast-forward `dev` onto `main`
- **Maintainer setup on new machines**: see [`docs/MAINTAINER.md`](../MAINTAINER.md). One `./scripts/setup.sh` after `envpull claude-cat` writes the git config, hooks path, AND the npm publish token from the private vault — so `npm publish` works straight away with no extra login.

## Picking up on a different machine (e.g. office)

```bash
# 1) public repo
gh repo clone thingineeer/claude-cat ~/Desktop/claude-cat

# 2) private env vault (carries git identity + NPM_TOKEN)
gh repo clone thingineeer/thingineeer-env ~/.env-vault
cd ~/.env-vault && ./bin/bootstrap.sh
source ~/.zshrc                           # picks up envpull / envpush

# 3) link + apply
cd ~/Desktop/claude-cat
envpull claude-cat
./scripts/setup.sh                        # writes git config + hooks + ~/.npmrc
```

Then in Claude Code:

```
/resume-claude-cat
```

That auto-pulls, reads this file, runs `git status` / recent log, and prints a briefing. Continue from "Remaining" above.
