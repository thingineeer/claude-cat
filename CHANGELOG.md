# Changelog

## Unreleased

Still iterating on terminal UX before an official 1.0.0. The v1.0.0
tag/release cut on 2026-04-13 has been demoted to a draft so we can
keep shaping the layout (Extra usage, wide layout, official CLI
labels) before a proper public launch.

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
