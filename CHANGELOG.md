# Changelog

## Unreleased

_Nothing yet._

### Still planned
- Extra usage bar (needs a live source — the stdin JSON doesn't expose
  it; daemon proxying `/api/oauth/usage` is the leading candidate)
- Light-theme aware palette (currently tuned for dark terminals)

## [1.2.3] - 2026-04-15

Reliability and performance patch — tightens timing consistency,
validates server payloads more strictly, and skips unnecessary
subprocess calls.

### Fixed
- **Expired windows no longer fool the cat** (#48) — `inferState()`
  now filters out windows whose `resets_at` has passed before deciding
  the render mode. Previously stale-but-present windows kept the cat
  in "normal" instead of falling back to "resting", contradicting the
  mood invariant documented in CLAUDE.md.
- **Partial rate-limit entries are dropped** (#50) — `isWindowEntry()`
  now requires **both** `used_percentage` and `resets_at` (was OR).
  A half-populated entry previously rendered as a 0% bar with no
  reset phrase — indistinguishable from "all clear".

### Performance
- **Terminal-width detection skips subprocess calls when possible**
  (#49) — `detectTerminalColumns()` now checks `COLUMNS` env and
  `process.stdout.columns` before falling back to `stty`/`tput`.
  Result is memoized per-process (the script renders once and exits).
- **Timezone resolved once at module load** (#52) — `tzName()` cached
  `Intl.DateTimeFormat().resolvedOptions().timeZone` instead of
  creating a new instance per window per render.

### Improved
- **Frozen "now" timestamp per render** (#51) — all time-dependent
  functions (`fmtCountdown`, `absoluteResetParts`, `moodFromWindows`,
  `inferState`) now share a single `setRenderNow()` / `getRenderNowSec()`
  value frozen at the start of `main()`. Eliminates ms-level drift
  between windows at reset boundaries.

## [1.2.2] - 2026-04-14

### Fixed (#44)
- Wizard now exits cleanly after writing settings — previously Ink
  held stdin open and the terminal appeared frozen

## [1.2.1] - 2026-04-14

Bug-fix patch for the configure wizard.

### Fixed (#42)
- Wizard now writes `"type": "command"` to settings.json — without it
  Claude Code silently ignored the statusLine entry
- Wizard ← back navigation: press left arrow to go back to the
  previous question (also works from the confirm screen)

## [1.2.0] - 2026-04-14

Interactive setup wizard and plan-aware filtering land. Run
`npx claude-cat configure` to walk through 6 questions and auto-write
your `~/.claude/settings.json`. Pro users can hide weekly bars.

### Interactive `configure` wizard (#39)
- `npx claude-cat configure` launches an Ink-based TUI that walks you
  through 6 questions (layout, cat theme, cost chip, context chip,
  refresh interval, plan) and writes `~/.claude/settings.json` for you
- Lazy-imported: the statusline hot path never loads Ink/React, so
  cold-start time is unchanged

### Plan-aware window filter (#39)
- `CLAUDE_CAT_PLAN=pro` hides weekly bars (Pro users have generous
  weekly limits and don't need to see them)
- `CLAUDE_CAT_PLAN=max` shows all bars (default behavior)
- The wizard sets this env var automatically via `statusLine.env`

### README update (#40)
- "Quick setup" section added with wizard install path
- `CLAUDE_CAT_PLAN` env var documented in Power-user flags

## [1.1.0] - 2026-04-14

Cross-terminal sync lands. Idle terminals no longer show stale
numbers — they pick up the latest usage from a shared cache file
written by whichever session is active. Paired with a more
battery-friendly idle refresh cadence and a README polish pass.

### Cross-terminal rate-limits sync (#30)
- **active session** writes `rate_limits` + `model` to
  `~/.claude/claude-cat/rate-limits-cache.json` on every run (atomic
  tmp → rename)
- **idle session** (stdin has no `rate_limits`) reads the cache so
  every terminal shows the same current usage instead of whatever it
  had on startup
- cache older than `MAX_AGE_SEC` (600s / 10 min) is ignored — the
  idle terminal falls back to the resting cat rather than display
  stale numbers
- failures in read/write never break the status line (all IO wrapped)

### Idle refresh cadence (#29, #37)
- `refreshInterval` guidance **5 → 300** seconds in install prompts
  (started at 600, tightened to 300 so idle terminals re-read the
  cache before it expires at 600s)
- Claude Code re-runs the status line every N seconds **in addition**
  to event-driven updates, so conversations still feel instant while
  idle terminals stop burning CPU every 5 s

### README rework (#31, #33, #34)
- mode table rewritten as an HTML `<table>` with `<pre>` preview
  cells — 'what you get' text descriptions replaced by the actual
  rendered output for each of the 5 modes
- preview label padding trimmed (`Current session` → `session`) and
  leading indent removed from `--full` / `--full --no-cat` rows so
  the sample lines up inside the cell
- `ready now` → `3h 21m` example — reads as a real countdown

### Reverted in this release
- a short-lived white-on-time-value experiment (#35) was reverted in
  #36: dark/light terminal detection isn't reliable enough to risk
  highlighting the countdown differently. Dim stays the default.

## [1.0.0] - 2026-04-13

First stable public cut. Ships the terminal UX rework (live width,
role palette, data-only compact, brand color, short labels), the
full mood policy with `resting` state, cat theme system, and the
PR-enforced branch / worktree maintainer workflow.

### Terminal width + readability + compact cleanup
- **live terminal width** via `stty size </dev/tty` / `tput cols
  </dev/tty`, so a resize is picked up on the next `refreshInterval`
  tick (no more staying stuck on the startup `COLUMNS` value)
- compact now **wraps across 3+ rows** on very narrow panes, not
  just 2, with continuation rows indented so the block reads as one
  entry
- **role-based color palette** so each section of the status line
  reads at a different weight: bars keep their green/yellow/red;
  labels are Claude Peach; cost is bold white; separator is visible
  gray (not dim); ctx is soft cyan; debug chip is magenta
- **compact + wide are cat-less** (the cat lives in `--full --kawaii`);
  both still carry a bold-white `$` cost chip next to the dim-cyan
  `ctx %` chip so Max-plan users can eyeball spend without dropping
  to `--full`. Model-scoped weekly labels render as just `sonnet` /
  `opus` (no `week·` prefix).

### Brand color + auto-stack
- short window labels (`5h` / `week` / `week·<Model>`) now render in
  **Claude Peach** (`#DE7356`, RGB 222/115/86) via 24-bit truecolor.
  Terminals without truecolor ignore the escape and fall back to
  default fg — no visual break.
- **compact layout auto-wraps to 2 rows** when the detected terminal
  width can't hold a single row. Cat + window bars on line 1, cost /
  ctx / debug on line 2 (indented).
- Width source priority: `CLAUDE_CAT_COLUMNS` → `COLUMNS` →
  `process.stdout.columns` → 120 fallback.
- New flags:
  - `--stack=auto|always|never` (+ `--stack` / `--no-stack` shorthand)
  - `--max-cols=<n>` for when the detector reads the wrong number

### Tight single-line layouts
- compact + wide layouts now use **short labels** (`5h`, `week`,
  `week·Sonnet`) so the status line fits even narrow panes
- reset time slides into parentheses right next to the window:
  `5h ▓░░░░ 10% (1h 47m)` / `week ▓▓░░ 18% (Fri 1pm)`
- vertical pipe `|` replaces the middle dot as section separator for
  compact + wide (full stays on `·` because each row already stands
  alone on its own line)
- unified compact-cat glyph family: only the eyes change per mood,
  mouth stays `ᴥ`. Baseline chill is `^ᴥ^` (smiling, friendliest for
  the state users see most). Previous mixed-width glyphs (`｡`, `≻`,
  `⌒`) are gone.
- README gains a `compact-short.png` capture; `assets/screenshots/`
  now has its own README documenting the shot list + re-capture steps.

### Branch strategy + repo policy
- new long-lived `dev` branch between feature work and `main`:
  `feat/*` / `fix/*` / `chore/*` / `docs/*` PRs target `dev`; the
  maintainer cuts `dev → main` release PRs
- `pre-commit` hook protects `dev` alongside `main`; bypass with
  `ALLOW_DIRECT_COMMIT=1` is reserved for bootstrap only
- new `pre-push` hook rejects direct pushes to `main` / `dev`;
  bypass with `ALLOW_DIRECT_PUSH=1` for release fast-forwards
- CI fires on push+PR for both `main` and `dev`
- PR template asks contributors to confirm the base branch target
- CONTRIBUTING rewritten around the new model + 'Where do I open my
  PR?' table + maintainer release checklist
- new CLAUDE.md session playbook so AI-assisted sessions default to
  the PR-based flow automatically
- new release-draft workflow: every push to `main` opens a draft
  GitHub Release; maintainer publishes when actually ready

### Mood policy + startup polish
- mood now reads from the whole window set, not a blind max:
  weekly ≥ 60 % → alert, session ≥ 75 % → alert, any window ≥ 85 % →
  nervous, ≥ 95 % → critical. Windows already past `resets_at` are
  ignored so a 100 % session about to flip doesn't read as panic.
- new `resting` state for when rate_limits aren't in the stdin JSON yet:
  compact `/ᐠ ⌒ㅅ⌒ ᐟ\`, kawaii `/ z z` breath. Paired with short phrases
  `resting — waiting for first reply` or `API mode — cost only` picked
  from the actual stdin signature.
- debug marker moves from "(steals the 3rd data row)" to a compact
  `· [Debug]` chip on the header row, so side-by-side kawaii layout
  stops losing its bottom line to debug output.
- README gains a 6-frame "What you'll see" gallery showing every
  scenario in place, plus an explainer for the mood policy.
- 3 new fixtures (`warming-up`, `api-cost-only`, `weekly-saturated`)
  wired into package scripts + CI + capture-all.

### Side-by-side kawaii batch
- kawaii cat now renders in a fixed-width **left column** next to the
  data block instead of stacked above it, so the status line reads as
  one compact 3-row card even when extra rows (Sonnet, context) show up
- refactored `renderFull` to build the data block separately, so cat
  placement (inline / above / left) becomes a local decision per theme

### Cat themes batch
- `--cat=compact|kawaii|none` (aliases `--kawaii`, `--no-cat`) picks
  the art style. Compact (default) keeps the 1-line cat; kawaii uses
  a 3-line ASCII body with mood-specific props (sushi / keyboard /
  coffee / 💤 / sleeping); none drops the cat entirely.
- Reset phrases no longer print the timezone suffix — local time is
  implicit in a terminal session, so 'Resets Apr 17, 1pm' is enough.
- `scripts/capture-all.sh` renders every layout × theme × fixture to
  `tmp/snapshots/` for eyes-on verification before merging.

### /usage parity + context chip + wide layout
- labels and reset phrases now mirror the `/usage` popup **verbatim**
  (English only): "Current session", "Current week (all models)",
  "Current week (Sonnet only)", "Resets 7pm", "Resets Apr 17, 1pm"
- session countdown is the only localized string — Korean terminals see
  `3시간 15분 후` instead of `3h 15m`
- context window now surfaces as a compact header chip
  `ctx 23% used (77% left)` (English-fixed), not a separate line; applies
  to compact / full / wide layouts
- EAW-aware label padding (src/width.js) so any future localized label
  stays column-aligned
- `--layout=wide` (alias `--wide`) keeps everything on a single line so
  the chat area never grows taller as more windows appear
- `CLAUDE_CAT_DEBUG=1` still available for dumping stdin JSON locally

### Post-cut polish (folded into this 1.0.0)
- **cost chip back on compact + wide** — bold-white `$0.1234` sits
  next to the dim-cyan `ctx 28%` chip. The cat-less invariant stays;
  only the dollar number returns. Max-plan users asked for it.
- **sub-minute remainder clamps to `1m`** — the countdown never prints
  `0m`, which would misread as "already reset" for s in [1, 59].
- **universal `3h 38m` countdown** — locale dispatch removed. The
  session countdown is now Latin-only (`3h 38m` / `15m` / `2d 4h`),
  reading the same in every terminal worldwide. `CLAUDE_CAT_LANG`
  env var is no longer read; `i18n.js` shrinks to a simple label
  table. Labels and reset phrases were already English-fixed — this
  completes the "no locale branches" story.
- **resting kawaii holds a smoke** (`>🚬~`) — replaces the old
  `z z` breath glyph, matching the mood-prop convention (sushi /
  keyboard / coffee / 💤) of the other kawaii moods. Compact one-line
  cat is unchanged (`/ᐠ -ᴥ- ᐟ\`).
- **README rewrite** — "Pick your mode" table with ⭐ recommended
  default, per-mode install blocks with live previews and
  copy-pasteable Claude prompts, new **Reading the output** legend
  (clarifies `$` is session cost, not "Extra usage" fees), unified
  **Configuration** section (flags + env vars in one place), and
  Korean README parity.

### Shipped earlier (pre-1.0.0)
- statusLine renderer parsing Claude Code's stdin JSON
- five-step cat face reflecting the highest usage window
- `--full` multi-line mode
- `--icons=none|emoji|nerd` scaffold
- graceful fallback when `rate_limits` are absent
- `.env`-based contributor identity flow (`.env.example` + `scripts/setup.sh`)
- commit hooks that block AI-attribution lines and direct commits to `main`
- neon-line SVG asset set (logo + 5 face moods)
