# Session State — claude-cat

## Date
2026-04-14

## Branch
`dev` (= `main` = `v1.0.0` tag, all at commit `6c8a24f`)

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
- [x] Public env-vault bootstrap on this machine: `~/.env-vault` cloned, `envpull claude-cat` ran, `~/.claude/settings.json` got the `statusLine` block

## In Progress
Nothing — v1.0.0 is shipped end-to-end (git, GitHub Release, npm).

## Remaining (post-1.0.0 backlog)
- **Extra usage daemon** — `/api/oauth/usage` proxy for plan-overage `$X / $Y` numbers (private endpoint; opt-in flag, ToS gray area)
- **Cross-terminal realtime sync** — small background cache so every terminal sees the same numbers
- **Sonnet-only weekly bar** — server only sometimes pipes `seven_day_sonnet` in stdin JSON; condition undocumented
- npm-tarball README is the pre-slim version (npm immutability rule). The next release (1.0.1 patch or 1.1.0) will re-publish the slim README. GitHub README is the source of truth meanwhile.

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
- **npm token caveat**: granular access tokens MUST have "Bypass 2FA" checked at creation, otherwise publish gets E403 even with the token (`~/.claude/projects/-Users-imyeongjin-Desktop/memory/npm_publish_2fa.md` for full notes).
- **`.env` location**: `./.env` is a symlink to `~/.env-vault/projects/claude-cat/.env` (private vault, maintainer-only). New machines: `gh repo clone thingineeer/thingineeer-env ~/.env-vault && cd ~/.env-vault && ./bin/bootstrap.sh && cd ~/Desktop/claude-cat && envpull claude-cat && ./scripts/setup.sh`.
- **Statusline currently active** for this machine: `node /Users/imyeongjin/Desktop/claude-cat/bin/cli.js --full --kawaii` in `~/.claude/settings.json` (3-row card).
