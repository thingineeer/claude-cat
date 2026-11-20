# 🐾 claude-cat

<p align="left"><img src="assets/logo.svg" width="96" alt="claude-cat" /></p>

> **Claude Code 사용량 한도를 상태 표시줄에서 바로 확인하세요.** 주간 한도, Fable 주간 한도, 5시간 세션, 세션 비용, 컨텍스트 % 를 귀여운 고양이와 함께 보여줍니다. 오프라인 우선 — 기본 설정에선 네트워크를 쓰지 않습니다.

[English README →](./README.md)

[![npm version](https://img.shields.io/npm/v/claude-cat)](https://www.npmjs.com/package/claude-cat)
[![npm downloads](https://img.shields.io/npm/dm/claude-cat)](https://www.npmjs.com/package/claude-cat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![install size](https://packagephobia.com/badge?p=claude-cat)](https://packagephobia.com/result?p=claude-cat)
[![zero network](https://img.shields.io/badge/network-0%20calls%20by%20default-brightgreen)](#개인정보와-보안)
[![zero credentials](https://img.shields.io/badge/credentials-not%20read%20by%20default-brightgreen)](#개인정보와-보안)

<p align="center">
  <img src="assets/screenshots/compact.png" alt="Opus 5.5, 주간 사용량 71%, Fable 주간 사용량 100% 를 보여주는 Claude Code 상태 표시줄" width="900" />
  <br />
  <em>Claude Code 2.1.328 · Opus 5.5 · Ultra 플랜 — <code>npx -y claude-cat@latest --fable-usage</code></em>
</p>

**claude-cat** 은 Claude Code `statusLine` 으로, **사용량 한도**를 프롬프트 바로 아래에
띄워 `/usage` 를 칠 필요가 없게 해 줍니다. **주간 한도**, **Fable 주간 한도**, **5시간
세션 창**(있는 플랜만), 이 세션의 **비용**, **컨텍스트 창 %** 를 보여주고, rate limit 에
가까워질수록 바가 초록 → 노랑 → 빨강으로 바뀌며 고양이 표정도 따라 바뀝니다.

- ✅ **Claude Code 2.1.328**, **Opus 5.5**, **Fable 5.2**, Sonnet 5.5, **Ultra** 플랜(구 Max)
  최신 대응 — Pro, API 키도 지원
- ✅ 설정 없이 한 줄: `npx -y claude-cat@latest`
- ✅ 오프라인 우선 — Claude Code 가 넘겨주는 데이터만 읽고, Fable 바만 명시적 opt-in

## 빠른 시작

```bash
npx -y claude-cat@latest configure
```

wizard 가 레이아웃·고양이 테마·chip·모델별 바·리프레시 주기·플랜을 묻고, diff 를
보여준 뒤 `~/.claude/settings.json` 의 `statusLine` 만 씁니다(다른 키는 그대로).
다음 Claude Code 턴부터 보입니다.

<p align="center">
  <img src="assets/screenshots/configure-wizard.gif" alt="configure wizard 데모" width="720" />
</p>

<details>
<summary>수동 설정</summary>

`~/.claude/settings.json` 에 추가:

```json
"statusLine": {
  "type": "command",
  "command": "npx -y claude-cat@latest",
  "padding": 0,
  "refreshInterval": 300
}
```

다른 레이아웃은 `command` 뒤에 플래그를 붙입니다. 예:
`npx -y claude-cat@latest --full --kawaii`.

</details>

### 업데이트

```bash
npx -y claude-cat@latest update            # 적용
npx -y claude-cat@latest update --dry-run  # 미리보기만
```

오래된 `npx` 캐시 삭제, 전역 설치 업그레이드, `settings.json` 에 고정된
`claude-cat@x.y.z` 버전 올리기, 새 버전 미리 설치(다음 렌더가 바로 뜨도록)를 한 번에
합니다. `claude-cat --version` 은 실행 중인 버전을 출력합니다.

## 레이아웃

<p align="center"><img src="assets/screenshots/kawaii-full.png" alt="claude-cat --full --kawaii: 주간·Fable 사용량 바와 3줄 고양이 카드" width="780" /></p>

| 플래그 | 출력 |
| ------ | ---- |
| *(기본)* | 한 줄 — 모델 · 바 · `$` · `ctx` |
| `--wide` | 한 줄, 모델 chip 없이 짧은 바 |
| `--full` | 1줄 고양이 얼굴 + 창마다 한 행 |
| `--full --kawaii` | 소품을 든 3줄 ASCII 고양이 카드 |
| `--full --no-cat` | 고양이 없는 `--full` |

```text
# 기본
opus 5.5 · xhigh | week ▓▓▓▓▓▓▓░░░ 66% (Sun 10pm) | $12.34 | ctx 18%

# --wide
week ▓▓▓▓▓░░░ 66% (Sun 10pm) | $12.34 | ctx 18%

# --full --kawaii
 /\_/\    Fable 5.2 · high  ·  $12.34  ·  ctx 18% used (82% left)
( -ㅅ-)   Current week (all models) ▓▓▓▓▓▓▓▓▓░░░░░  66% · Resets Nov 22, 10pm
 / づ☕   Current week (Fable)      ▓▓▓▓▓░░░░░░░░░  34% · Resets Nov 22, 10pm
```

기본 한 줄은 좁은 터미널에서 줄바꿈되고, `--full` 은 3줄 카드를 유지합니다.
[`--fable-usage`](#fable-사용량-opt-in) 를 켜면 Fable 주간 바가 같은 줄에 붙고,
5시간 세션 창이 있는 플랜은 `5h` 바가 앞에 붙습니다:

```text
fable 5.2 · high | week ▓▓▓▓▓▓▓░░░ 66% (Sun 10pm) | fable ▓▓▓░░░░░░░ 34% (Sun 10pm) | $12.34 | ctx 18%
sonnet 5.5 · medium | 5h ▓▓▓▓▓░░░░░ 47% (1h 18m) | week ▓▓▓░░░░░░░ 31% (Sun 10pm) | $3.21 | ctx 18%
```

## 출력 읽는 법

| chip | 의미 |
| ---- | ---- |
| `opus 5.5 · xhigh` | 이 세션에서 선택한 모델과 effort level (`low` … `max`) |
| `week` | 주간 한도 (전체 모델) |
| `fable` / `opus` / `sonnet` | 모델별 주간 버킷 — `rate_limits.seven_day_<model>` 은 자동 표시 |
| `5h` | 5시간 세션 창 (있는 플랜만) |
| `spend` | Claude apps gateway 지출 한도 |
| `▓▓▓▓▓▓▓░░░ 66%` | 사용률 — 초록 → 노랑 → 빨강 |
| `(Sun 10pm)` / `(1h 18m)` | 리셋 시점 — 주간은 절대 시각, 5시간 창은 남은 시간 |
| `$12.34` | Claude Code 가 계산한 이 세션 비용 ([설명](#의-의미)) |
| `ctx 18%` | 컨텍스트 창 사용률 |

## 옵션

| 플래그 | 효과 |
| ------ | ---- |
| `--full` · `--wide` | 레이아웃 (기본: 한 줄) |
| `--kawaii` · `--no-cat` · `--cat=compact\|kawaii\|none` | `--full` 의 고양이 테마 |
| `--fable-usage` | **opt-in** — usage API 에서 Fable 주간 바를 가져옴 ([Fable 사용량](#fable-사용량-opt-in) 참조) |
| `--hide=<이름>` | chip 이름으로 바 숨김 — `--hide=opus,sonnet` 이면 `week` + `fable` 만 |
| `--no-model` · `--no-effort` | 모델 chip / effort 만 숨김 |
| `--no-cost` · `--no-ctx` | `$` / `ctx` chip 숨김 |
| `--stack=auto\|always\|never` · `--max-cols=<n>` | 한 줄 레이아웃 줄바꿈 제어 |
| `--icons=none\|emoji\|nerd` | 창 라벨 앞 아이콘 |
| `--no-debug-chip` | `CLAUDE_CAT_DEBUG` 켠 상태에서 `[Debug]` 숨김 |

| 환경변수 | 효과 |
| -------- | ---- |
| `CLAUDE_CAT_PLAN=pro\|ultra\|auto` | `pro` 는 주간 바 숨김, `ultra` / `auto` 는 전부 표시 (`max` 도 그대로 동작) |
| `CLAUDE_CAT_COLUMNS=<n>` | 감지한 터미널 폭 덮어쓰기 |
| `CLAUDE_CAT_DEBUG=1` | 받은 stdin 을 `~/.claude/claude-cat/last-stdin.json` 에 저장 |

## 플랜

| 플랜 | 표시 |
| ---- | ---- |
| **Ultra** *(구 Max)* | `week` (+ 들어오면 `fable`) — 주간 한도만, 5시간 창 없음 |
| **Pro** | `5h` + `week` |
| Claude apps gateway | `spend` + `$` |
| API 키 | `$` (실제 비용) + 쉬는 고양이 |
| Bedrock / Vertex | `$0.00` — Claude Code 가 가격을 계산 못 함 |

`rate_limits` 는 세션의 첫 응답 이후에 옵니다. 모든 터미널은 **같은 계정**의
터미널들이 본 가장 최신 값을 보여줍니다(`cswap` / `/login` 뒤엔 여러 계정 세션이 동시에
돌 수 있음). 새 세션은 가장 최근에 쓰인 계정 값을 빌려 쓰고(10분이 지나면
`stale · 14m ago` 로 흐리게), 모델 chip 은 항상 그 터미널 자신의 모델을 보여줍니다.

### stdin 필드 (Claude Code 2.1.328)

| 필드 | 용도 |
| ---- | ---- |
| `rate_limits.seven_day` | `week` |
| `rate_limits.five_hour` | `5h` — Ultra 에는 없음 |
| `rate_limits.seven_day_<model>` | 모델별 주간 바 |
| `rate_limits.spend_limit` | `spend` |
| `model.display_name` · `effort.level` | 모델 · effort chip |
| `cost.total_cost_usd` | `$` |
| `context_window.used_percentage` | `ctx` |

stdin 에 없는 것: Ultra 의 **Fable 주간 한도**(`/usage` 에는 있지만 Claude Code
2.1.328 은 `seven_day` 만 보냄)와 **Extra usage**. 둘 다 비공개 엔드포인트
`/api/oauth/usage` 에만 있습니다. Fable 은 아래 opt-in 플래그로 가져올 수 있고,
나중에 Claude Code 가 stdin 으로 보내기 시작하면 그 값이 자동으로 우선합니다.

<a id="fable-사용량-opt-in"></a>
### Fable 사용량 (opt-in)

```bash
npx -y claude-cat@latest --fable-usage
```

`week` 옆에 `fable` 바를 붙입니다. 동작과 트레이드오프:

- Claude Code **access token** 을 읽어(macOS Keychain 항목
  `Claude Code-credentials`, 없으면 `~/.claude/.credentials.json`)
  `GET https://api.anthropic.com/api/oauth/usage` 를 호출합니다 — `/usage` 팝업과
  같은 읽기 전용 요청입니다. **문서화되지 않은 엔드포인트**라 바뀌거나 없어질 수
  있고, 약관상 회색 지대입니다.
- 토큰을 **절대 갱신(refresh)하지 않습니다.** 만료됐거나 401 이면 Claude Code 가
  갱신할 때까지 건너뜁니다.
- 요청은 **분리된 백그라운드 프로세스**에서 최대 2분에 한 번, 여러 터미널에서도
  한 번에 하나만 실행되고, 오류 시 간격을 늘립니다. 상태 표시줄은 로컬 캐시만
  읽어서 네트워크를 기다리지 않습니다.
- 캐시(`~/.claude/claude-cat/fable-cache.json`)에는 Fable 퍼센트와 리셋 시각만
  저장하고, 토큰은 저장하지 않습니다.
- 계정을 바꾸면 새 계정 값이 올 때까지 바를 숨깁니다(주간 리셋 시각으로 판별).
  Keychain 에는 마지막으로 로그인한 계정만 있어서, `cswap` / `/login` 전에 켠
  터미널(예전 계정으로 도는 세션)은 재시작 전까지 `fable` 없이 `week` 만 보입니다.

Fable 이 100 % 에 가까우면 다른 주간 바처럼 고양이 mood 에도 반영됩니다. 참고용으로만
보고 싶으면 `--hide=fable` 을 쓰세요.

<a id="의-의미"></a>
### `$` 의 의미

`cost.total_cost_usd` — Claude Code 가 정가(또는
[`modelPricing`](https://code.claude.com/docs/en/settings-reference#modelpricing))로 계산한
이 세션 비용입니다. Pro/Ultra 에선 참고용 숫자일 뿐 청구액이 아니고, Extra usage
도 아닙니다. stdin 에 모델별 누적 토큰이 없어서 claude-cat 은 다시 계산하지
않습니다. 참고용 정가 (MTok 당,
[모델 개요](https://platform.claude.com/docs/ko/models/overview)):

| 모델 | 입력 | 출력 |
| ---- | ---: | ---: |
| Fable 5.2 | $8 | $40 |
| Fable 5.1 *(레거시)* | $10 | $50 |
| Opus 5.5 | $4 | $20 |
| Sonnet 5.5 | $2 | $10 |
| Haiku 5.5 | $0.10부터 | $0.50부터 |

## 고양이 mood

| mood | 조건 | `--full` | `--kawaii` 소품 |
| ---- | ---- | -------- | --------------- |
| resting | rate limit 아직 없음 | `/ᐠ -ᴥ- ᐟ\` | 🚬 |
| chill | 30 % 미만 | `/ᐠ ^ᴥ^ ᐟ\` | 🍣 |
| curious | 30 % 이상 | `/ᐠ •ᴥ• ᐟ\` | ⌨️ |
| alert | 주간 ≥ 60 % 또는 5h ≥ 75 % | `/ᐠ ◉ᴥ◉ ᐟ\` | ☕ |
| nervous | 어느 창이든 ≥ 85 % | `/ᐠ ⊙ᴥ⊙ ᐟ\` | 💤 |
| critical | 어느 창이든 ≥ 95 % | `/ᐠ ✖ᴥ✖ ᐟ\` | 🛌 |

mood 는 주간 한도가 결정합니다 — 실제로 한 주를 막는 한도이고, Ultra 에선 유일한
한도입니다. 리셋 시각이 지난 창은 0% 로 표시합니다(이미 리셋됐으므로).

<details>
<summary>3줄 kawaii 갤러리</summary>

```text
resting     chill       curious     alert       nervous     critical
 /\_/\       /\_/\       /\_/\       /\_/\       /\_/\       /\_/|
( -.-)      ( ^ω^ )     ( •ㅅ•)     ( -ㅅ-)     ( xㅅx)     ( -.-)zzZ
 / >🚬~      / >🍣       / >⌨️       / づ☕      / づ💤       /   \
```

</details>

## 자주 묻는 질문

**`/usage` 를 치지 않고 Claude Code 사용량 한도를 보려면?**
claude-cat 을 상태 표시줄로 설치하세요(`npx -y claude-cat@latest configure`). 주간 한도,
5시간 창, 세션 비용이 프롬프트 아래에 항상 떠 있고 응답마다 갱신됩니다.

**Fable 사용량(Fable 주간 한도)은 어떻게 보나요?**
`--fable-usage` 를 붙이세요. Claude Code 가 Fable 한도를 statusLine 에 넘겨주지 않아서,
`/usage` 팝업과 같은 usage API 에서 읽어 오는 opt-in 옵션입니다 —
[Fable 사용량](#fable-사용량-opt-in) 참조.

**5시간 바가 안 보여요.**
Ultra(구 Max)는 주간 한도만 있어서 Claude Code 가 `five_hour` 를 보내지 않습니다. Pro 는
`5h` 바가 그대로 나옵니다.

**Claude Max, Ultra, Pro, API 키, Bedrock 에서 되나요?**
네 — [플랜](#플랜) 참조. Ultra/Max·Pro 는 사용량 바, API 키는 실제 비용,
Bedrock/Vertex 는 고양이와 컨텍스트 % 를 보여줍니다.

**Claude Code 가 느려지지 않나요?**
아니요. 렌더링은 stdin 과 작은 로컬 캐시만 읽습니다(네트워크·의존성 로드 없음). opt-in
Fable 조회는 분리된 백그라운드 프로세스에서 최대 2분에 한 번 실행됩니다.

**ccusage 와 뭐가 다른가요?**
[ccusage](https://github.com/ryoppippi/ccusage) 는 로컬 로그로 토큰 비용을 사후 분석하고,
claude-cat 은 실시간 rate limit 사용량을 상태 표시줄에 보여줍니다. 같이 쓰면 좋습니다.

<a id="개인정보와-보안"></a>
## 개인정보와 보안

claude-cat 은 Claude Code 가 statusLine 스크립트에 이미 stdin 으로 넘겨주는
JSON 만 렌더링합니다.

- **기본은 네트워크 없음** — `api.anthropic.com`, `claude.ai`,
  `/api/oauth/usage` 모두 안 부릅니다. 명시적 예외는 둘: 직접 실행하는
  `claude-cat update`(npm registry), opt-in 플래그
  [`--fable-usage`](#fable-사용량-opt-in).
- **기본은 크레덴셜 없음** — `--fable-usage` 를 켜지 않으면
  `~/.claude/.credentials.json`, Keychain, OAuth 토큰을 읽지 않습니다(켜도
  access token 만 읽음).
- **쓰기 제한** — `~/.claude/claude-cat/`(터미널 간 캐시, opt-in 디버그 덤프)
  밖에는 쓰지 않습니다.

| | **claude-cat** | ccstatusline | claude-dashboard | ccusage |
| --- | :---: | :---: | :---: | :---: |
| 실시간 statusLine | ✅ | ✅ | ✅ | ❌ (CLI) |
| 네트워크 호출 없음 (기본) | ✅ | ❌ | ❌ | 🟡 |
| 크레덴셜 읽기 없음 (기본) | ✅ | ❌ | ❌ | ✅ |
| 고양이 mood 😺 | ✅ | ❌ | ❌ | ❌ |
| 비용 리포트 | ❌ | 🟡 | ✅ | ✅ |

과거 비용 분석은 [`ccusage`](https://github.com/ryoppippi/ccusage) 와 같이 쓰세요.

**공급망** — `npx -y claude-cat@latest` 는 매번 최신 릴리즈를 실행합니다. 재현성이
필요하면 버전을 고정(`claude-cat@1.7.0`)하거나, tarball 을 확인하거나
(`npm pack claude-cat && tar -tf claude-cat-*.tgz` — `bin/`, `src/`, `examples/`,
README, LICENSE 만 포함), statusLine 을 로컬 clone 으로 연결하세요:
`node /path/to/claude-cat/bin/cli.js`.

**취약점** — public issue 가 아닌
[security advisory](https://github.com/thingineeer/claude-cat/security/advisories/new)
로 비공개 제보해 주세요. [SECURITY.md](./SECURITY.md) 참조.

## 개발

```bash
git clone https://github.com/thingineeer/claude-cat.git
cd claude-cat
git config core.hooksPath .githooks
npm install
npm run test:ultra          # fixture 하나
./scripts/capture-all.sh    # 모든 fixture × 레이아웃 × 테마
```

Node.js 22 이상. 기여 가이드: [CONTRIBUTING.md](./CONTRIBUTING.md).

## 라이선스

MIT © thingineeer
