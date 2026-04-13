# Contributing to claude-cat

Thanks for considering a contribution! A few house rules keep the repo sane.

## Workflow: worktrees + feature branches

All changes land through an independent feature branch **on a dedicated git worktree** — never commit directly on `main`.

```bash
# from the repo root
git fetch origin
git worktree add ../claude-cat.feat-<topic> -b feat/<topic> origin/main
cd ../claude-cat.feat-<topic>
# … make focused, logical commits …
git push -u origin feat/<topic>
# open a PR, squash-merge into main, then:
git worktree remove ../claude-cat.feat-<topic>
git branch -d feat/<topic>
```

Rules:
- One feature / fix per branch. Unrelated changes go in separate branches.
- Split commits by **logical unit** (not "everything at the end of the day"). A reviewer should be able to read commits one by one.
- Rebase on `main` before opening a PR; prefer fast-forward or squash merges.

## Commit messages

- Conventional Commits preferred: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`.
- Korean or English — both fine. Keep the subject ≤ 72 chars.
- **No AI-tool attribution lines.** Do not add AI co-author / generator footers to commit messages. A commit-msg hook rejects them automatically.
- Commit under your own git identity. Use the GitHub no-reply address to avoid leaking your personal email.

### One-time setup

Copy the environment template and enable the hooks:

```bash
cp .env.example .env     # fill in GIT_USER_NAME / GIT_USER_EMAIL locally
./scripts/setup.sh       # applies .env to local git config + hooks path
```

`.env` is git-ignored — nothing you put there is ever pushed.

## Security

- Never commit secrets. `.env`, `*.pem`, `*.p8`, `*.p12`, `.credentials.json` are git-ignored.
- Do not read from `~/.claude/.credentials.json` or the macOS Keychain — claude-cat only consumes the stdin JSON that Claude Code officially provides to statusLine scripts.
- If you discover a security issue, please open a private advisory on GitHub rather than a public issue.

## Testing

```bash
npm run test:sample     # normal usage
npm run test:full       # multi-line layout
npm run test:critical   # high-usage cat face
```

CI runs the same three scripts on every PR.
