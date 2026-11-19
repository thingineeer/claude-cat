# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Use GitHub's private advisory form instead:
**https://github.com/thingineeer/claude-cat/security/advisories/new**

You will get an acknowledgement within a few days. The maintainer
triages and patches; once a fix is released, the advisory is published
with credit (if you want it).

## Scope

claude-cat is a small Node script that reads the stdin JSON Claude
Code pipes to statusLine scripts and prints a colored line. The
project's threat model is narrow:

- **In scope** — issues in `bin/`, `src/`, or `scripts/` that could
  leak data, execute arbitrary code, or escalate privileges beyond
  what a statusLine script should do.
- **Out of scope** — Claude Code itself, upstream npm packages, macOS
  Keychain / Anthropic account compromise, cosmetic terminal rendering
  bugs.

## What claude-cat does *not* do (by design)

These are invariants — if you find the script doing any of them,
that's a bug worth reporting:

- ❌ Read `~/.claude/.credentials.json` or the macOS Keychain
- ❌ Contact `api.anthropic.com`, `claude.ai`, or any other network
  endpoint while rendering the status line
- ❌ Write outside `~/.claude/claude-cat/` (debug dumps only) while
  rendering the status line

The user-invoked `claude-cat update` command is the single, explicit
exception: it asks `registry.npmjs.org` (or your configured npm
registry) for the latest version, removes stale claude-cat entries
from the npm `_npx` cache, may run `npm install -g claude-cat@<latest>`
for an existing global install, and bumps a pinned
`claude-cat@x.y.z` in `~/.claude/settings.json`. It never reads
credentials and never contacts Anthropic. `--dry-run` shows every
change without applying it.
- ❌ Exec arbitrary shell commands from stdin content
- ❌ Load extra runtime dependencies at statusLine render time
  (Ink/React are `configure` wizard-only, lazy-imported)

## Supported versions

Only the latest published `claude-cat@latest` on npm gets security
fixes. Pin to a specific version (`claude-cat@1.2.4`) if you want
reproducibility — and upgrade when an advisory is published.

## Maintainer operational security

Release-publish credentials, npm tokens, and related secrets live in a
**separate private repository**, not here. This repo never references
them beyond documenting that they exist elsewhere.
