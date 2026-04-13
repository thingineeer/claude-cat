# 🐾 claude-cat

> Claude Code 상태 표시줄에 귀여운 고양이가 살며 남은 크레딧을 한눈에 알려줍니다.

[English README →](./README.md)

![status: alpha](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

```
 /ᐠ - ˕ - ᐟ\   ·   5h ▓▓░░░░░░░░ 10% (4h43m)   ·   7d ▓▓░░░░░░░░ 18% (금 13:00)   ·   $0.123
```

사용률이 오르면 고양이의 표정이 바뀝니다 — 한도에 닿기 전에 자연스럽게 눈에 띕니다.

| 사용률 | 고양이 |
| ------ | ------ |
| 0–30 % | `/ᐠ - ˕ - ᐟ\` 평온 |
| 30–60 % | `/ᐠ ｡ㅅ｡ᐟ\` 호기심 |
| 60–85 % | `/ᐠ •ㅅ• ᐟ\` 경계 |
| 85–95 % | `/ᐠ ≻ㅅ≺ ᐟ\` 긴장 |
| 95 %+  | `/ᐠ ✖ㅅ✖ ᐟ\` 위험 |

## 왜 만들었나

`/usage` 명령을 매번 치기 귀찮죠. Claude Code는 이미 매 메시지마다 statusLine 스크립트에 세션 비용·5시간/7일 사용률 JSON을 넘겨줍니다. **claude-cat은 그 JSON을 예쁘게 렌더링할 뿐이며**, 위에 고양이를 올려둡니다.

API 키 안 씁니다. OAuth 토큰 안 읽습니다. 외부 네트워크 호출 없습니다.

## 설치

`~/.claude/settings.json` 에 추가:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y claude-cat@latest",
    "padding": 1,
    "refreshInterval": 30
  }
}
```

풀(여러 줄) 모드:

```json
"command": "npx -y claude-cat@latest --full"
```

## 플랜별 호환

| 플랜 | 표시 | 비고 |
| ---- | ---- | ---- |
| Claude Pro / Max | 5시간·7일 사용률, 리셋 카운트다운, 고양이 | `rate_limits`는 첫 응답 이후 등장 |
| Anthropic API 키 | 세션 비용(USD), 고양이 | statusLine JSON에 rate_limits 없음 |
| Teams / Enterprise | 비용 + 조직 설정에 따라 | |
| Bedrock / Vertex | 비용 0으로 표시 | Claude Code의 상위 제약 |

## 개발·기여

```bash
git clone https://github.com/thingineeer/claude-cat.git
cd claude-cat
git config core.hooksPath .githooks

npm run test:sample
npm run test:full
npm run test:critical
```

기여 전에 [CONTRIBUTING.md](./CONTRIBUTING.md)를 꼭 읽어주세요. 핵심:
- feature 브랜치는 **독립 worktree**에서 작업, 하나의 브랜치 = 하나의 주제
- 논리 단위로 작게 커밋
- **AI 공동저자(Co-Authored-By) 라인 금지** — hook이 자동 차단
- 리뷰는 CodeRabbit + 메인테이너

## 라이선스

MIT © thingineeer
