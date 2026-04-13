## 요약
<!-- 이 PR이 왜 필요한지 한두 줄 -->

## Base 브랜치 체크
- [ ] **feature/fix/chore/docs PR → base는 `dev`**
- [ ] release PR (maintainer only) → base는 `main`, source는 `dev` 또는 `release/x.y.z`
- [ ] hotfix PR (maintainer only) → base는 `main` (추가로 `dev` 에도 back-merge)

## 변경 내용
- [ ] …

## 테스트
- [ ] `npm run test:sample`
- [ ] `npm run test:full`
- [ ] `npm run test:critical`
- [ ] `npm run test:sonnet` / `test:warming` / `test:saturated` / `test:apicost` (해당 시)
- [ ] 실제 `~/.claude/settings.json`의 `statusLine`에 연결해 수동 확인

## 체크리스트
- [ ] feature 브랜치 + 독립 worktree에서 작업
- [ ] `dev` 기준 rebase (PR base가 `dev`인 경우)
- [ ] 논리 단위로 커밋 분리
- [ ] Co-Authored-By(AI) 라인 없음
- [ ] secret/credential 포함 없음
- [ ] CodeRabbit 리뷰 반영 완료
