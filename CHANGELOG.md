# Changelog

## Unreleased

Still iterating on terminal UX before an official 1.0.0. The v1.0.0
tag/release cut on 2026-04-13 has been demoted to a draft so we can
keep shaping the layout (Extra usage, wide layout, official CLI
labels) before a proper public launch.

### Recently landed
- official `/usage` labels: "Current session", "Current week (all models)",
  "Current week (<Model> only)" (e.g. Sonnet only)
- locale-aware reset phrasing: `3h 15m` / `Resets Apr 17, 1pm (Asia/Seoul)`
  in English, `3시간 15분 후` / `4월 17일 오후 1시에 재설정 (Asia/Seoul)`
  in Korean (honors `LANG` / `LC_ALL`; overrideable via `CLAUDE_CAT_LANG`)
- `context_window.used_percentage` now surfaces as a quiet `Context ▓░░░ 23%`
  bar in full mode
- new `--layout=wide` (alias `--wide`) keeps everything on a single line so
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
