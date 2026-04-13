# Changelog

## Unreleased

Still iterating on terminal UX before an official 1.0.0. The v1.0.0
tag/release cut on 2026-04-13 has been demoted to a draft so we can
keep shaping the layout (Extra usage, wide layout, official CLI
labels) before a proper public launch.

### Recently landed (terminal width + readability + compact cleanup)
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
- **compact + wide are now data-only**: cat and cost are removed
  from both; ctx shrinks to `ctx 28%`; model-scoped weekly labels
  render as just `sonnet` / `opus` (no `week·` prefix).
  Users who want the cat pick `--full --kawaii`.

### Recently landed (brand color + auto-stack)
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

### Recently landed (tight single-line layouts)
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

### Recently landed (branch strategy + repo policy)
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

### Recently landed (mood policy + startup polish)
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

### Recently landed (side-by-side batch)
- kawaii cat now renders in a fixed-width **left column** next to the
  data block instead of stacked above it, so the status line reads as
  one compact 3-row card even when extra rows (Sonnet, context) show up
- refactored `renderFull` to build the data block separately, so cat
  placement (inline / above / left) becomes a local decision per theme

### Recently landed (cat themes batch)
- `--cat=compact|kawaii|none` (aliases `--kawaii`, `--no-cat`) picks
  the art style. Compact (default) keeps the 1-line cat; kawaii uses
  a 3-line ASCII body with mood-specific props (sushi / keyboard /
  coffee / 💤 / sleeping); none drops the cat entirely.
- Reset phrases no longer print the timezone suffix — local time is
  implicit in a terminal session, so 'Resets Apr 17, 1pm' is enough.
- `scripts/capture-all.sh` renders every layout × theme × fixture to
  `tmp/snapshots/` for eyes-on verification before merging.

### Recently landed
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

### Still planned for 1.0.0
- Extra usage bar (needs a live source — the stdin JSON doesn't expose
  it; daemon proxying `/api/oauth/usage` is the leading candidate)
- cross-terminal realtime sync via a small background cache

### Shipped earlier (rolling)
- statusLine renderer parsing Claude Code's stdin JSON
- five-step cat face reflecting the highest usage window
- `--full` multi-line mode
- `--icons=none|emoji|nerd` scaffold
- graceful fallback when `rate_limits` are absent
- `.env`-based contributor identity flow (`.env.example` + `scripts/setup.sh`)
- commit hooks that block AI-attribution lines and direct commits to `main`
- neon-line SVG asset set (logo + 5 face moods)
