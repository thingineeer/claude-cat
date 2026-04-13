# 🐾 claude-cat

> Claude Code 상태 표시줄에 귀여운 고양이가 살며 남은 크레딧을 한눈에 알려줍니다.

[English README →](./README.md)

![status: alpha](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

기본 `compact` 출력 (한 줄):
```
5h ▓░░░░░░░░░ 10% (3h 38m)  |  week ▓▓░░░░░░░░ 18% (Fri 1pm)  |  $0.420  |  ctx 28%
```

모든 문구는 영문 고정 — Claude Code `/usage` 팝업과 1:1 매칭되며, 카운트다운도 `3h 38m` 처럼 전세계 공용 표기로 나옵니다.

사용률이 오르면 고양이의 표정이 바뀝니다 — 한도에 닿기 전에 자연스럽게 눈에 띕니다.

> **고양이는 `--full` 레이아웃에서만 나옵니다.** 기본 `compact`(한줄)와
> `--wide`(한줄)는 **고양이 없음** — 데이터 막대 + `$` 비용 + `ctx %`
> 꼬리만. 고양이 보려면 `--full` (1줄 face 을 헤더 옆에 inline) 또는
> `--full --kawaii` (3줄 카드).

### 요약 표 (`--full` 레이아웃 전용)

아래 두 종류 고양이는 모두 `--full`이 그려줍니다. 기본은 1줄 face, `--kawaii`를 붙이면 소품을 든 3줄 카드로 바뀝니다.

| 상태 | `--full` (1줄 face) | `--full --kawaii` 소품 |
| ---- | ------------------- | ---------------------- |
| 대기 중 *(resting, rate_limits 없음)* | `/ᐠ -ᴥ- ᐟ\` | 🚬 담배 |
| 0–30 % *(chill)* | `/ᐠ ^ᴥ^ ᐟ\` | 🍣 초밥 |
| 30–60 % *(curious)* | `/ᐠ •ᴥ• ᐟ\` | ⌨️ 키보드 |
| 60–85 % *(alert)* | `/ᐠ ◉ᴥ◉ ᐟ\` | ☕ 커피 |
| 85–95 % *(nervous)* | `/ᐠ ⊙ᴥ⊙ ᐟ\` | 💤 휴식 |
| 95 %+ *(critical)* | `/ᐠ ✖ᴥ✖ ᐟ\` | 🛌 기절 |

### 3줄 kawaii 전체 갤러리 (`--full --kawaii`)

**resting** — rate_limits 아직 없음 (새 세션 / API 전용 모드)
```
 /\_/\
( -.-)
 / >🚬~
```

**chill** — 0–30 %
```
 /\_/\
( ^ω^ )
 / >🍣
```

**curious** — 30–60 %
```
 /\_/\
( •ㅅ•)
 / >⌨️
```

**alert** — 60–85 % (또는 주간 ≥ 60 % / 세션 ≥ 75 %)
```
 /\_/\
( -ㅅ-)
 / づ☕
```

**nervous** — 85–95 %
```
 /\_/\
( xㅅx)
 / づ💤
```

**critical** — 95 %+
```
 /\_/|
( -.-)zzZ
 /   \
```

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
