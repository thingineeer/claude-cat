# Changelog

## Unreleased

### Still planned
- Extra usage bar (needs a live source — the stdin JSON doesn't expose
  it; the `--fable-usage` refresher could carry it behind the same flag)
- Light-theme aware palette (currently tuned for dark terminals)

## [1.8.0] - 2026-11-19

### Added
- **`--fable-usage` (opt-in)** — the Fable weekly bar on Ultra.
  Claude Code 2.1.327 doesn't put it on the statusLine stdin, so this
  flag reads it from the private `/api/oauth/usage` endpoint
  (`limits[]` → `weekly_scoped` / `Fable`). A detached background
  refresher reads the access token (never refreshes it, never stores
  it), fetches at most every 5 minutes with a cross-terminal lock and
  backoff, and caches only the Fable percentage + reset times; the
  render path just reads that cache. After an account switch the bar
  hides until the new account's numbers arrive (matched by weekly
  reset time). A native `seven_day_fable` on stdin always wins. Offered
  in the configure wizard; off by default. README/SECURITY.md describe
  the tradeoff (undocumented endpoint, ToS gray area).

### Changed
- **Unused or reset windows read 0%** — a window whose reset time has
  passed now shows `0%` (it has been reset) instead of the old number
  with "ready now", and a weekly window Claude Code dropped after its
  reset shows as `week 0%` instead of vanishing. Previously, when every
  window had reset, the line fell back to "API mode — cost only".

- README (en/ko): real Claude Code 2.1.328 screenshot as the hero
  (Opus 5.5, week + Fable), a keyword-rich intro and an FAQ (usage
  limit without `/usage`, Fable usage, no 5-hour bar on Ultra, plans,
  performance, ccusage). npm description/keywords refreshed.

### Fixed
- `--full` labels exactly 26 columns wide (`Current week (Sonnet
  only)`) no longer touch their bar.

## [1.7.0] - 2026-11-19

### Changed
- **Requires Node.js 22+** (`engines.node` `>=22`) — Node 18 and 20 are
  end-of-life.
- **Dependencies on latest stable** — `ink` 5 → 8, `react` 18 → 19.3,
  `ink-select-input` 6.2. They power only the `configure` wizard
  (lazy-imported), and the wizard was driven end-to-end on the new
  versions. Ink 7+ needs Node.js 22, so `engines.node` is now `>=22`
  and CI runs on Node 22. The status-line render path itself is
  unchanged.
- **README rewrite** (en/ko) — shorter, one structure for both
  languages: quick start → layouts → options/env tables → plans and
  stdin fields → moods → privacy & security. Fresh screenshots of the
  current output (Fable 5.2, week + fable).

### Fixed
- Cache tmp files no longer pile up in `~/.claude/claude-cat/` when a
  render is killed mid-write — a failed write removes its tmp file and
  leftovers older than 10 minutes are swept.
- `scripts/capture-all.sh` globs `examples/*.json` instead of a
  hard-coded list that referenced a missing fixture.

### Removed
- Dead code: the percent-based cat API (`moodFor` / `pickCat`), an
  unused inline-glyph helper, `tzName`, two unused labels, and the
  never-imported `src/configure/preview.js`. Rendered output is
  byte-identical across every fixture × layout × theme.

### Housekeeping
- CodeRabbit removed from the repo; the release flow publishes the draft
  the release workflow opens instead of creating a duplicate.

## [1.6.0] - 2026-11-19

