# Session State — claude-cat

## Date
2026-04-15

## Branch
- `dev` tip: `ecaf357` = `main` = `v1.2.4` tag — everything in sync
- Last released to npm: `claude-cat@1.2.4` (latest)
- No in-flight worktrees; no local feature branches

## Completed (this session)
- [x] **v1.2.3 published to npm** — Reliability and performance patch
  - PR #48 `fix/mood-expired-windows` — inferState()가 만료 window 무시하도록 수정 (CLAUDE.md invariant 위반 버그)
  - PR #49 `perf/terminal-width` — detectTerminalColumns() per-process memoization
  - PR #50 `fix/window-entry-validation` — isWindowEntry OR→AND (partial entry 방어)
  - PR #51 `refactor/now-consistency` — render 사이클 frozen now (setRenderNow/getRenderNowSec)
  - PR #52 `perf/tz-cache` — Intl.DateTimeFormat 모듈 로드 시 1회 resolve
- [x] **v1.2.4 published to npm** — Visual polish
  - PR #54 `feat/compact-sep` — separator `  |  ` → ` | ` (3칸, 4-6 cols 절약)
  - PR #56 `feat/color-polish-v2` — color palette 정리:
    - separator: bold white → bold default fg (라이트모드 호환)
    - cost: bold white → dim (보조 정보)
    - ctx: dim cyan → dim (보조 정보, 일관성)
- [x] GitHub Releases v1.2.3 + v1.2.4 published
- [x] Tags `v1.2.3` + `v1.2.4` pushed
- [x] 원격 stale 브랜치 ~25개 정리 (이전 릴리즈, 머지된 feat/fix/docs/chore 등)
- [x] PR #55 `feat/peach-labels` — 실험 후 원복, CLOSED (peach 통일은 한줄 모드에서 역할 구분 약화)
- [x] 서브픽셀 bar 실험 (█▉▊▋▌▍▎▏) — 테스트 후 기존 10칸 ▓░ 유지 결정
- [x] 사용자 settings.json: `npx -y claude-cat@latest` + `padding: 0`

## In Progress
없음 — 모든 작업 완료

## Remaining (backlog)
- **Extra usage bar** — `/api/oauth/usage` 프록시 daemon 필요 (stdin JSON에 없음)
- **Light-theme aware palette** — OSC 11 자동감지 불가 (statusLine cold start 부담). 현재 palette는 ANSI semantic color 위주라 라이트모드에서도 최소한 깨지지 않음
- **Sonnet-only weekly bar** — 서버가 `seven_day_sonnet`을 간헐적으로만 내려줌
- **RunCat 스타일 애니메이션** — statusLine 구조상 불가 (assistant 메시지당 1회 실행, 자체 타이머 없음). frame-rotate로 유사 효과 가능하나 우선순위 낮음

## Key Files
- `CLAUDE.md` — branch model, worktree-only policy, release flow, layout/mood invariants
- `docs/MAINTAINER.md` — release playbook, npm publish flow
- `CHANGELOG.md` — `## [1.2.4] - 2026-04-15` is the latest
- `README.md` / `README.ko.md` — user-facing docs
- `src/statusline.js` — main renderer
- `src/format.js` — bars, palette, countdown, frozen now
- `src/cats.js` — mood thresholds + ASCII art
- `src/cache.js` — cross-terminal sync
- `examples/sample-*.json` — fixtures for `npm run test:*`

## Notes (invariant)
- **Worktree-only policy**: never edit/commit/push from primary checkout. Always `git worktree add`.
- **PR assignee**: 항상 `--assignee thingineeer`
- **Merge commits, not squash** — `gh pr merge --merge`
- **No AI attribution** — `commit-msg` hook rejects Co-Authored-By lines
- **npm publish**: tag → GitHub Release → `npm publish` → dev ff onto main
- **Color palette design** (v1.2.4): bar색(primary) → peach라벨(identity) → bold separator(structure) → dim(secondary). WCAG 4.5:1 기준.

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
