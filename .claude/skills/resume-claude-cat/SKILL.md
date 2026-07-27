---
name: resume-claude-cat
description: Resume claude-cat session — auto-pulls, reads save point, and prints briefing.
disable-model-invocation: true
---

# Resume — claude-cat

## 1. Sync with remote — 무조건 가장 먼저
**다른 어떤 파일을 읽기 전에 반드시 git pull부터 한다.** 건너뛰면 pull 이전의 옛 파일로 작업하게 된다.
- `git fetch origin --prune`
- `git status -sb | head -1` 로 'behind' 여부 확인
- behind면 `git pull --ff-only origin dev`. diverged면 멈추고 사용자에게 경고 — force pull 금지

> `@`참조는 스킬 로드 시점(= git pull *이전*)에 파일을 읽어버리므로 여기서는 쓰지 않는다. pull이 끝난 뒤 2단계에서 직접 Read 해 최신 상태를 확보한다.

## 2. Read the refreshed files (pull 이후에)
git pull로 파일이 새로고침됐으니, 이제 Read 도구로 읽는다:
- `CLAUDE.md` — branch model, worktree-only policy, release flow, layout/mood invariants
- `docs/checkpoints/SESSION-STATE.md` — 작업 상태 + 대화 요약
- 위 SESSION-STATE.md의 "Key Files"에 `@`참조로 적힌 파일들을 모두 읽는다 — 각 설명대로 어떤 파일이 어떤 작업과 관련되는지 파악한다.

> 경로 규칙: 이 스킬과 SESSION-STATE.md 안의 모든 파일 참조는 프로젝트 루트 기준 상대 경로여야 한다. `~/Desktop/...` 같은 머신 종속 절대 경로 금지 — 그래야 모든 컴퓨터에서 동일하게 동작한다.

## 3. Git status
`git status` 와 `git branch --show-current` 를 실행하고, 최근 커밋을 (오늘 커밋 전체 `git log --oneline --since="midnight"`) 또는 (최근 10개 `git log --oneline -10`) 중 많은 쪽으로 보여준다. `git worktree list` 도 실행해 남은 side worktree가 있는지 확인한다.

## 4. Build environment
테스트 fixture가 깨끗하게 렌더되는지 확인:

```bash
npm run test:sample
npm run test:full
```

- `./.env` 가 없으면(새 머신) `docs/SESSION-RESUME.md` §3 의 bootstrap 절차를 안내만 한다 — 자동 실행 금지.
- `~/.claude/settings.json` 의 `statusLine` 이 `npx -y claude-cat@latest` 계열이 아니면 그 사실만 알려준다 — 묻지 않고 고치지 않는다.

## 5. Briefing
Print:

---
**Project**: claude-cat (Claude Code statusLine renderer, maintained by `thingineeer`)
**Branch**: {current branch — should be `dev`}
**Tip**: {short SHA + subject}
**npm**: `claude-cat@{npm view claude-cat version}` (latest published)
**Done**: {SESSION-STATE의 Completed 요약}
**Current**: {In Progress}
**Next**: {Remaining backlog 상위 3개}
**지난 대화 핵심**: {SESSION-STATE의 "## 대화 요약"에서 결정·다음할일 1~2줄}
---

Ask: "Ready to continue?"
