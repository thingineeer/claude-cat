# Resume — claude-cat
## Date / Branch
2026-08-21 / `dev`
## ⚡ 한 줄 상태
v1.5.0 릴리즈 완료(npm latest = 1.5.0, `dev` = `main` = `v1.5.0`) — in-flight 작업 없음, worktree 없음.
## Completed (이번 세션)
- [x] **effort chip** — `effort.level`을 모델 chip 뒤에 `fable 5 · high`로 표시 (compact + `--full` header, `--wide` 제외), `--no-effort` 추가, `--no-model`은 둘 다 숨김. PR #87 → dev (CodeRabbit minor 1건 반영: bogus effort 시 full header 모델명 잔존 단언)
- [x] **v1.5.0 릴리즈** — PR #88 release → main, tag `v1.5.0`, GitHub Release, `npm publish` → `npm view claude-cat version` = 1.5.0, `npx -y claude-cat@1.5.0` compact/kawaii 렌더 확인
- [x] README(en/ko) 예시·플래그·chip 범례에 effort 반영, CHANGELOG `[1.5.0] - 2026-08-21`
## 미해결 / 다음 할 일 (우선순위순)
1. (backlog 유지) fable 바 실표시 — CC가 `seven_day_overage_included`를 stdin에 보내면 자동 표시. 확인: `CLAUDE_CAT_DEBUG=1` + `cat ~/.claude/claude-cat/last-keys.txt`
2. (backlog) `/api/oauth/usage` opt-in 프록시, Extra usage bar, light-theme palette — 사용자 요청 시에만
3. (잡일) `scripts/capture-all.sh`가 없는 `examples/sample-api-only.json` 참조로 중단되는 버그 — 미수정
## 주의 (다음 세션이 밟을 함정)
- `release/*` 커밋은 pre-commit hook에 막힘 → `ALLOW_DIRECT_COMMIT=1 git commit`; dev ff는 `ALLOW_DIRECT_PUSH=1 git push origin main:dev`
- `gh pr merge --delete-branch`는 primary가 `dev`를 점유해서 로컬 checkout 단계에서 에러를 내지만 GitHub merge 자체는 성공 — `gh pr view --json state`로 확인하면 됨
- `npx` 스모크 테스트 시 `HOME`을 임시 디렉터리로 바꾸면 `command not found` — HOME은 그대로 두고 stdin 파일로 테스트
- fixture `examples/*.json`의 `resets_at`은 이미 과거라 bar 대신 "API mode — cost only"가 뜸 — 실제 레이아웃 확인은 `date +%s` 기반 ad-hoc JSON으로
- zsh는 `$var` word-split 안 함 — 플래그 묶음을 변수로 넘길 때 주의
## 참조
- @docs/checkpoints/SESSION-STATE.md — 상세 상태 + 결정 사유 + 세션 이력
- @docs/MAINTAINER.md — release/publish 플레이북
- @CHANGELOG.md — `[1.5.0]` 항목
