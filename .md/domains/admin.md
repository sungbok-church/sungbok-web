# 관리자 (`/admin`)

교회 사람이 개발자 없이 내용을 올리고 고치는 화면. 전체 설계는 [specs/2026-11-17-admin-design.md](../specs/2026-11-17-admin-design.md)(작업 패키지 8개)이고, 이 문서는 **지금 코드에 있는 것**만 적는다.

> 배경 결정: [ADR 0008](../decisions/0008-admin-backend-vercel-supabase.md)(Vercel + Supabase, 같은 앱 `/admin`) · [ADR 0012](../decisions/0012-date-temporal-and-admin-libraries.md)(날짜·라이브러리) · [ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md)(shadcn 원본 + 색만 교체) · [ADR 0017](../decisions/0017-admin-reference-next-starter-and-tanstack-form.md)(참고 대상 · 폼은 TanStack Form · 화면 색은 의미 토큰만) · [ADR 0018](../decisions/0018-ui-primitives-base-ui.md)(UI 기반은 Base UI · shadcn 부품은 base-nova 원본)

## 지금 있는 것 (패키지 1 — 준비)

로그인해서 빈 첫 화면까지 들어간다. 권한·메뉴·콘텐츠는 아직 없다.

| 주소 | 내용 | 코드 |
|---|---|---|
| `/admin/login` | 로그인(이메일 + 비밀번호) | [login/page.tsx](../../src/app/admin/login/page.tsx) · [LoginForm](../../src/domains/admin/components/widgets/LoginForm/index.tsx) |
| `/admin` | 첫 화면(임시 — 로그인한 계정만 보여 준다) | [(panel)/page.tsx](../../src/app/admin/(panel)/page.tsx) |
| `/admin/없는주소` | 관리자 틀 안의 «페이지를 찾을 수 없습니다» | [(panel)/[...rest]/page.tsx](../../src/app/admin/(panel)/[...rest]/page.tsx) · [(panel)/not-found.tsx](../../src/app/admin/(panel)/not-found.tsx) |

- **틀**: [AdminShell](../../src/domains/admin/components/widgets/AdminShell/index.tsx) — **shadcn 의 sidebar 부품과 dashboard 배치를 원본 값 그대로 쓰고 색만 이 사이트 팔레트로 바꾼다**([ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md), 사용자 결정 2026-11-18). 왼쪽 메뉴(위: 교회 표시 · 가운데: 메뉴 · 아래: 로그인한 계정과 «로그아웃») + 위쪽 막대(메뉴 버튼 · 화면 제목) + 본문. 화면 제목(`h1`)은 위쪽 막대가 지금 메뉴 이름으로 그린다 — 페이지는 제목을 따로 그리지 않는다.
  - `md`(768) 이상: 왼쪽 메뉴(256px)를 아이콘만 남기고 접을 수 있다(메뉴 버튼 · 메뉴 가장자리 · Ctrl/⌘+B — 글 편집기가 들어오면 굵게 단축키와 겹치는지 본다). 접힘 상태는 쿠키 `sidebar_state` 에 남아 다음 방문 때 같은 모양으로 그린다. 그 아래 폭: 메뉴 버튼이 왼쪽 시트를 연다.
  - 부품은 [ui/sidebar](../../src/shared/components/ui/sidebar.tsx)(shadcn base-nova 원본, Base UI — 다른 곳은 파일 머리 주석의 목록뿐이다). 메뉴 항목을 링크로 그릴 때는 `render={<Link … />}` 를 쓴다. «동작 줄이기» 설정에서는 `globals.css` 가 전환을 끈다. 색은 `--sidebar-*` 의미 토큰이 B1 을 가리킨다([color-palette.md](../design/color-palette.md)).
  - 메뉴 목록과 «지금 어느 메뉴인가» 판정은 [adminNav.ts](../../src/domains/admin/api/adminNav.ts). 메뉴는 지금 «첫 화면» 하나이고 코드에 있다 — 패키지 2 에서 DB 로 옮긴다(그때도 `key · href · label` 모양으로 넘기고, 아이콘은 화면 코드가 `key` 로 고른다 — [AdminSidebar](../../src/domains/admin/components/widgets/AdminShell/AdminSidebar.tsx) 의 `MENU_ICONS`).
  - 공개 사이트의 헤더·푸터·부드러운 스크롤은 없다(그것들은 `src/app/(site)/layout.tsx` 에만 있다).
