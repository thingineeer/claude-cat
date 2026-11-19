# Session State — claude-cat

## Date
2026-11-19

## Branch
- `dev` = `main` = `v1.6.0` tag (`bb6ffe7` Merge PR #93)
- npm: `claude-cat@1.6.0` (latest)
- 최신 진입점: @.claude/memory/resume-claude-cat.md

## Completed (this session)
- [x] **Claude Code 2.1.327 대응** (#90) — 실제 페이로드 덤프로 확인: Ultra(구 Max)는 `rate_limits.seven_day` 하나만, 새 top-level `prompt_cache`. `seven_day_fable` 를 Fable 주간 버킷으로 인식(`fable` / `Current week (Fable)`), `spend_limit` → `spend` 바(mood 에 weekly 급). wizard plan `ultra (formerly Max)`, `CLAUDE_CAT_PLAN=max` 호환. fixture `sample-ultra.json`, `sample-ultra-fable.json` + CI
- [x] **모델 chip 수정** (#91) — idle 세션 캐시 overlay 가 `model` 까지 덮어써 다른 세션 모델(opus 5 등)이 보이던 문제. 사용량만 빌리고 모델은 자기 stdin 우선, 없을 때만 캐시 fallback. `test-stale.sh` 회귀 테스트
- [x] **`claude-cat update`** (#92) — registry 최신 확인 → claude-cat 단독 `_npx` 캐시만 삭제 → 전역 업그레이드 → settings pin bump → statusLine 과 **같은 spec** 으로 pre-warm(npx 캐시 hash 는 spec 문자열 기준). `--dry-run`, `--no-warm`, `--version`. 네트워크는 이 명령에서만(README/SECURITY 예외 명시). `test-update.sh` 오프라인
- [x] **v1.6.0 릴리즈** (#93) + npm publish(2FA 보안키 웹 인증)
- [x] **레포 정리** — merge 된 remote 브랜치 3개, 중복 Draft release 9개 삭제, CodeRabbit 제거, MAINTAINER 릴리즈 절차(draft publish)·npm 2FA 안내

## Remaining (backlog)
- fable 바 실표시 — CC 가 stdin 에 보내기 시작하면 자동
- vault `NPM_TOKEN` 만료 → granular(Bypass 2FA) 재발급
- Extra usage bar / light-theme palette / `capture-all.sh` 버그

## 결정 사유
- **fable 데이터는 stdin 만** — `/api/oauth/usage` 에만 있지만 사용자 결정: "못 가져오면 안 가져와도 돼". 프로젝트 정책(credential·Anthropic 네트워크 0) 유지
- **`$` 재계산 안 함** — stdin 에 모델별 누적 토큰이 없어 재계산이 더 부정확. README 에 정가 참고표만
- **Max → Ultra** — 사용자: 요금제 이름이 바뀜. 동작 차이 없음(필터는 `pro` 만)
- **히스토리 rewrite 안 함** — 공개 레포라 tag·npm·fork 가 커밋 hash 에 묶여 있음

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
