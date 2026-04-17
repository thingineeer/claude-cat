# Session State — claude-cat

> Snapshot after the v1.2.5 security-hardening release.

## Date
2026-04-17

## Branch
- `dev` tip: `1bc4a6f` = `main` = `v1.2.5` tag — everything in sync
- Last released to npm: `claude-cat@1.2.5` (latest)
- No in-flight worktrees at save time

## Completed (v1.2.5 cycle)
- [x] **v1.2.5 published to npm** — Security hardening release
  - ANSI escape injection defence: C0 controls stripped from `model.display_name`
    and `rate_limits.*` keys before rendering (`src/sanitize.js`)
  - Window-key whitelist: `rate_limits.*` keys validated against
    `^[a-z][a-z0-9_]*$` (blocks UI-spoofing via crafted keys)
  - Percentage clamp: `used_percentage` forced into `[0, 100]`
  - Cross-terminal cache scrubbed on both write and read
- [x] CodeRabbit 리뷰 2회차 피드백 반영 (commits `ac8f992`, `68e37f6`)
- [x] README (en/ko) "zero network / zero credentials" 재포지셔닝
- [x] `SECURITY.md` 신설 (vulnerability reporting, invariants, support policy)
- [x] `.gitignore` 하드닝 (`.npmrc`, `*.token`, `*.bak`, `*.orig`, `*.rej`)
- [x] `prepublishOnly` 훅 추가 (`test:sample` + `test:full` + `npm pack --dry-run`)
- [x] Dependabot 설정 (weekly npm + github-actions, PR base `dev`)
- [x] 불필요 파일 제거 (`assets/README.md`, `examples/sample-api-only.json`)

## Completed (this session — 2026-04-17)
- [x] **2.1.112 stdin schema 점검** — 공식 statusLine 문서와 비교
  - 현재 claude-cat이 쓰는 필드 (`model.display_name`, `cost.total_cost_usd`,
    `context_window.used_percentage/remaining_percentage`, `rate_limits.*`)
    는 전부 여전히 유효
  - 2.1.x에서 신규/확장된 필드 중 반영 가치 있는 건
    `context_window.context_window_size` 하나 (1M 세션 구분) — 다만
    "zero network / rate-limit 중심" 포지셔닝 감안 시 우선순위 낮음
  - 결정: 현재 스키마 적합, **코드 변경 없음**
- [x] 계정 swap 유틸리티 (`/swap-jw`, `/swap-ios`, `/swap-server`,
  `/resume-swap`) 개발은 **별도 private repo**
  [`thingineeer/claude-swap-skills`](https://github.com/thingineeer/claude-swap-skills)
  로 분리 — claude-cat의 "zero network / zero credentials" 포지셔닝과
  충돌하지 않도록 완전히 격리

## In Progress
없음 — 2.1.112 schema 점검은 무변경 결론, 이 PR 머지 후 clean slate

## Remaining (backlog)
- **`context_window.context_window_size` 반영 (선택)** — `ctx` chip을
  `ctx 23% (1M)` 처럼 확장 세션 표시 가능. `--full` 레이아웃 한정
  권장. 우선순위: low
- **Extra usage bar** — `/api/oauth/usage` 프록시 daemon 필요
  (stdin JSON에 없음). 기존 invariant 위반이라 opt-in flag 필수
- **Light-theme aware palette** — OSC 11 자동감지 불가 (statusLine
  cold start 부담). 현재 palette는 ANSI semantic color 위주라
  라이트모드에서도 최소한 깨지지 않음
- **Sonnet-only weekly bar** — 서버가 `seven_day_sonnet`을 간헐적으로만
  내려줌. 동적 수집(`collectWindows`)은 이미 대응
- **RunCat 스타일 애니메이션** — statusLine 구조상 불가 (assistant
  메시지당 1회 실행, 자체 타이머 없음). frame-rotate 유사 효과 가능
  하나 우선순위 낮음

## Key Files
- `CLAUDE.md` — branch model, worktree-only policy, release flow,
  layout/mood invariants
- `docs/MAINTAINER.md` — release playbook, npm publish flow
- `CHANGELOG.md` — `## [1.2.5] - 2026-04-16` is the latest
- `SECURITY.md` — vulnerability reporting, invariants
- `README.md` / `README.ko.md` — user-facing docs with "zero network"
  positioning
- `src/statusline.js` — main renderer
- `src/sanitize.js` — ANSI escape stripping, key whitelist, percent clamp
- `src/format.js` — bars, palette, countdown, frozen now
- `src/cats.js` — mood thresholds + ASCII art
- `src/cache.js` — cross-terminal sync (with sanitization on both ends)
- `examples/sample-*.json` — fixtures for `npm run test:*`

## Notes (invariant)
- **Worktree-only policy**: never edit/commit/push from primary
  checkout. Always `git worktree add`
- **PR assignee**: 항상 `--assignee thingineeer`
- **Merge commits, not squash** — `gh pr merge --merge`
- **No AI attribution** — `commit-msg` hook rejects Co-Authored-By lines
- **npm publish**: tag → GitHub Release → `npm publish` → dev ff onto main
- **Zero network / zero credentials**: statusLine consumes only the
  stdin JSON Claude Code pipes; never read `~/.claude/.credentials.json`,
  keychain, or hit `api.anthropic.com` / `claude.ai`
- **Color palette design** (v1.2.4+): bar색(primary) → peach라벨(identity)
  → bold separator(structure) → dim(secondary). WCAG 4.5:1 기준

## Picking up on a different machine

```bash
gh repo clone thingineeer/claude-cat ~/Desktop/claude-cat
gh repo clone thingineeer/thingineeer-env ~/.env-vault
cd ~/.env-vault && ./bin/bootstrap.sh
source ~/.zshrc
cd ~/Desktop/claude-cat
envpull claude-cat
./scripts/setup.sh
```

Then: `/resume-claude-cat`
