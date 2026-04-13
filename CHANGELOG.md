# Changelog

## 1.0.0 — 2026-04-13

Initial public release.

### Added
- statusLine renderer that parses Claude Code's stdin JSON into a compact,
  colorized line with session cost, 5-hour and 7-day rate-limit bars, and
  reset countdowns
- five-step cat face that reflects the highest usage window
  (chill → curious → alert → nervous → critical)
- `--full` mode for a multi-line layout with model name and labeled windows
- graceful fallback when `rate_limits` are absent (API-key users see cost only)
- `.env`-based contributor identity flow (`.env.example` + `scripts/setup.sh`)
- commit hooks that block AI-attribution lines and direct commits to `main`
- CodeRabbit config tuned for Korean reviews
- GitHub Actions smoke workflow running three sample fixtures

### Repository hygiene
- Author identity uses GitHub no-reply addresses; no personal emails shipped
- `package.json` author field uses URL form instead of an email
