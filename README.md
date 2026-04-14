# 🐾 claude-cat

<p align="left"><img src="assets/logo.svg" width="96" alt="claude-cat" /></p>

> A cute cat lives on your Claude Code status line and tells you how much usage you have left — at a glance.

[한국어 README →](./README.ko.md)

![status: alpha](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

<p align="center">
  <img src="assets/screenshots/kawaii-full.png" alt="kawaii cat + usage bars in a terminal" width="780" />
  <br />
  <em>3-row kawaii card — <code>--full --kawaii</code></em>
</p>

claude-cat is a renderer for the JSON Claude Code already pipes to
statusLine scripts. No API keys, no OAuth, no network. Just a cat.

## Install

Pick a mode, paste the prompt into Claude Code, and it edits
`~/.claude/settings.json` for you (with a diff first, leaving every
other setting untouched). Restart Claude Code and the line shows up
on the next turn.

### A) ⭐ Default — compact, one line *(recommended)*

You get a single line: usage bars + `$` cost + `ctx %`. No cat. Wraps
on narrow terminals.

```
5h ▓▓▓▓░░░░░░ 47% (1h 19m)  |  week ▓▓▓░░░░░░░ 31% (Fri 1pm)  |  $37.37  |  ctx 20%
```

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- command: "npx -y claude-cat@latest"
- padding: 1
- refreshInterval: 600

Don't touch any other key. Show me the diff first.
```

### B) 3-row kawaii cat

You get a 3-row card: ASCII cat on the left, data rows on the right.
The cat's face and prop change with your usage.

```
 /\_/\    Opus 4.6  ·  $38.52  ·  ctx 23% used (77% left)
( ^ω^ )   Current session            ▓▓▓▓▓▓░░░░░░░  51% · 1h 15m
 / >🍣    Current week (all models)  ▓▓▓░░░░░░░░░░  31% · Resets Apr 17, 1pm
```

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- command: "npx -y claude-cat@latest --full --kawaii"
- padding: 1
- refreshInterval: 600

Don't touch any other key. Show me the diff first.
```

<details>
<summary>Other modes — <code>--full</code>, <code>--wide</code>, <code>--full --no-cat</code></summary>

Same install pattern, just swap the `command` value:

| mode | command | what you get |
| ---- | ------- | ------------ |
| `--full` | `npx -y claude-cat@latest --full` | multi-row + 1-line cat face inline with the header |
| `--wide` | `npx -y claude-cat@latest --wide` | one line, never wraps (for very wide panes) |
| `--full --no-cat` | `npx -y claude-cat@latest --full --no-cat` | multi-row, no cat at all |

Power-user flags: `--stack=auto\|always\|never`, `--max-cols=<n>`,
`--no-debug-chip`, `--icons=none\|emoji\|nerd`. Env vars:
`CLAUDE_CAT_COLUMNS`, `CLAUDE_CAT_DEBUG=1`.

</details>

## Reading the output

```
5h ▓▓▓▓░░░░░░ 47% (1h 19m)  |  week ▓▓▓░░░░░░░ 31% (Fri 1pm)  |  $37.37  |  ctx 20%
```

| chip | meaning |
| ---- | ------- |
| `5h` / `week` / `sonnet` | rate-limit window (5-hour session / weekly / per-model weekly) |
| `▓▓▓▓░░░░░░` | 10-cell progress bar — green → yellow → red as it climbs |
| `47%` | exact percentage |
| `(1h 19m)` / `(Fri 1pm)` | time until that window resets — relative for session, absolute for weekly |
| `$37.37` | **this Claude Code session's running cost in USD** — see below |
| `ctx 20%` | how full the current conversation's token budget is |

### What `$37.37` is — and isn't

It's **this single Claude Code session's running cost**, computed by
Claude Code itself (`cost.total_cost_usd` from stdin JSON).

- ❌ NOT "Extra usage" plan-overage fees — that's a different
  `/usage` popup bar and isn't piped to statusLine scripts.
- ❌ NOT your monthly subscription bill.
- ❌ NOT money leaving your account right now if you're on Pro/Max
  (those are flat-rate — the number is informational).
- ✅ On an **API key** it's the real cost. On **Bedrock / Vertex**
  it stays `$0.00` (Claude Code can't compute cost there).

## Cat moods

The cat only shows up in `--full` modes. Six moods — five driven by
usage, one state-driven (resting).

| trigger | `--full` (1-line face) | `--full --kawaii` prop |
| ------- | ---------------------- | ---------------------- |
| no rate limits yet (*resting*) | `/ᐠ -ᴥ- ᐟ\` | 🚬 smoke |
| 0–30 % (*chill*) | `/ᐠ ^ᴥ^ ᐟ\` | 🍣 sushi |
| 30–60 % (*curious*) | `/ᐠ •ᴥ• ᐟ\` | ⌨️ keyboard |
| 60–85 % (*alert*) | `/ᐠ ◉ᴥ◉ ᐟ\` | ☕ coffee |
| 85–95 % (*nervous*) | `/ᐠ ⊙ᴥ⊙ ᐟ\` | 💤 break |
| 95 %+ (*critical*) | `/ᐠ ✖ᴥ✖ ᐟ\` | 🛌 sleeping |

Mood policy: `weekly ≥ 60 %` or `session ≥ 75 %` → alert; any
window ≥ 85 → nervous; any ≥ 95 → critical. Weekly drives the mood
because it's the bar that actually constrains your week.

<details>
<summary>Full 3-row ASCII gallery for every mood</summary>

**resting**
```
 /\_/\
( -.-)
 / >🚬~
```

**chill** (0–30 %)
```
 /\_/\
( ^ω^ )
 / >🍣
```

**curious** (30–60 %)
```
 /\_/\
( •ㅅ•)
 / >⌨️
```

**alert** (60–85 %)
```
 /\_/\
( -ㅅ-)
 / づ☕
```

**nervous** (85–95 %)
```
 /\_/\
( xㅅx)
 / づ💤
```

**critical** (95 %+)
```
 /\_/|
( -.-)zzZ
 /   \
```

</details>

## Plan compatibility

| Plan | Shows | Notes |
| ---- | ----- | ----- |
| Claude Pro / Max | rate-limit bars, reset countdown, cat mood, session cost | `rate_limits` appears after first reply |
| Anthropic API key | session cost in USD + cat mood | no rate_limits in stdin JSON |
| Bedrock / Vertex | cost stays at `$0.00` | upstream limitation |

## What's *not* in stdin JSON (yet)

Two things `/usage` popup shows but Claude Code doesn't pipe to
statusLine scripts, so claude-cat can't render them today:

- **Current week (Sonnet only)** — server includes
  `rate_limits.seven_day_sonnet` only sometimes (condition undocumented).
- **Extra usage** (e.g. `$14 / $20 spent`) — comes from
  `/api/oauth/usage` (private endpoint).

A future opt-in daemon could proxy that endpoint locally and cache
values. Tracked in [issues](https://github.com/thingineeer/claude-cat/issues).

## Development

```bash
git clone https://github.com/thingineeer/claude-cat.git
cd claude-cat
git config core.hooksPath .githooks

npm run test:sample    # try a fixture
npm run test:full
```

Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md). For
Claude-Code sessions: [CLAUDE.md](./CLAUDE.md).

## License

MIT © thingineeer
