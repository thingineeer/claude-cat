# Resume — claude-cat
## Date / Branch
2026-11-19 / `dev`
## ⚡ 한 줄 상태
v1.6.0 릴리즈 완료(npm latest = 1.6.0, `dev` = `main` = `v1.6.0`) — Claude Code 2.1.327·Ultra 대응, `claude-cat update`, 레포 정리(CodeRabbit 제거, 중복 draft 삭제).
## Completed (이번 세션)
- [x] **2.1.327 / Ultra(구 Max)** — stdin 실측: `rate_limits.seven_day` 만 옴(5h 없음). `seven_day_fable` → `fable` 바, `spend_limit` → `spend` 바, wizard plan `ultra (formerly Max)` (#90)
- [x] **모델 chip 버그** — idle 세션이 캐시 overlay 시 다른 세션 모델로 덮이던 문제, 자기 stdin 모델 우선 (#91)
- [x] **`claude-cat update` / `--version`** — stale npx 캐시 삭제·전역 업그레이드·pin bump·같은 spec pre-warm, `--dry-run` (#92)
- [x] README en/ko 대폭 갱신(2.1.327 배너, stdin 필드 표, Ultra 행, 가격표 Fable 5.2 $8/$40), v1.6.0 릴리즈 (#93) + npm publish
- [x] 레포 정리 — merge 된 remote 브랜치 삭제, 중복 Draft release 9개 삭제, CodeRabbit 제거, MAINTAINER 릴리즈 절차 수정
## 미해결 / 다음 할 일
1. fable 바 실표시 — CC 가 stdin 에 `seven_day_fable`(또는 `seven_day_overage_included`)을 보내면 자동 표시. 확인: statusLine 에 `CLAUDE_CAT_DEBUG=1` → `~/.claude/claude-cat/last-keys.txt`
2. vault `NPM_TOKEN` 만료 — 지금 `~/.npmrc` 는 `npm login` 세션 토큰. `setup.sh` 재실행 전 granular(Bypass 2FA) 토큰 재발급
3. (backlog) Extra usage bar, light-theme palette, `capture-all.sh` 의 없는 fixture 참조 버그
## 주의
- 리뷰 봇 없음(CodeRabbit 제거) — CI 통과만 보고 merge
- npm 계정 2FA = 보안키(MJ_KEY). `npm publish` 의 auth URL 은 Chrome/Safari 에서 승인(Aside 는 WebAuthn 창 안 뜸). 2FA 켜기 전 로그인 토큰은 E403 → 재로그인
- 릴리즈: main push 시 workflow 가 draft 생성 → `gh release edit vX.Y.Z --draft=false` 로 publish(새로 create 금지)
- `release/*` 커밋은 `ALLOW_DIRECT_COMMIT=1`, dev ff 는 `ALLOW_DIRECT_PUSH=1 git push origin origin/main:refs/heads/dev`
- Homebrew node 업그레이드 후 `npx` 링크가 빠지면 statusLine 이 멈춤 → `brew unlink node && brew link node`
- fixture `examples/sample-ultra*.json` 은 resets_at 2100년 — 과거 fixture 는 "API mode" 로 렌더됨
## 참조
- @docs/checkpoints/SESSION-STATE.md · @docs/MAINTAINER.md · @CHANGELOG.md `[1.6.0]`
