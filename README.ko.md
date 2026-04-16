# 🐾 claude-cat

> **오프라인 전용 Claude Code 상태 표시줄.** 네트워크 한 번 안 타고 남은 사용량을 고양이가 알려줍니다.

[English README →](./README.md)

[![npm version](https://img.shields.io/npm/v/claude-cat)](https://www.npmjs.com/package/claude-cat)
[![npm downloads](https://img.shields.io/npm/dm/claude-cat)](https://www.npmjs.com/package/claude-cat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![install size](https://packagephobia.com/badge?p=claude-cat)](https://packagephobia.com/result?p=claude-cat)
[![zero network](https://img.shields.io/badge/network-0%20calls-brightgreen)](#%EF%B8%8F-왜-claude-cat)
[![zero credentials](https://img.shields.io/badge/credentials-never%20read-brightgreen)](#%EF%B8%8F-왜-claude-cat)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/thingineeer/claude-cat/graphs/commit-activity)

<p align="center">
  <img src="assets/screenshots/kawaii-chill.png" alt="3줄 kawaii 카드" width="780" />
  <br />
  <em>3줄 kawaii 카드 — <code>--full --kawaii</code></em>
</p>

## 🛡️ 왜 claude-cat

claude-cat 은 Claude Code 가 statusLine 스크립트에 **이미 stdin 으로 넘겨주는
JSON** 만 읽어 렌더링합니다. 그 이상은 아무것도 안 합니다 — 이게 전체 설계
이자 전체 안전 서사입니다:

- **🚫 네트워크 호출 0회.** `api.anthropic.com` 안 부름.
  `claude.ai` 안 부름. `/api/oauth/usage` 안 부름. 방화벽 뒤에서도
  그대로 작동. `tcpdump` 찍어도 아무것도 안 나옴.
- **🚫 크레덴셜 읽기 0회.** `~/.claude/.credentials.json`, macOS
  Keychain, OAuth 토큰 **절대** 안 건드림. npm 계정이 털려도
  최악의 시나리오가 "상태 표시줄이 이상하게 나옴" — Anthropic
  계정 탈취는 불가.
- **🚫 외부로 쓰기 0회.** `~/.claude/claude-cat/` (로컬 sync 캐시 +
  디버그 덤프)만 씀. 컴퓨터 밖으로 나가는 바이트 없음.
- **✅ stdin-only 정책.** [`SECURITY.md`](./SECURITY.md) 에 명시되어
  있고 프로젝트의 threat model 로 못박힘. 부수 효과가 아닌 설계
  의도.

### 다른 Claude Code statusLine / 사용량 도구들과 비교

| 항목 | **claude-cat** | ccstatusline | claude-dashboard | ccusage |
| --- | :---: | :---: | :---: | :---: |
| statusLine 실시간 렌더링 | ✅ | ✅ | ✅ | ❌ (CLI) |
| **네트워크 호출 없음** | **✅** | ❌ (Anthropic API) | ❌ (Anthropic API) | 🟡 (pricing fetch, `--offline` 가능) |
| **OAuth / 크레덴셜 읽기 없음** | **✅** | ❌ | ❌ | ✅ |
| kawaii 고양이 mood 😺 | ✅ | ❌ | ❌ | ❌ |
| 여러 터미널 간 sync | ✅ | ❌ | ❌ | n/a |
| 과거 / 비용 리포트 | ❌ | 🟡 | ✅ | ✅ |

**언제 claude-cat 을 고르나**: 친근한 항상-켜진 상태줄 원하고,
툴체인이 뒤에서 Anthropic 과 몰래 통신하지 않길 바라는 경우.
**[`ccusage`](https://github.com/ryoppippi/ccusage) 와 병행 추천**
— 두 툴은 겹치지 않음 (claude-cat = 실시간 렌더, ccusage = 비용
분석).

> "그냥 고양이" 는 귀여운 태그라인이 아니라 threat model 입니다.

## 설치

### 빠른 설정 (추천)

인터랙티브 wizard 를 실행하세요 — 레이아웃, 고양이 테마, 리프레시 주기,
플랜을 30초 안에 설정합니다:

```bash
npx -y claude-cat@latest configure
```

`~/.claude/settings.json` 을 자동으로 수정해주며 (diff 미리보기 후 확인),
다른 키는 건드리지 않습니다. Claude Code 재시작하면 다음 턴부터 보입니다.

### 수동 설정 (프롬프트 붙여넣기)

모드 골라서 아래 프롬프트를 Claude Code 에 붙여넣으면 됩니다.

### A) ⭐ 기본 — compact, 한 줄 *(추천)*

깔리는 것: 한 줄에 사용량 바 + `$` 비용 + `ctx %`. 고양이 없음. 좁은 터미널에선 자동 줄바꿈.

```
5h ▓▓▓▓░░░░░░ 47% (1h 19m) | week ▓▓▓░░░░░░░ 31% (Fri 1pm) | $37.37 | ctx 20%
```

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- type: "command"
- command: "npx -y claude-cat@latest"
- padding: 0
- refreshInterval: 300

Don't touch any other key. Show me the diff first.
```

### B) 3줄 kawaii 고양이

깔리는 것: 3줄 카드 — 왼쪽엔 ASCII 고양이, 오른쪽엔 데이터 행. 사용량에 따라 얼굴과 소품이 바뀝니다.

```
 /\_/\    Opus 4.6  ·  $38.52  ·  ctx 23% used (77% left)
( ^ω^ )   Current session            ▓▓▓▓▓▓░░░░░░░  51% · 1h 15m
 / >🍣    Current week (all models)  ▓▓▓░░░░░░░░░░  31% · Resets Apr 17, 1pm
```

```text
Install claude-cat (https://github.com/thingineeer/claude-cat) into my
~/.claude/settings.json as the statusLine.

- type: "command"
- command: "npx -y claude-cat@latest --full --kawaii"
- padding: 0
- refreshInterval: 300

Don't touch any other key. Show me the diff first.
```

<details>
<summary>전체 모드 한눈에 보기</summary>

설치 방식은 같고 `command` 값만 바꾸면 됩니다.

<table>
<thead>
<tr><th>플래그</th><th>명령어</th><th>미리보기</th></tr>
</thead>
<tbody>
<tr>
<td><strong>⭐ (기본값)</strong></td>
<td><code>npx -y claude-cat@latest</code></td>
<td><pre>5h ▓░░░░░░░░░ 10% (3h 21m) | week ▓▓░░░░░░░░ 18% (Fri 1pm) | $0.123</pre></td>
</tr>
<tr>
<td><code>--full --kawaii</code></td>
<td><code>npx -y claude-cat@latest --full --kawaii</code></td>
<td><pre> /\_/\   Opus 4.6 · $0.123
( ^ω^ )  session  ▓░░░░░░░░░░░░░ 10% · 3h 21m
 / >🍣   week     ▓▓▓░░░░░░░░░░░ 18% · Resets Apr 17, 1pm</pre></td>
</tr>
<tr>
<td><code>--full</code></td>
<td><code>npx -y claude-cat@latest --full</code></td>
<td><pre>/ᐠ ^ᴥ^ ᐟ\  Opus 4.6 · $0.123
session  ▓░░░░░░░░░░░░░ 10% · 3h 21m
week     ▓▓▓░░░░░░░░░░░ 18% · Resets Apr 17, 1pm</pre></td>
</tr>
<tr>
<td><code>--wide</code></td>
<td><code>npx -y claude-cat@latest --wide</code></td>
<td><pre>5h ▓░░░░░░░ 10% (3h 21m) | week ▓░░░░░░░ 18% (Fri 1pm) | $0.123</pre></td>
</tr>
<tr>
<td><code>--full --no-cat</code></td>
<td><code>npx -y claude-cat@latest --full --no-cat</code></td>
<td><pre>Opus 4.6 · $0.123
session  ▓░░░░░░░░░░░░░ 10% · 3h 21m
week     ▓▓▓░░░░░░░░░░░ 18% · Resets Apr 17, 1pm</pre></td>
</tr>
</tbody>
</table>

전체 플래그/환경변수: 영문 README 참조.
`CLAUDE_CAT_PLAN=pro|max|auto` — Pro 사용자는 `pro` 설정하면 주간 bar
자동 숨김 (wizard가 자동 설정).

</details>

## 출력 읽는 법

```
5h ▓▓▓▓░░░░░░ 47% (1h 19m) | week ▓▓▓░░░░░░░ 31% (Fri 1pm) | $37.37 | ctx 20%
```

| 칩 | 의미 |
| --- | --- |
| `5h` / `week` / `sonnet` | rate-limit 창 (5시간 세션 / 주간 / 모델별 주간) |
| `▓▓▓▓░░░░░░` | 10칸 진행 바 — 초록 → 노랑 → 빨강 |
| `47%` | 정확한 퍼센트 |
| `(1h 19m)` / `(Fri 1pm)` | 리셋까지 — 세션은 상대, 주간은 절대 |
| `$37.37` | **이 세션의 누적 비용 (USD)** — 아래 설명 |
| `ctx 20%` | 현재 대화의 컨텍스트 사용률 |

### `$37.37` 이 무엇이고 — 무엇이 아닌지

**이 Claude Code 세션의 누적 비용** 입니다 (`cost.total_cost_usd`).

- ❌ 플랜 초과 "Extra usage" 요금 **아님** (다른 개념, statusLine 에 안 옴)
- ❌ 월 구독료 **아님**
- ❌ Pro/Max 면 지금 빠져나가는 돈 **아님** (정액제 — 참고용 숫자)
- ✅ **API key** 모드면 실제 비용. **Bedrock / Vertex** 에선 `$0.00` 고정

## 고양이 mood

고양이는 `--full` 모드에서만 나옵니다. 6가지 — 5개는 사용률, 1개(resting)는 상태 기반.

| 상태 | `--full` (1줄 face) | `--full --kawaii` 소품 |
| ---- | ------------------- | ---------------------- |
| 대기 중 *(resting)* | `/ᐠ -ᴥ- ᐟ\` | 🚬 담배 |
| 0–30 % *(chill)* | `/ᐠ ^ᴥ^ ᐟ\` | 🍣 초밥 |
| 30–60 % *(curious)* | `/ᐠ •ᴥ• ᐟ\` | ⌨️ 키보드 |
| 60–85 % *(alert)* | `/ᐠ ◉ᴥ◉ ᐟ\` | ☕ 커피 |
| 85–95 % *(nervous)* | `/ᐠ ⊙ᴥ⊙ ᐟ\` | 💤 휴식 |
| 95 %+ *(critical)* | `/ᐠ ✖ᴥ✖ ᐟ\` | 🛌 기절 |

## 플랜별 호환

| 플랜 | 표시 | 비고 |
| ---- | ---- | ---- |
| Claude Pro / Max | 사용률 바, 리셋 카운트다운, 고양이, 세션 비용 | `rate_limits` 는 첫 응답 이후 등장 |
| Anthropic API 키 | 세션 비용 + 고양이 | rate_limits 없음 |
| Bedrock / Vertex | 비용 `$0.00` 고정 | 상위 제약 |

## 보안

claude-cat 은 의도적으로 작고 네트워크를 타지 않습니다 — Claude Code 가
매 메시지마다 실행하는 경로니까 가볍고 안전해야 하기 때문입니다.

**하는 것** — Claude Code 가 statusLine 스크립트에 이미 흘려보내는 stdin JSON
을 읽어서 컬러 한 줄을 출력.

**안 하는 것** — 네트워크 요청 없음, 크레덴셜 읽기 없음, Keychain 접근 없음,
`~/.claude/claude-cat/` 밖으로 쓰기 없음. 불변 규칙은 [SECURITY.md](./SECURITY.md) 에.

### npm 공급망(supply chain) 관련

`npx -y claude-cat@latest` 는 최신 버전을 매번 다운받아 실행합니다. npm 에선
표준이지만 알아두면 좋은 점:

- **재현성이 필요하면 버전 고정** — `@latest` 대신 `npx -y claude-cat@1.2.4`.
  보안 어드바이저리 뜨면 업그레이드.
- **패키지 감사** — 배포된 tarball 엔 `bin/`, `src/`, `examples/`, README/LICENSE
  만 들어갑니다 (`package.json` 의 `files` 필드). 설치 전 검증 가능:
  `npm pack claude-cat && tar -tf claude-cat-*.tgz`.
- **로컬 설치 대안** — repo 를 clone 해서 statusLine 을
  `node /path/to/claude-cat/bin/cli.js` 로 연결. npm 경유 없음.

### 취약점 리포트

Private advisory 로만:
**https://github.com/thingineeer/claude-cat/security/advisories/new**

public issue 열지 말아주세요. [SECURITY.md](./SECURITY.md) 참조.

## 개발·기여

```bash
git clone https://github.com/thingineeer/claude-cat.git
cd claude-cat
git config core.hooksPath .githooks
npm run test:sample
```

기여 가이드: [CONTRIBUTING.md](./CONTRIBUTING.md).

## 라이선스

MIT © thingineeer
