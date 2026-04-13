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

### 모드 고르기

여기부터 시작하세요. 대부분 **기본 모드**로 충분합니다 — 한 줄, 좁은
터미널에선 자동 줄바꿈, 다른 statusLine 스크립트와도 잘 어울림. 고양이가
보고 싶으면 `--full --kawaii`로 가세요.

| 모드 | 명령어 | 언제 쓰나 |
| ---- | ------ | --------- |
| ⭐ **기본** — compact, 자동 줄바꿈 | `npx -y claude-cat@latest` | **그냥 이걸 쓰세요** — 한 줄이 좁으면 알아서 접힘 |
| `--full` — 여러 줄, 1줄 face | `npx -y claude-cat@latest --full` | 각 데이터가 한 줄씩 + 작은 고양이 |
| `--full --kawaii` — 3줄 ASCII 고양이 | `npx -y claude-cat@latest --full --kawaii` | 고양이를 크게 보고 싶을 때 |

<details>
<summary>엣지 케이스 모드 (자주 필요 없음)</summary>

| 모드 | 명령어 | 언제 쓰나 |
| ---- | ------ | --------- |
| `--wide` — 한 줄, 줄바꿈 안 함 | `npx -y claude-cat@latest --wide` | 매우 넓은 패널에서 줄바꿈 대신 길게 뻗길 원할 때 |
| `--full --no-cat` — 데이터만, 여러 줄 | `npx -y claude-cat@latest --full --no-cat` | `--full` 레이아웃이 좋은데 고양이는 빼고 싶을 때 |

</details>

### 프롬프트 하나로 설치 *(가장 쉬움)*

아래 블록을 Claude Code 세션에 복사해 붙여넣으세요. Claude 가
`~/.claude/settings.json` 을 수정해주며, 쓰기 전에 diff 를 보여줍니다.
다른 키는 건드리지 않습니다.

**기본 (⭐ compact, 추천):**

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- command: "npx -y claude-cat@latest"
- padding: 1
- refreshInterval: 5

Don't touch any other key. Show me the diff first.
```

**3줄 kawaii 고양이 원하면:**

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- command: "npx -y claude-cat@latest --full --kawaii"
- padding: 1
- refreshInterval: 5

Don't touch any other key. Show me the diff first.
```

### 직접 편집하고 싶다면

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y claude-cat@latest",
    "padding": 1,
    "refreshInterval": 5
  }
}
```

다른 모드를 원하면 `command` 의 뒤쪽 플래그만 바꿔 넣으세요 (위 모드
고르기 표 참고). 전체 플래그 목록은 영문 README 의
[Configuration 섹션](./README.md#configuration) 을 확인하세요.

## 출력 숫자 읽는 법 — 무엇이 무엇인지

실제 compact 출력 예시:

```
5h ▓▓▓▓░░░░░░ 47% (1h 19m)  |  week ▓▓▓░░░░░░░ 31% (Fri 1pm)  |  $37.37  |  ctx 20%
```

| 칩 | 의미 |
| --- | --- |
| `5h` / `week` / `sonnet` | rate-limit 창 라벨 (5시간 세션 / 주간 / 모델별 주간) |
| `▓▓▓▓░░░░░░` | 그 창의 사용량 10칸 바 |
| `47%` | 정확한 퍼센트 — 초록 → 노랑 → 빨강으로 변함 |
| `(1h 19m)` / `(Fri 1pm)` | **리셋까지 남은 시간** — 세션은 상대, 주간은 절대 |
| `$37.37` | **이 세션의 누적 비용 (USD)** — 자세한 설명 아래 |
| `ctx 20%` | 현재 대화의 컨텍스트 윈도우 사용률 |

### `$37.37` 이 무엇이고 — 무엇이 아닌지

`$` 칩은 **이 Claude Code 세션의 누적 비용** 입니다. Claude Code 가
stdin JSON (`cost.total_cost_usd`) 으로 직접 넘겨주는 숫자.

- ❌ **아닙니다**: 플랜 초과 "Extra usage" 요금 (다른 개념 — `/usage`
  팝업의 *Extra usage* 바는 stdin JSON 에 없어서 claude-cat 이 지금
  표시하지 못함).
- ❌ **아닙니다**: 월 구독 요금.
- ❌ **아닙니다**: Pro/Max 플랜이면 지금 빠져나가는 돈. 그 플랜들은
  정액제라 이 숫자는 **참고용**.
- ✅ **맞습니다**: 이 세션의 토큰 × API 단가 계산값. 사용 강도 감 잡는
  용. **API key** 모드면 실제 비용. **Bedrock / Vertex** 에선 `$0.00`
  고정 (Claude Code 가 거기선 비용 계산 못 함).

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
