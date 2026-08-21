# Session State — claude-cat

## Date
2026-08-21

## Branch
- `dev` tip = `main` = `v1.5.0` tag (`4d33299` Merge PR #88) — everything in sync
- Last released to npm: `claude-cat@1.5.0` (latest)
- No in-flight worktrees; no local feature branches
- 최신 진입점: @.claude/memory/resume-claude-cat.md

## Completed (this session)
- [x] **v1.5.0 released** — effort chip (PR #87 feat → dev, PR #88 release → main, tag `v1.5.0`, GitHub Release, npm publish, `npx -y claude-cat@1.5.0` 렌더 확인)
  - **effort chip**: CC stdin `effort.level`(low/medium/high/xhigh/max)을 모델 chip 뒤에 `· <effort>`로 붙임 — compact `fable 5 · high | 5h …`, `--full` header `Fable 5 · high  ·  $1.87  ·  ctx …`. `--wide`는 모델 chip이 없어 변경 없음
  - full에서 header 줄(66col)이 window 줄(98~113col)보다 짧아 빈 폭에 들어감 → 카드 3줄 유지 (사용자 요구사항: "세줄은 마냥 길어지지 않게")
  - `--no-effort`(모델 유지, effort만 숨김), `--no-model`(둘 다 숨김 — 모델 없는 effort 단독은 의미 없음)
  - `effort.level`은 `sanitizeText` + `[a-z]{1,12}` whitelist — 불량 값이면 effort만 생략, 모델 chip 유지
  - fixture: `sample-stdin.json`(high), `sample-with-fable.json`(max)에 effort 추가; `scripts/test-model-chip.sh`가 모든 토글 방향 + 불량 값 경로 검증 (CodeRabbit minor 반영: bogus 시 full header 모델명 잔존 단언)
  - README(en/ko) 레이아웃 예시·플래그·chip 범례, README.ko에 모델/effort chip 범례 행 추가(영문과 동기화), CHANGELOG `[1.5.0] - 2026-08-21`
- [x] 로컬 statusLine = `npx -y claude-cat@latest --hide=opus,sonnet --no-debug-chip` → 재시작 시 1.5.0 자동 반영

## In Progress
없음 — 릴리즈 완료

## Remaining (backlog)
- **fable 바 실표시 대기** — CC가 statusline stdin에 `seven_day_overage_included`를 보내는 순간 자동 표시. 확인법: `CLAUDE_CAT_DEBUG=1` + `cat ~/.claude/claude-cat/last-keys.txt`
- **`/api/oauth/usage` opt-in 프록시** — CLAUDE.md 정책: 명시적 opt-in 플래그 + README tradeoff 명시. 사용자가 원하면 별도 PR
- **capture-all.sh 버그** — 존재하지 않는 `examples/sample-api-only.json` 참조로 `set -e` 중단 (미수정)
- Extra usage bar / Light-theme palette (기존 backlog)

## Key Files
- @src/statusline.js — `effortLevel`/`modelEffortChip`(effort chip), `shortModelName`, `renderCompact`/`buildDataBlock`의 chip 조립, `--no-effort` 파싱
- @scripts/test-model-chip.sh — 모델+effort chip 토글 smoke (`npm run test:no-model`, CI 등록)
- @examples/sample-with-fable.json — fable+opus+effort(max) fixture
- @CHANGELOG.md — `[1.5.0] - 2026-08-21`
- @docs/MAINTAINER.md — release/publish 플레이북

## 대화 요약

### 이번 세션에서 결정한 것
- **effort는 별도 chip이 아니라 모델 chip에 `·`로 합침** — 이유: "fable 5 옆에"라는 요구 + `high` 단독은 무엇의 high인지 모호; full header의 `(1M context)` 뒤에 괄호를 또 붙이면 `(1M context) (high)`가 되어 `·` 선택
- **full은 header에 넣어 세로 길이 유지** — 사용자 요구: 한 줄은 길어져도 되지만 세 줄은 빈 공간 활용. header < window 줄 폭이라 실제로 카드 크기 불변
- **`--no-model`이 effort도 숨김** — effort가 모델 chip에 올라타는 구조라 일관성 위해
- **wide 미변경** — 1.4.0 때도 모델 chip을 wide에 넣지 않았음; 같은 정책 유지
- **effort 값은 캐시(rate-limits-cache.json)에 넣지 않음** — 세션 로컬 설정이라 항상 자기 stdin에서만 읽음

### 명시된 사용자 선호
- 세 줄 레이아웃은 정보가 늘어도 "빈 공간에 넣어 지금이랑 비슷하게" — 세로 확장 금지
- 기능 → 배포(릴리즈+npm)까지 한 번에, README도 같이

### 다음 세션이 알아야 할 맥락
- CC statusline stdin에 `effort.level`이 이미 옴 (2.1.219 기준, `~/.claude/claude-cat/last-stdin.json`으로 확인) — 값은 `high` 등 소문자 단어
- 릴리즈 함정: `release/*` 커밋은 `ALLOW_DIRECT_COMMIT=1`, `gh pr merge --delete-branch`는 로컬 checkout 에러를 내지만 GitHub merge는 성공, npx 스모크는 HOME 바꾸면 실패

### 이 프로젝트 세션 이력 (이 기기)
- 04-14 ~ 04-15 — v1.0.x → v1.2.4: configure 위저드, cross-terminal cache, Pro/Max 분기, separator·색상 폴리시, README 표/GIF
- 04-16 ~ 04-17 — 보안 점검(침투테스트, sanitize/clamp), v1.2.5, 계정 swap 도구(프로젝트 외)
- 05-26 — 외부 PR 검토/정리, npm 토큰 회전, v1.2.6 (stale 캐시 dim 유지)
- 07-03 — Fable 5 대응 v1.3.0: fable 라벨/정렬 + `--hide` + 위저드 스텝, 릴리즈 전체 사이클, 로컬 적용
- 07-27 — v1.4.0: compact 모델 chip(`opus 5`), `--no-model`, test-model-chip.sh (세션 저장 없이 종료)
- 08-21 (이번) — v1.5.0: 모델 chip에 effort level(`fable 5 · high`), `--no-effort`, README en/ko, 릴리즈 전체 사이클

## Notes
- **미추적 파일 3개는 의도적으로 커밋 안 함**: `.agents/`(Codex용 스킬), `AGENTS.md`(Codex용 플레이북 사본), `.claude/settings.local.json`(로컬 권한 — 커밋 금지 대상)
- release 플로우 escape: release/* 커밋 → `ALLOW_DIRECT_COMMIT=1`, dev ff → `ALLOW_DIRECT_PUSH=1 git push origin main:dev`
- npm publish 토큰은 `~/.npmrc` (envpull claude-cat + setup.sh로 세팅됨)

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
