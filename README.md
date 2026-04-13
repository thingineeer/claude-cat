# 🐾 claude-cat

<p align="left"><img src="assets/logo.svg" width="96" alt="claude-cat" /></p>

> A cute cat lives on your Claude Code status line and tells you how much usage you have left — at a glance.

[한국어 README →](./README.ko.md)

![status: alpha](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

```
 /ᐠ - ˕ - ᐟ\  ·  Sonnet 4.6 (1M context)  ·  $0.123  ·  ctx 23% used (77% left)
   Current session            ▓░░░░░░░░░░░░░  10%  · 3h 15m
   Current week (all models)  ▓▓▓░░░░░░░░░░░  18%  · Resets Apr 17, 1pm (Asia/Seoul)
   Current week (Sonnet only) ░░░░░░░░░░░░░░   0%  · Resets Apr 15, 1pm (Asia/Seoul)
```

Same labels and reset phrasing as the `/usage` popup inside Claude Code.
The only locale-aware piece is the session countdown — in a Korean
terminal the first row reads `3시간 15분 후` instead of `3h 15m`.

When your usage climbs, the cat's face changes — so you notice the ceiling before you hit it.

| usage   | cat                |
| ------- | ------------------ |
| 0–30 %  | `/ᐠ - ˕ - ᐟ\` chill |
| 30–60 % | `/ᐠ ｡ㅅ｡ᐟ\` curious |
| 60–85 % | `/ᐠ •ㅅ• ᐟ\` alert |
| 85–95 % | `/ᐠ ≻ㅅ≺ ᐟ\` nervous |
| 95 %+   | `/ᐠ ✖ㅅ✖ ᐟ\` critical |

## Why

`/usage` inside Claude Code works, but you have to type it every time. Meanwhile Claude Code already pipes the numbers you care about — session cost, 5-hour window %, 7-day window % — to any status-line script via stdin JSON. **claude-cat** is just a nicely formatted renderer for that JSON, with a cat on it.

No API keys. No OAuth reads. No network requests. Your credentials never leave Claude Code.

## Install

```bash
# 1) make sure you have Node ≥ 18
# 2) add this to ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y claude-cat@latest",
    "padding": 1,
    "refreshInterval": 30
  }
}
```

Prefer a local clone?

```bash
git clone https://github.com/thingineeer/claude-cat.git ~/.local/share/claude-cat
# settings.json → "command": "node ~/.local/share/claude-cat/bin/cli.js"
```

### Layouts

```json
"command": "npx -y claude-cat@latest"              // compact (default, one line)
"command": "npx -y claude-cat@latest --full"       // multi-line with bars + context window
"command": "npx -y claude-cat@latest --wide"       // one horizontal line, even with many windows
```

- `compact` — terse, fits most terminal widths
- `full` — one line per window + a `Context ▓░░░ 23%` bar when present
- `wide` — heavy-user mode: keeps everything on a single line so the chat area never shifts vertically when a new window appears

### Language

Labels and reset phrases are fixed English on purpose — they mirror the
`/usage` popup one-to-one, so the terminal and the in-app UI read the
same. The only localized piece is the session countdown word order:

| locale | session reset |
| --- | --- |
| default (`en`) | `3h 15m` |
| `ko` (detected from `LANG=ko_KR.*` or `CLAUDE_CAT_LANG=ko`) | `3시간 15분 후` |

## Plan compatibility

| Plan              | Shows                                   | Notes                                   |
| ----------------- | --------------------------------------- | --------------------------------------- |
| Claude Pro / Max  | 5h %, 7d %, reset countdown, cat mood   | `rate_limits` appears after first reply |
| Anthropic API key | session cost in USD + cat mood          | no rate_limits in statusLine JSON       |
| Teams / Enterprise | cost + whichever rate_limits are sent   | depends on org configuration            |
| Bedrock / Vertex  | cost stays at 0 (upstream limitation)   | see Claude Code docs on cost tracking   |

## How it works

Claude Code runs your status-line command and pipes a JSON blob to stdin on every assistant message (and on `refreshInterval`). claude-cat reads that blob and prints one line (or a few, with `--full`). That's it.

No file access outside the process, no network.

## Development

```bash
git clone https://github.com/thingineeer/claude-cat.git
cd claude-cat
git config core.hooksPath .githooks     # enable commit hooks

npm run test:sample
npm run test:full
npm run test:critical
```

### Contributing

PRs welcome — please read [CONTRIBUTING.md](./CONTRIBUTING.md) first. TL;DR:
- feature branch in a dedicated **git worktree**, one topic per branch
- logical, small commits
- **no AI-attribution lines** in commit messages (enforced by hook)
- PR review happens via CodeRabbit + maintainer

## License

MIT © thingineeer