### Added
- **`claude-cat update`** — one command (`npx -y claude-cat@latest
  update`) brings every local copy to the latest release: removes
  stale claude-cat entries from the npm `_npx` cache (never another
  tool's), upgrades an older global install, bumps a pinned
  `claude-cat@x.y.z` in `~/.claude/settings.json`, and pre-warms the
  exact npx spec the status line runs so the next render is instant.
  `--dry-run` previews every change; `claude-cat --version` prints the
  running version. This user-invoked command is the only code path that
  touches the network (npm registry only) — the render path stays
  network-free; README and SECURITY.md spell out the exception.
- **Claude Code 2.1.327 support** — re-verified the statusLine stdin
  against a live payload dump (2026-11-19). Ultra plans (formerly Max)
  now send `rate_limits.seven_day` alone; the line renders cleanly as
  `opus 5.5 · xhigh | week ▓▓▓▓▓▓▓░░░ 66% (Sun 10pm) | $12.34 | ctx 18%`
  and the cat's mood is driven by the weekly bar alone.
- **`week` + `fable` on one line** — `rate_limits.seven_day_fable` is
  recognized as the Fable weekly bucket (alongside the older
  `seven_day_overage_included`), pinned right after `week`, labeled
  `fable` / `Current week (Fable)`. It appears automatically whenever
  Claude Code sends it; `--hide=fable` drops it.
- **`spend` bar** — `rate_limits.spend_limit` (Claude apps gateway spend
  cap) renders as `spend` / `Spend limit` and weighs like a weekly bar
  in the mood policy.
- `examples/sample-ultra.json` (weekly-only) and
  `examples/sample-ultra-fable.json` (week + fable) with far-future
  `resets_at`, wired into CI as `test:ultra`, `test:ultra:full`,
  `test:ultra:fable`.

### Changed
- **Max → Ultra** — the configure wizard's plan step offers `ultra
  (formerly Max)`; `CLAUDE_CAT_PLAN=ultra` is documented and the old
  `max` value keeps working.
- Fable label drops the model version (`Current week (Fable 5)` →
  `Current week (Fable)`) so it survives point releases (Fable 5.2 …).
- README (en/ko): weekly-first examples, Ultra plan row, a
  "stdin fields (Claude Code 2.1.327)" table, rewritten "not in stdin"
  section, and a list-price reference table (Fable 5.2 $8 / $40 per
  MTok, Opus 5.5, Sonnet 5.5, Haiku 5.5) next to the `$` explanation.

### Fixed
- **Model chip always shows this session's model** — an idle session
  (no `rate_limits` in its stdin) borrows usage from the shared cache,
  but the overlay also replaced its `model` with whatever session wrote
  the cache last, so long-running sessions could show `opus 5` /
  `4.8` instead of the model actually selected. Only usage is borrowed
  now; the cached model is a fallback when stdin carries none.

## [1.5.0] - 2026-08-21

### Added
- **Effort level on the model chip** — Claude Code pipes the session's
  effort level as `effort.level` (`low` / `medium` / `high` / `xhigh` /
  `max`). It now rides on the model chip in both one-line and 3-row
  layouts, so "which model, how hard is it thinking" reads as one unit:
  compact `fable 5 · high | 5h …`, `--full` header `Fable 5 · high  ·
  $1.87  ·  ctx …`. In `--full` the header row is shorter than the
  window rows, so the extra token lands in otherwise-blank width — the
  card stays 3 rows. `--wide` has no model chip and is unchanged.
  Hide with `--no-effort` (keeps the model); `--no-model` drops both,
  since effort alone is meaningless without the model it qualifies.
  `effort.level` goes through the same trust boundary as the model
  chip: `sanitizeText`, then a strict `[a-z]{1,12}` whitelist — an
  unrecognizable value drops the effort and keeps the model chip.
  `scripts/test-model-chip.sh` (`test:no-model`) covers every toggle
  direction plus the bogus-value path.

## [1.4.0] - 2026-07-27

### Added
- **Model chip in the compact layout** — the one-line layout now leads
  with the model the session is talking to, shortened from
  `model.display_name` (`Opus 5 (1M context)` → `opus 5`, `Fable 5` →
  `fable 5`, `Sonnet 4.6` → `sonnet 4.6`). The space is kept — that's
  how the model is actually spelled.
  Parenthetical variants are dropped: compact is the width-constrained
  layout and the `ctx N%` chip already reports the context window. The
  chip is pinned to line 1, so it survives narrow-pane wrapping. Hide
  it with `--no-model`; `scripts/test-model-chip.sh` (`test:no-model`)
  asserts both directions of the toggle and is wired into CI.
  The `--full` and `--wide` layouts are unchanged — `--full` already
  carried the untouched `display_name` in its header.

  `display_name` is server-supplied, so the chip goes through the same
  trust boundary as every other rendered field: `sanitizeText` first,
  then a `[a-z0-9. ]` whitelist, space runs collapsed and ends trimmed
  so a padded name can't shove the bars rightward. An unrecognizable
  name yields no chip rather than attacker-chosen text.

## [1.3.0] - 2026-07-03

### Added
- **Fable 5 weekly bar** — Claude Code sends the Fable 5 weekly window
  as `rate_limits.seven_day_overage_included` (Fable usage is
  credit-based, so the key is a billing term). It used to render with
  the raw `overage_included` label; it now shows as `fable` (compact /
  wide) and `Current week (Fable 5)` (full), pinned right after the
  all-models `week` bar so alphabetical ordering can't slip `opus` in
  between. New fixture `examples/sample-with-fable.json` + `test:fable`
  / `test:fable:compact` smoke scripts wired into CI.
- **`--hide=<name>[,…]` window filter** — drop specific rate-limit bars
  from the display (and the cat's mood) by chip name (`opus`, `sonnet`,
  `fable`, …) or raw key (`seven_day_opus`). `npx claude-cat configure`
  gained a "Weekly model bars" step (all / fable only / none) that
  emits the flag, so it's an install-time checkbox too. `test:hide`
  smoke script wired into CI.

### Known limitation
- As of Claude Code 2.1.199 the statusLine stdin still carries only
  `five_hour` + `seven_day` even mid-Fable-5-session, so the fable bar
  stays hidden until Claude Code starts piping the window through — it
  then appears automatically, no update needed. Renderer is defensive:
  malformed or missing entries never break the status line.

## [1.2.6] - 2026-05-26

### Added
- **Bars no longer vanish when you step away** — an idle terminal reads
  the shared cross-terminal cache, but the cache used to be discarded
  after 10 minutes, so the bars blinked out into a resting cat the
  moment you stopped typing for a bit. Cached usage is now kept for up
  to 6 hours and rendered as **last-known**: the bars stay visible but
  go colorless, the cat rests (it doesn't react to numbers that may
  have drifted), and a `stale · 14m ago` chip explains the dimming.
  Past 6 hours the numbers are dropped as before. `test:stale` smoke
  script added to CI.

### Fixed
- **Wizard answers now reach the command** — `npx claude-cat
  configure`'s "Show session cost ($)?" and "Show context-window
  usage (ctx %)?" answers were silently dropped because
  `buildCommand()` never read them and no `--no-cost` / `--no-ctx`
  flags existed. Both flags are now parsed by `statusline.js` and
  gated in every layout (compact / full / wide); the wizard emits
  them when the user picks "hide". `test:no-cost` and `test:no-ctx`
  smoke scripts added to CI so future regressions get caught.

## [1.2.5] - 2026-04-16

Security hardening release. Adds input sanitization against ANSI
escape injection (discovered via a local penetration test), documents
the project's security posture, and wires in supply-chain guardrails.
No user-visible output changes — the statusLine renders identically
to 1.2.4 for all legitimate payloads.

### Security
- **ANSI escape injection defence** (#59) — every string field read
  from stdin JSON or the cross-terminal cache (`model.display_name`,
  rate-limit keys) now has C0 control characters (`\x00`–`\x1f`,
  `\x7f`) stripped before rendering. Previously a malicious payload
  could retitle the terminal window (`OSC 0`), clear the screen
  (`\x1b[2J\x1b[H`), or inject fake clickable hyperlinks (`OSC 8`).
- **Window key whitelist** — `rate_limits.*` keys are now validated
  against `/^[a-z][a-z0-9_]*$/`, rejecting UI-spoofing attempts via
  crafted keys like `$(rm -rf /)` or `../../../etc/passwd`.
- **Percentage clamp** — `used_percentage` is clamped into `[0, 100]`
  before rendering so a runaway `999999999%` can't distort the line.
- **Cache poisoning defence** — the cross-terminal cache file
  (`~/.claude/claude-cat/rate-limits-cache.json`) is now scrubbed on
  both write and read, so a local process with write access can't
  inject ANSI payloads that replay in idle sessions.

### Docs
- **New `SECURITY.md`** — vulnerability reporting policy (private
  advisory only), project invariants (no network, no keychain, no
  writes outside `~/.claude/claude-cat/`), supported-version policy.
- **README (en/ko)** gains a **Security** section: npm supply-chain
  considerations, version-pinning guidance
  (`npx -y claude-cat@1.2.5`), package-audit recipe, local-install
  alternative, vulnerability-report link.
- **README hero re-framed around "zero network / zero credentials"**
  (en/ko) — new `Why claude-cat` section with explicit threat
  model, badges (`network: 0 calls`, `credentials: never read`),
  and a comparison table against ccstatusline / claude-dashboard /
  ccusage so users can pick by safety posture, not just feature
  count.
- **CONTRIBUTING.md** — release flow corrected: "squash-merge" →
  "merge commit (`gh pr merge --merge`)" (matches the repo policy).
- Removed outdated `assets/README.md` (stale face ASCII table) and
  unused `examples/sample-api-only.json` fixture.

### Infra / tooling
- **`.gitignore` hardened** — `.npmrc`, `.npmrc.*`, `*.token`,
  `*.bak`, `*.backup`, `*.orig`, `*.rej` added.
- **`prepublishOnly` hook** — `package.json` now runs `test:sample`
  + `test:full` + `npm pack --dry-run` automatically before any
  `npm publish`, preventing accidentally shipping broken tarballs.
- **Dependabot configured** (`.github/dependabot.yml`) — weekly npm
  + github-actions updates, PRs target `dev`.

### Compatibility
- No flag or CLI changes. Existing `~/.claude/settings.json` entries
  keep working; output for legitimate payloads is byte-for-byte
  identical to 1.2.4.

## [1.2.4] - 2026-04-15

Visual polish — tighter layout and a refined color palette that reads
well on dark terminals without breaking on light ones.

### Changed
- **Tighter separator** (#54) — compact/wide separator shrunk from
  `··|··` (5 chars) to `·|·` (3 chars), saving 4-6 columns per line.
  Helpful on narrow terminals where Claude Code truncates the status.
- **Refined color palette** (#56) — three changes based on WCAG
  contrast research:
  - **separator**: bold white → bold default fg (inherits terminal
    foreground — visible on both dark and light backgrounds)
  - **cost chip**: bold white → dim (secondary info, same visual
    weight as reset phrases)
  - **ctx chip**: dim cyan → dim (drops the cyan tint, consistent
    with cost and reset phrase styling)

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