- **폼과 안내**: 로그인 폼은 shadcn 의 `FieldGroup` · `Field` · `Alert`, 화면은 `Card` 로 짠다 — 관리자 폼의 기본 모양이다(규칙은 [.claude/skills/shadcn](../../.claude/skills/shadcn/SKILL.md), 이 프로젝트의 추가 규칙은 `CLAUDE.md` 의 «shadcn 부품 작업»). 기다리는 동안의 버튼은 `Spinner`, 없는 주소 안내는 `Empty` 를 쓴다. 전에 이 사이트가 만든 `FormField` · `EmptyState` · sonner `Toaster` 는 지웠다(각각 `Field` · `Empty` · `toast` 로 대체).
- **검색 제외**: `src/app/admin/layout.tsx` 가 관리자 전체에 `noindex, nofollow` 를 건다.
- **`(panel)` 묶음**: 로그인해야 보이는 화면은 전부 `src/app/admin/(panel)/` 아래에 둔다 — 그 레이아웃이 로그인을 확인하고 틀을 그린다. 로그인 화면만 묶음 밖이다.

## 로그인 흐름

1. `/admin/*` 요청은 [src/proxy.ts](../../src/proxy.ts) 를 지난다(매처 `/admin/:path*` 하나뿐 — 공개 페이지는 지나지 않는다). proxy 는 로그인 쿠키를 갱신하고([proxySession.server.ts](../../src/shared/api/supabase/proxySession.server.ts)), 로그인하지 않았으면 `/admin/login?next=<오던 곳>` 으로 보낸다. 로그인한 사람이 로그인 화면에 오면 `next` 로 보낸다.
2. 로그인 폼은 Server Action [signIn](../../src/domains/admin/api/authActions.ts) 을 부른다: 값 검증([loginInput.ts](../../src/domains/admin/api/loginInput.ts)) → Supabase Auth → `next` 로 이동. 실패하면 안내 문구와 적었던 이메일을 돌려준다(비밀번호는 돌려주지 않는다).
3. `(panel)` 레이아웃과 페이지는 [requireAdminUser](../../src/domains/admin/api/session.server.ts) 로 한 번 더 확인한다.
4. «로그아웃» 은 Server Action `signOut` — 세션을 끝내고 로그인 화면으로 보낸다.

지켜야 할 것:

- **서버에서 사용자 확인은 `getClaims()` 만 쓴다.** 토큰 서명을 검증한다. `getSession()` 은 쿠키를 그대로 믿으므로 서버 코드에서 쓰지 않는다(테스트가 부르지 않는지 확인한다).
- **`next` 는 `/admin` 안 경로만 받는다**([authRedirect.ts](../../src/domains/admin/api/authRedirect.ts) 의 `safeNextPath`). `https://…` · `//…` · `/\…` · `/admin/../…` · 제어 문자는 `/admin` 으로 바꾼다. 로그인 화면 자체로는 되돌리지 않는다.
- **proxy 는 첫 관문일 뿐이다.** Server Action 은 그것을 쓰는 페이지 주소로 POST 되므로, 매처 밖 페이지에서 부르면 proxy 를 지나지 않는다. 그래서 페이지와 Server Action 이 각자 `requireAdminUser` 를 부른다.
- **거절 문구는 한 가지다** — «이메일 또는 비밀번호가 맞지 않습니다.». 어느 쪽이 틀렸는지, 계정이 있는지 알려 주지 않는다. 다만 Supabase 가 응답하지 않거나(5xx · 연결 실패) 횟수 제한(429)에 걸린 것은 «로그인 서버에 연결하지 못했습니다…» 로 따로 알린다 — Supabase 는 이것들을 던지지 않고 오류 값으로 돌려준다.
- **로그아웃은 `scope: 'local'`** — 서버 응답을 기다리지 않고 이 브라우저의 쿠키부터 지운다(기본값은 서버 호출이 성공해야 지워서, 연결이 끊긴 순간에는 로그인 상태가 남는다). 같은 계정의 다른 기기는 끊지 않는다.
- **로그아웃은 메뉴 항목의 `onClick` 에서 Server Action 을 직접 부른다.** 폼으로 감싸면 메뉴가 닫히며 DOM 에서 빠진 뒤에 제출이 일어나 취소될 수 있다([UserMenu](../../src/domains/admin/components/widgets/AdminShell/UserMenu.tsx)).
- **익명 로그인 토큰은 로그인으로 치지 않는다**(`is_anonymous`).
- **패키지 1 에는 권한 판정이 없다.** 로그인만 되면 `/admin` 에 들어간다. 그래서 **가입이 막혀 있어야 한다**: 운영 프로젝트는 대시보드(Authentication › Sign In / Providers)에서 새 사용자 가입을 끄고, 로컬은 `supabase/config.toml` 의 `[auth] enable_signup = false` 다. 계정은 권한 있는 사람이 만든다.

