# 🐾 claude-cat

<p align="left"><img src="assets/logo.svg" width="96" alt="claude-cat" /></p>

> A cute cat lives on your Claude Code status line and tells you how much usage you have left — at a glance.

[한국어 README →](./README.ko.md)

![status: alpha](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

<p align="center">
  <img src="assets/screenshots/kawaii-full.png" alt="kawaii cat + usage bars in a terminal" width="780" />
  <br />
  <em>3-row kawaii card — <code>--full --kawaii</code>, Korean locale</em>
</p>

## Modes at a glance

Every mode reads from the same stdin JSON Claude Code already pipes to
statusLine scripts. Pick the one that fits your terminal.

### 1. Default — `compact` cat, single line

Terse, fits narrow terminal widths. No flags needed. Labels are shortened
to `5h` / `week` and the reset time rides inside parentheses.

<p align="left">
  <img src="assets/screenshots/compact-short.png" alt="compact cat status line" width="780" />
</p>

```
/ᐠ ^ᴥ^ ᐟ\  |  5h ▓░░░░░░░░░ 10% (3h 15m)  |  week ▓▓▓░░░░░░░ 18% (Fri 1pm)  |  $0.123
```

<details><summary>settings.json</summary>

```json
{ "statusLine": { "type": "command",
  "command": "npx -y claude-cat@latest",
  "padding": 1, "refreshInterval": 5 } }
```
</details>

### 2. Kawaii — 3-row card with ASCII cat

For anyone who wants the cat more present. Each window lines up next to
the cat's fixed-width left column.
```
 /\_/\    Sonnet 4.6 (1M context)  ·  $0.123  ·  ctx 23% used (77% left)
( ^ω^ )   Current session            ▓░░░░░░░░░░░░░  10% · 3h 15m
 / >🍣    Current week (all models)  ▓▓▓░░░░░░░░░░░  18% · Resets Apr 17, 1pm
```

<details><summary>settings.json</summary>

```json
{ "statusLine": { "type": "command",
  "command": "npx -y claude-cat@latest --full --kawaii",
  "padding": 1, "refreshInterval": 5 } }
```
</details>

### 3. Wide — one horizontal line, everything on it

For users running several windows (Sonnet-only bar, context) who don't
want the status line growing taller. Uses the same short labels as
compact.
```
/ᐠ ◕ᴥ◕ ᐟ\  |  Opus 4.6  |  5h ▓▓░░ 25% (3h 15m)  |  week ▓▓░░ 20% (Fri 1pm)  |  week·Sonnet ░░ 0% (Fri 1pm)  |  $0.420
```

<details><summary>settings.json</summary>

```json
{ "statusLine": { "type": "command",
  "command": "npx -y claude-cat@latest --wide",
  "padding": 1, "refreshInterval": 5 } }
```
</details>

### 4. No cat — pure data

Drops the cat glyph entirely.
```
Sonnet 4.6  ·  $0.123  ·  ctx 23% used
  Current session            ▓░░░░░░░░░░░░░  10% · 3h 15m
  Current week (all models)  ▓▓▓░░░░░░░░░░░  18% · Resets Apr 17, 1pm
```

<details><summary>settings.json</summary>

```json
{ "statusLine": { "type": "command",
  "command": "npx -y claude-cat@latest --full --no-cat",
  "padding": 1, "refreshInterval": 5 } }
```
</details>

Same labels and reset phrasing as the `/usage` popup inside Claude Code.
The only locale-aware piece is the session countdown — a Korean
terminal (`LANG=ko_KR.UTF-8`) shows `3시간 15분 후` instead of `3h 15m`.

### Cat moods

Six moods — five driven by usage, one state-driven.

| trigger                         | `--cat=compact` | `--kawaii` prop |
| ------------------------------- | --------------- | --------------- |
| no rate limits yet (*resting*)  | `/ᐠ -ᴥ- ᐟ\`    | `z z` breath    |
| usage 0–30 %  (*chill*)          | `/ᐠ ^ᴥ^ ᐟ\`    | 🍣 sushi        |
| usage 30–60 % (*curious*)        | `/ᐠ •ᴥ• ᐟ\`    | ⌨️ keyboard      |
| usage 60–85 % (*alert*)          | `/ᐠ ◉ᴥ◉ ᐟ\`    | ☕ coffee        |
| usage 85–95 % (*nervous*)        | `/ᐠ ⊙ᴥ⊙ ᐟ\`    | 💤 break         |
| usage 95 %+   (*critical*)       | `/ᐠ ✖ᴥ✖ ᐟ\`    | 🛌 sleeping      |

#### Why weekly drives the mood

"Usage" isn't a single number — the session (5h) and weekly (7d) bars
reset on very different timelines. claude-cat picks the mood from both,
with a small bias toward weekly because that's the bar that actually
constrains your week:

- any window ≥ 95 % → **critical**
- any window ≥ 85 % → **nervous**
- weekly ≥ 60 % **or** session ≥ 75 % → **alert**
- anything ≥ 30 % → **curious**
- otherwise → **chill**

Session windows whose `resets_at` has already passed are excluded —
a 100 % session about to flip shouldn't read as a panic.

`--no-cat` drops the cat entirely — pure data line.

### What you'll see — scenario gallery

Each sample below is real `./scripts/capture-all.sh` output, no edits.

**1. Fresh session** (Pro/Max, before the first reply)
```
 /\_/\   Sonnet 4.6 (1M context)  ·  $0.0000  ·  ctx 5% used (95% left)
( -.-)   resting — waiting for first reply
 / z z
```

**2. Normal use** — chill
```
 /\_/\    Opus 4.6  ·  $0.123
( ^ω^ )   Current session           ▓░░░░░░░░░░░░░  10%  · 3h 15m
 / >🍣    Current week (all models) ▓▓▓░░░░░░░░░░░  18%  · Resets Apr 17, 1:26 pm
```

**3. Weekly bar getting heavy** — nervous (driven by weekly alone)
```
 /\_/\    Opus 4.6  ·  $42.50  ·  ctx 28% used (72% left)
( xㅅx)   Current session           ▓▓▓░░░░░░░░░░░  18%  · 3h 15m
 / づ💤   Current week (all models) ▓▓▓▓▓▓▓▓▓▓▓▓▓░  91%  · Resets Apr 17, 1:26 pm
```

**4. Session about to reset** — critical
```
 /\_/|      Opus 4.6  ·  $12.34
( -.-)zzZ   Current session           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  97%  · 2h 59m
 /   \      Current week (all models) ▓▓▓▓▓▓▓▓▓▓▓▓░░  88%  · Resets Apr 17, 1:26 pm
```

**5. API key / cost-only** — resting
```
 /\_/\   Sonnet 4.6  ·  $0.0042  ·  ctx 12% used (88% left)
( -.-)   API mode — cost only
 / z z
```

**6. Debug mode on**
```
/ᐠ ⌒ㅅ⌒ ᐟ\   ·  Sonnet 4.6  ·  $0.0000  ·  [Debug]
  resting — waiting for first reply
```

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

## What's *not* in stdin JSON (yet)

Two things the `/usage` popup shows that claude-cat **cannot surface today**, because Claude Code doesn't pipe them to status-line scripts:

- **Current week (Sonnet only)** — the server only includes `rate_limits.seven_day_sonnet` in the stdin payload *sometimes* (the condition isn't documented). On many accounts it's simply absent, even while the in-app `/usage` popup displays it. Verified against Claude Code v2.1.104.
- **Extra usage** (e.g. `$14 / $20 spent · Resets May 1`) — never in stdin JSON. The popup fetches it from `/api/oauth/usage` with the OAuth token, which is a private endpoint.

We're exploring an opt-in background daemon that would call that endpoint locally and cache the values, so every terminal sees the same numbers. Tracking the work in [issues](https://github.com/thingineeer/claude-cat/issues).

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

PRs welcome. Full guide in [CONTRIBUTING.md](./CONTRIBUTING.md); for
Claude-Code sessions see [CLAUDE.md](./CLAUDE.md).

```
  feat/*   ──PR──▶  dev   ──release PR──▶  main   ──tagged──▶  GitHub Release
  fix/*               │                     │
  chore/*             │              (maintainer only)
  docs/*              │
            day-to-day integration         released versions
```

- **Open every PR against `dev`**. External contributors never target
  `main` directly — the maintainer cuts releases from `dev`.
- One topic per branch, logical commits, Conventional Commit subjects.
- No AI-attribution lines in commit messages (`commit-msg` hook rejects).
- `pre-commit` / `pre-push` hooks also reject direct commits or pushes
  to `main` and `dev`. Activate locally with `./scripts/setup.sh`
  after cloning.

#### Worktree-only policy

The cloned checkout stays on `dev` for fetch/pull only; all edits live
in side worktrees:

```bash
git worktree add ../claude-cat.feat-<topic> -b feat/<topic> origin/dev
cd ../claude-cat.feat-<topic>
./scripts/setup.sh      # wire hooks + local git identity via .env
# … edit, commit, push …
gh pr create --base dev --head feat/<topic>
```

Run multiple side worktrees in parallel when several topics are in
flight — each ships a separate PR for CodeRabbit + reviewer to see one
coherent change at a time.

## License

MIT © thingineeer
