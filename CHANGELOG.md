# Changelog

## Unreleased

Still iterating on terminal UX before an official 1.0.0. The v1.0.0
tag/release cut on 2026-04-13 has been demoted to a draft so we can
keep shaping the layout (Extra usage, wide layout, official CLI
labels) before a proper public launch.

### In flight toward 1.0.0
- `CLAUDE_CAT_DEBUG=1` dumps stdin JSON so we can align with the real
  `/usage` CLI payload (Current session / Current week (all models) /
  Current week (Sonnet only) / Extra usage)
- Planned: official CLI label set + `Resets 7pm (Asia/Seoul)` style
- Planned: `--layout=wide` one-line mode for heavy users
- Planned: Extra usage bar in the same order as the CLI screen

### Shipped (rolling)
- statusLine renderer that parses Claude Code's stdin JSON
- five-step cat face reflecting the highest usage window
- `--full` multi-line mode
- `--icons=none|emoji|nerd` scaffold
- graceful fallback when `rate_limits` are absent (API-key users see cost only)
- `.env`-based contributor identity flow (`.env.example` + `scripts/setup.sh`)
- commit hooks that block AI-attribution lines and direct commits to `main`
- neon-line SVG asset set (logo + 5 face moods)
