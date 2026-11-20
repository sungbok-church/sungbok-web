# ADR 0022: 요청 · 응답 모양 하나와 이름 방식 오류 코드

**상태**: 채택
**날짜**: 2026-11-20

## 배경

Server Action 은 `{ ok, error: '문장' }`, 공개 읽기 API 는 데이터 그대로 + `{ error: 'quota' }` 처럼 응답 모양이 제각각이었고, 오류는 한국어 문장뿐이라 화면 · 로그에서 종류를 가를 수 없었다. 사용자 요청(2026-11-20): 에러 코드를 따로 관리하고(이름 방식), 응답은 `code` · `message` · `metadata`(그 코드에 필요한 동적 값)로, 성공일 때의 모양도 통일한다. 스프링 + 리액트는 서버가 오류를 관리하고 리액트가 번역하지만, 우리는 번역이 필요 없고 Next 하나다.

## 결정

1. **모양 하나** — 성공 `{ ok: true, data?, message? }`, 실패 `{ ok: false, error: { code, message, metadata?, fields? } }`. Server Action 의 반환값과 Route Handler 의 JSON 이 같다(Route Handler 는 HTTP 상태를 더한다).
2. **서버가 문장을 완성한다** — 오류 코드 목록(`src/shared/api/errorCodes.ts`)이 코드마다 HTTP 상태 · 문장(metadata 로 채움) · 설명을 갖는다. 서버와 화면이 한 코드베이스라 번역 단계 없이 서버가 완성한 `message` 를 보내고, 화면은 그대로 보여 준다. `code` · `metadata` 는 화면이 동작을 고를 때만 본다.
3. **칸별 오류는 `fields`** — `metadata` 에 섞지 않는다(폼마다 꺼내는 방식이 같게).
4. **예상된 실패는 돌려주고, 던지는 것은 버그뿐** — Next 는 던진 오류의 문장을 운영에서 가린다(digest 만). DB 오류 원문은 서버 로그에만.
5. 코드 이름은 영문 대문자(공통코드 · enum 과 같은 규칙, ADR 0020). 표는 [architecture/api-response.md](../architecture/api-response.md), 시험이 코드와 표의 어긋남을 잡는다.

## 대안

- **화면이 문장을 만든다(code + metadata 만 보냄)**: 스프링 + 리액트의 번역 방식. 번역이 없고 같은 파일을 함께 쓰므로 이득이 없고, 서버 로그 · Route Handler 응답에 사람이 읽는 문장이 빠진다.
- **번호 방식(E1001)**: 정렬 · 분류는 쉽지만 코드만 보고 뜻을 알 수 없다. 이름 방식으로 정했다(사용자 결정).

## 영향

- 관리자 Server Action 전부, 로그인 상태, 공개 읽기 API 3개(`/api/home-video` · `/api/worship-video/library` · `/description`)와 브라우저의 `fetchJson` 이 새 모양을 쓴다.
