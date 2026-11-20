# 요청 · 응답 · 오류 코드

> 정본은 코드다 — 모양: [src/shared/api/result.ts](../../src/shared/api/result.ts), 오류 코드: [src/shared/api/errorCodes.ts](../../src/shared/api/errorCodes.ts). 결정: [ADR 0022](../decisions/0022-api-response-and-error-codes.md).
> 코드를 더하면 아래 표에도 더한다(`result.test.ts` 가 표에 빠진 코드를 잡는다).

## 요청

- **Server Action**: 인자는 객체 하나(`updateGroup({ id, updatedAt, name, … })`). 화면과 서버가 **같은 zod 스키마**로 검사한다 — 서버는 `parseInput` 으로 다시 본다(화면 검증은 우회할 수 있다).
- **Route Handler(공개 읽기 API)**: GET + 주소의 검색 조건(`?page=sunday`). 값은 정해 둔 목록에서만 받는다.

## 응답

```ts
// 성공
{ ok: true, data?: T, message?: '저장했습니다.' }   // message 는 화면이 토스트로 알린다

// 실패
{ ok: false, error: {
    code: 'CONFLICT',                        // 아래 표의 코드(영문 대문자)
    message: '다른 사람이 먼저 고쳤습니다…',   // 서버가 완성한 문장 — 화면은 그대로 보여 준다
    metadata?: { retryAfterSec: 90 },        // 그 코드에 필요한 동적 값 — 화면이 동작에 쓴다
    fields?: { name: ['이름을 넣어 주세요.'] } // 입력 칸별 문장(INVALID_INPUT 등) — 폼이 칸 밑에 붙인다
} }
```

- Server Action 은 이 객체를 **돌려준다**(던지지 않는다). Route Handler 는 같은 JSON 에 코드의 **HTTP 상태**를 붙인다(`okResponse` · `errorResponse`).
- 화면은 `message` 를 보여 주고(`notifyResult` · 폼 · 경고 상자), `code` · `metadata` 는 동작을 고를 때만 본다(예: `CONFLICT` → 새로고침 안내, `RATE_LIMITED` → 기다릴 시간). 번역 단계는 없다 — 서버와 화면이 같은 코드 목록을 쓴다.
- 브라우저의 공용 fetch(`fetchJson`)는 성공이면 `data` 를 돌려주고, 실패면 `HttpError(status, error)` 를 던진다. 재시도는 상태로 가른다(`retryTransient`).

## 던지는 것은 버그뿐

- 예상된 실패(검증 · 권한 · 중복 · 동시 수정 · 바깥 서비스 장애)는 모두 위 실패 모양으로 **돌려준다.**
- 던진 오류는 운영에서 문장이 가려지고 식별번호(digest)만 화면에 간다 — 오류 화면(`error.tsx`)과 서버 로그가 받는다. DB 오류 원문 · 표 이름은 응답에 싣지 않는다(서버 로그에만).
- DB 오류 → 코드: `toActionError`(42501 → `NO_PERMISSION` / 우리 트리거의 한글 문장이면 `NOT_ALLOWED` + 그 문장, 23505 → `DUPLICATE`, 23514 · 23503 → `NOT_ALLOWED`, 그 밖 → `INTERNAL`).

## 오류 코드

| 코드 | HTTP | 기본 문장 | 언제 · 사용자가 할 일 |
|---|---|---|---|
| `INVALID_INPUT` | 400 | 입력한 값을 확인해 주세요. | 입력 검증 실패. fields 에 칸별 문장 — 칸 밑에 보이고, 고쳐서 다시 저장한다. |
| `LOGIN_FAILED` | 401 | 이메일 또는 비밀번호가 맞지 않습니다. | 로그인 거절. 어느 쪽이 틀렸는지는 말하지 않는다(계정이 있는지 알리지 않게). |
| `NO_PERMISSION` | 403 | 권한이 없습니다. | 그 메뉴 · 기능의 권한이 없거나(화면이 열린 사이 빠짐 포함) DB 행 권한이 막음. 관리 담당자에게 권한을 요청한다. |
| `NOT_FOUND` | 404 | 찾는 항목이 없습니다. 새로고침한 뒤 다시 골라 주세요. | 고른 항목이 없거나 이미 사라짐. |
| `DUPLICATE` | 409 | 이미 있는 값입니다. | 같은 이름 · 값이 이미 있음(유일 제약). 다른 값으로 바꾼다. |
| `CONFLICT` | 409 | 다른 사람이 먼저 고쳤습니다. 새로고침한 뒤 다시 저장해 주세요. | 동시 수정 — 연 뒤에 다른 사람이 저장함(updated_at 이 다름). 새로고침해 바뀐 내용을 보고 다시 고친다. |
| `NOT_ALLOWED` | 422 | 이 값으로는 저장할 수 없습니다. | DB 규칙(트리거 · 검사)이 막음. 규칙이 준 한글 문장이 있으면 그 문장을 보낸다(예: «전체 관리» 에 한 명은 남아야 함). |
| `LOCKED_CODE` | 422 | 프로그램이 쓰는 코드 묶음이라 코드를 더하거나 끌 수 없습니다. | 잠긴 공통코드 묶음(enum 과 같은 값)에 더하기 · 끄기. 이름 · 순서만 바꾼다. |
| `RATE_LIMITED` | 429 | 잠시 뒤에 다시 시도해 주세요. | 짧은 시간에 너무 많이 보냄(새가족 접수 등). metadata.retryAfterSec 초 뒤에 다시. |
| `QUOTA_EXCEEDED` | 429 | 오늘은 영상 정보를 더 불러올 수 없습니다. 내일 다시 확인해 주세요. | 유튜브 하루 쿼터 소진. 다시 해도 같다(화면은 재시도하지 않는다). |
| `UPSTREAM_ERROR` | 502 | 영상 정보를 불러오지 못했습니다. | 유튜브가 다시 해도 같은 오류를 줌(키 · 요청 · 응답 모양). 서버 로그를 본다. |
| `SERVICE_UNAVAILABLE` | 503 | 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요. | 바깥 서비스(Supabase · 유튜브) 일시 장애 · 연결 실패. 잠시 뒤 풀린다(화면이 재시도할 수 있다). |
| `NOT_CONFIGURED` | 503 | 아직 설정되지 않았습니다. 관리 담당자에게 알려 주세요. | 서버 환경변수(Supabase 주소 · 키, 만능 키 등)가 없음. 배포 설정을 채운다. |
| `INTERNAL` | 500 | 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요. | 예상하지 못한 오류(코드 버그 · DB 내부 오류). 원문은 서버 로그에만 남긴다. |

- `message` 는 코드의 기본 문장이다. DB 규칙(트리거)이 준 한글 문장이 있으면 그 문장으로 바꿔 보낸다(`detail`). `RATE_LIMITED` 는 `metadata.retryAfterSec` 로 «1분 30초 뒤에» 처럼 채운다.
- `metadata` 에는 개인정보 · 내부 원문을 넣지 않는다(화면이 받는다).