## Supabase 연결

| 무엇 | 위치 |
|---|---|
| 환경변수 읽기 | [env.ts](../../src/shared/api/supabase/env.ts) — `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 없으면 `null`(던지지 않는다) |
| 서버용 클라이언트 | [serverClient.server.ts](../../src/shared/api/supabase/serverClient.server.ts) — 로그인한 사람의 쿠키 세션. 요청마다 새로 만든다 |
| DB 타입 | [database.types.ts](../../src/shared/api/supabase/database.types.ts) — 자동 생성(`pnpm db:types`). 손으로 고치지 않는다 |
| DB 구조 | `supabase/migrations/*.sql` — 지금은 enum 12개뿐([enums](../../supabase/migrations/20261117125644_enums.sql)). 표는 패키지 2 부터 |
| enum 일치 검사 | [enumParity.test.ts](../../src/shared/api/supabase/enumParity.test.ts) — DB enum 과 화면의 TS 타입이 어긋나면 `pnpm typecheck` 가 실패한다 |

- **환경변수가 없어도 공개 사이트는 빌드되고 열린다.** `/admin` 은 로그인 화면으로 가고, 로그인 화면은 칸 대신 «관리자 로그인이 아직 설정되지 않았습니다.» 를 보여 준다.
- **프로젝트 주소와 키를 코드·문서에 적지 않는다** — 환경변수로만 받는다. 지금 운영 프로젝트는 개인 계정에 있고 나중에 교회 계정으로 옮긴다.
- 만능 키(secret key)는 아직 어디에서도 쓰지 않는다. 브라우저용 클라이언트도 아직 없다(처음 쓰는 곳은 파일 올리기 — 패키지 3).
- 로컬 개발(podman 으로 로컬 Supabase 띄우기 · 로컬 계정 만들기)과 운영 DB 에 변경 파일을 적용하는 절차는 [deploy-and-env.md](../workflow/deploy-and-env.md) 4절 · 6절.

## 공개 쪽과의 경계

공개 사이트 번들에 관리자 코드가 실리지 않게 lint 가 막는다([eslint.config.mjs](../../eslint.config.mjs), 테스트 [adminBoundary.test.ts](../../tests/lint/adminBoundary.test.ts)).

- `src/**` 전체에서 관리자 코드(`@/domains/admin/**` · `@/app/admin/**` · 상대 경로 `../admin/…`)와 `@tanstack/react-form` · `react-hook-form` · `@hookform/*` · `@tanstack/react-table` · `@supabase/*` 를 import 하지 못한다. 루트 레이아웃 · `_provider` · `shared/lib` 처럼 모든 공개 페이지에 실리는 파일도 대상이다.
- 예외는 관리자 자신(`src/domains/admin/**` · `src/app/admin/**` · `src/proxy.ts`)뿐이다. 연결 계층(`src/shared/api/supabase/**` — 공개 화면의 저장소 계층이 서버에서 DB 를 읽을 때 쓴다, 패키지 3 부터)은 Supabase 라이브러리만 쓸 수 있고 관리자 코드는 못 가져온다.
- `import()` · `require()` 는 이 규칙이 잡지 못한다 — 검토에서 본다.

## 아직 없는 것

설계 문서의 9절 순서대로 만든다: 사용자·그룹·권한·메뉴·공통코드·변경 이력(패키지 2) → 주보(3) → 나머지 콘텐츠(4) → 다음세대 부서·홈 히어로(5) → 새가족(6) → 홈페이지 메뉴(7) → 정리(8).
