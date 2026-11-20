# 관리자 (`/admin`)

교회 사람이 개발자 없이 내용을 올리고 고치는 화면. 전체 설계는 [specs/2026-11-17-admin-design.md](../specs/2026-11-17-admin-design.md)(작업 패키지 A~D)이고, 이 문서는 **지금 코드에 있는 것**만 적는다.

> 배경 결정: [ADR 0008](../decisions/0008-admin-backend-vercel-supabase.md)(Vercel + Supabase, 같은 앱 `/admin`) · [ADR 0012](../decisions/0012-date-temporal-and-admin-libraries.md)(날짜·라이브러리) · [ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md)(shadcn 원본 + 색만 교체) · [ADR 0017](../decisions/0017-admin-reference-next-starter-and-tanstack-form.md)(참고 대상 · 폼은 TanStack Form · 화면 색은 의미 토큰만) · [ADR 0018](../decisions/0018-ui-primitives-base-ui.md)(UI 기반은 Base UI · shadcn 부품은 base-nova 원본)

## 지금 있는 것 (패키지 1 준비 + 패키지 A 기반)

로그인 · 권한별 메뉴 · 시스템 화면 5개가 있다. 콘텐츠 · 사이트 화면 · 새가족 화면은 아직 없다(패키지 B · C — 메뉴는 DB 에 있지만 `SCREENS_READY` 에 없어 숨겨진다).

| 주소 | 내용 | 권한 |
|---|---|---|
| `/admin/login` | 로그인. `?reason=idle`(8시간 쉬어 로그아웃) · `inactive`(꺼진 계정) 안내 | — |
| `/admin/password` | 비밀번호 바꾸기 — 첫 로그인 · 초기화 뒤에는 다른 화면으로 못 간다 | 로그인 |
| `/admin/logout` | 서버가 로그아웃시킬 때 지나가는 주소(route handler) | — |
| `/admin` | 첫 화면 — 숫자 카드 · 이번 주 할 일(주보 · 주일광고 · 처리 안 된 새가족 — 값은 패키지 B · C, 지금은 «준비 중») · 바로 가기 | 로그인 |
| `/admin/users` · `/new` · `/[id]` · `/[id]/edit` | 목록(줄 체크 켜기 · 끄기) · 계정 만들기(임시 비밀번호 한 번 · 상세로 / 계속 등록) · 상세(비밀번호 초기화 · 끄기/켜기 · 이력) · 수정(이름 · 그룹 · 부서 범위) | `users` |
| `/admin/groups` · `/new` · `/[id]` · `/[id]/edit` | 목록 · 만들기 · 상세(구성원 · 권한 표 보기 · 끄기/켜기 · 이력) · 수정 — 기본 정보와 «메뉴 × 기능» 권한을 한 번에 저장 | `groups` |
| `/admin/menus` | 관리자 메뉴의 이름 · 사용 여부 · 순서(홈페이지 탭은 패키지 D) · 화면 전체의 변경 이력 | `menus` |
| `/admin/categories` | 콘텐츠 › 분류 관리 — 왼쪽 묶음 · 오른쪽 분류(더하기 · 이름 · 사용 여부 · 순서). 영문 이름(slug)은 공개 주소용이라 바꾸지 않는다 | `categories` |
| `/admin/codes` | 시스템 › 코드 관리(공통코드) — 왼쪽 묶음 · 오른쪽 코드. 코드 값은 영문 대문자. 잠긴 묶음(콘텐츠 상태 · 새가족 구분 · 새가족 처리 상태 — enum 과 같은 값)은 이름 · 순서만([ADR 0020](../decisions/0020-codes-uppercase-and-categories-split.md)) | `codes` |
| `/admin/audit` | 전체 변경 이력(대상 · 동작 · 사람 · 기간(시작일~끝일, 한국 날짜)) — 한 건은 «자세히» 창 | `audit` |
| `/admin/없는주소` | 관리자 틀 안의 «페이지를 찾을 수 없습니다» — 권한 없는 화면도 이것(있는지조차 드러내지 않는다) | — |

### 권한 판정

- 페이지: [requirePermission(menu, action)](../../src/domains/admin/api/adminContext.server.ts) — 없으면 404. Server Action: `actionPermission` — 없으면 «권한이 없습니다» 토스트(404 를 던지지 않는다).
- 로그인한 사람의 맥락(`loadAdminContext`, 요청당 한 번): 사용자 정보 · 권한 목록(`rpc('my_permissions')`) · 왼쪽 메뉴([buildAdminNav](../../src/domains/admin/api/adminNav.ts) — 사용 중 · 조회 권한 · 화면이 있는 메뉴만). 사용자 정보가 없거나 꺼진 계정은 `/admin/logout?reason=inactive` 로 보낸다.
- **막는 것은 DB 다**(RLS · 트리거 — `supabase/schemas/schema.sql`). 화면 · 액션의 판정은 알맞은 안내를 내기 위한 것이다. 쓰기는 모두 로그인한 사람의 세션으로 한다(이력에 «누가» 가 남고 권한 올리기 방지를 DB 가 한다).
- 만능 키([adminClient.server.ts](../../src/shared/api/supabase/adminClient.server.ts), `SUPABASE_SECRET_KEY`)는 계정 만들기 · 비밀번호 초기화에만. 비밀번호 초기화는 DB 트리거가 못 막으므로 먼저 `rpc('can_manage_user')` 로 확인한다. lint 가 관리자 코드 밖의 import 를 막는다.

### 화면 틀 · 편의 기능(설계 6.10)

화면 배치는 참고 대상 `next-shadcn-dashboard-starter` 를 따른다(ADR 0017 — 2026-11-20 사용자 지적 «글만 나열돼 뭐가 뭔지 어렵다» 로 다시 맞춤).

- **왼쪽 메뉴**: 대메뉴(콘텐츠 · 사이트 화면 · 접수 · 시스템) › 세부 메뉴. 펼친 상태는 접히는 묶음(Collapsible), 아이콘만 남긴 상태는 대메뉴를 누르면 오른쪽에 세부 메뉴(DropdownMenu). 화면이 아직 없는 메뉴는 «준비 중»(누를 수 없음). 아이콘은 [MenuIcon](../../src/domains/admin/components/features/MenuIcon/index.tsx).
- **위쪽 막대**: 경로 표시(대메뉴 › 메뉴 › 새로 만들기 · 상세 › 수정 — `buildBreadcrumbs`) · 입력칸 모양의 «메뉴 찾기 ⌘K».
- **화면 머리**: [PageHeader](../../src/domains/admin/components/features/PageHeader/index.tsx) — 제목(h1, 메뉴 관리에서 바꾼 이름) · 한 줄 설명([adminScreens.ts](../../src/domains/admin/api/adminScreens.ts)) · 주요 버튼(새로 만들기 · 변경 이력).
- **흐름**: 목록 → (줄 누름) 상세 → [수정] → 저장하면 상세. 상세가 없는 목록(변경 이력)은 «자세히» 창, 목록만 있는 화면(메뉴 · 코드)은 그 자리에서 고친다.
- **목록**: [AdminTable](../../src/domains/admin/components/features/AdminList/AdminTable.tsx) — 테두리 있는 표(회색 머리) · 머리 눌러 정렬 · 줄 누르면 상세(Ctrl/⌘ 는 새 탭) · 줄 체크 일괄 처리 · 아래 «총 N건 · 10/20/50/100개씩(쿠키로 기억) · 쪽 번호». 좁은 화면은 카드. 그린 쪽의 주소 · 줄 순서를 탭 저장소에 남겨 상세의 [목록] · 이전/다음이 쓴다([listMemory](../../src/domains/admin/api/listMemory.ts)).
- **상세**: 머리에 [목록] · 이전/다음 · [수정] · (끄기 등) · [변경 이력], 아래 등록 · 수정한 사람과 시각([RecordMeta](../../src/domains/admin/components/features/Detail/RecordMeta.tsx)).
- **불러오는 중**: `(panel)/loading.tsx` 뼈대. **왼쪽 메뉴 숫자**: `AdminNavItem.badge`(값은 패키지 C).
- **엑셀 다운로드**: 메뉴의 `actions` 에 `export` 가 있고 그 권한이 있을 때만 버튼 — 지금은 새가족(패키지 C)만.
- **등록 · 수정**: 넓은 화면은 카드를 나란히(기본 정보 · 그룹/권한), 화면 아래에 붙은 막대([FormActions](../../src/domains/admin/components/features/AdminForm/index.tsx))에 취소 · 저장. 필수 칸 *, 글자 수. 그룹 권한은 «메뉴 × 기능» 표([PermissionMatrix](../../src/domains/admin/components/widgets/PermissionMatrix/index.tsx) — 상세는 보기 전용, 폼은 체크).
- **첫 화면**: 숫자 카드(권한 있는 것만) · 이번 주 할 일 · 아이콘 있는 바로 가기 카드.

- **검색 조건**: [ListToolbar](../../src/domains/admin/components/features/AdminList/ListToolbar.tsx) — 검색어(`/` 로 이동 · 최근 검색 조건 5개, 사용자별 · 로그아웃 때 지움) · 조건 · 기간 · [검색] · [초기화] · 적용된 조건 칩. 검색 · 조건 · 정렬 · 쪽 · 개수가 주소에 남는다([listQuery.ts](../../src/domains/admin/api/listQuery.ts)). 검색어는 `orIlike` 로만 필터에 넣는다(따옴표 이스케이프 — 필터 문법 끼워 넣기 방지). 개인정보 목록은 `searchInUrl: false`.
- **폼**: TanStack Form + 화면 · 액션이 같은 zod 스키마(`zodFormValidator` · `parseInput`). [useFormGuards](../../src/domains/admin/api/useFormGuards.ts) — 나가기 경고 · Ctrl/⌘+S · 쓰던 내용 임시 보관([formDraft](../../src/domains/admin/api/formDraft.ts): 사용자별 · 7일 · 저장 · 로그아웃 때 지움 · 사용자 폼은 보관 안 함).
- **동시 수정**: [updateVersioned](../../src/domains/admin/api/versionedUpdate.server.ts) — 열었을 때의 `updated_at` 이 같을 때만 고친다.
- **알림 · 확인**: 결과는 `notifyResult` 토스트(오류 원문은 [toActionError](../../src/domains/admin/api/actionResult.ts) 가 쉬운 문구로). 되돌리기 어려운 동작은 [ConfirmAction](../../src/domains/admin/components/features/ConfirmAction/index.tsx)(문구 고정).
- **이력**: 상세 화면(메뉴 · 코드는 목록 화면) 머리의 «변경 이력» 버튼 → 오른쪽 창, 한 건마다 «항목 | 이전 | 이후» 표([HistorySheet](../../src/domains/admin/components/features/HistorySheet/index.tsx), 그 메뉴의 «이력조회» 권한이 있을 때만 버튼이 보이고 서버 액션 `loadHistory` 가 다시 확인) · 전체는 `/admin/audit`(표 + «자세히» 창). 칸 · 값은 한글로([auditFormat](../../src/domains/admin/api/auditFormat.ts) · [auditLabels](../../src/domains/admin/api/auditLabels.ts) — 표에 칸을 더하면 이름표에도 더한다), id 는 이름으로, 새가족 개인정보 칸은 «(값 숨김)».
- **코드 · 분류 읽기**: 드롭다운 · 조건 · 표의 이름은 `getCodeBook()` · `getCategoryBook()`([codeBook.server.ts](../../src/shared/api/codeBook.server.ts) — 캐시 없이 그릴 때마다 DB 에서 읽고 한 요청 안에서만 중복 제거, [ADR 0023](../decisions/0023-codes-read-without-cache.md))에서 읽고 `codeOptions` · `codeLabel` · `categoryOptions`([codeBook.ts](../../src/shared/api/codeBook.ts))로 만든다. 코드 관리 · 분류 관리 화면은 고치기 위해 줄마다 판(updated_at)까지 따로 읽는다.
- **메뉴 찾기**: ⌘K · Ctrl+K 또는 위쪽 막대 «찾기»([CommandMenu](../../src/domains/admin/components/features/CommandMenu/index.tsx), shadcn `command` · cmdk — 관리자 전용).

### 보안 헤더 · 세션

- [proxy](../../src/proxy.ts) 가 `/admin` 응답마다 CSP 를 싣는다([adminCsp.ts](../../src/domains/admin/api/adminCsp.ts) — 요청마다 새 nonce, 스크립트는 nonce 를 단 것만, 연결 · 그림은 이 사이트와 Supabase 만, 틀 안에 넣기 금지).
- 마지막 요청 뒤 8시간이 지나면 proxy 가 그 세션을 Supabase 에서 끊고 로그인 화면으로 보낸다([idleSession.ts](../../src/domains/admin/api/idleSession.ts), 쿠키 `admin_last_seen` httpOnly). Supabase 의 refresh token 은 만료가 없어서 이렇게 한다.

- **틀**: [AdminShell](../../src/domains/admin/components/widgets/AdminShell/index.tsx) — **shadcn 의 sidebar 부품과 dashboard 배치를 원본 값 그대로 쓰고 색만 이 사이트 팔레트로 바꾼다**([ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md), 사용자 결정 2026-11-18). 왼쪽 메뉴(위: 교회 표시 · 가운데: 메뉴 · 아래: 로그인한 계정과 «로그아웃») + 위쪽 막대(메뉴 버튼 · 화면 제목) + 본문. 화면 제목(`h1`)은 위쪽 막대가 지금 메뉴 이름으로 그린다 — 페이지는 제목을 따로 그리지 않는다.
  - `md`(768) 이상: 왼쪽 메뉴(256px)를 아이콘만 남기고 접을 수 있다(메뉴 버튼 · 메뉴 가장자리 · Ctrl/⌘+B — 글 편집기가 들어오면 굵게 단축키와 겹치는지 본다). 접힘 상태는 쿠키 `sidebar_state` 에 남아 다음 방문 때 같은 모양으로 그린다. 그 아래 폭: 메뉴 버튼이 왼쪽 시트를 연다.
  - 부품은 [ui/sidebar](../../src/shared/components/ui/sidebar.tsx)(shadcn base-nova 원본, Base UI — 다른 곳은 파일 머리 주석의 목록뿐이다). 메뉴 항목을 링크로 그릴 때는 `render={<Link … />}` 를 쓴다. «동작 줄이기» 설정에서는 `globals.css` 가 전환을 끈다. 색은 `--sidebar-*` 의미 토큰이 B1 을 가리킨다([color-palette.md](../design/color-palette.md)).
  - 메뉴는 DB(`menus`)에서 묶음별로 그린다. 아이콘은 화면 코드가 `key` 로 고른다([AdminSidebar](../../src/domains/admin/components/widgets/AdminShell/AdminSidebar.tsx) 의 `MENU_ICONS`). 왼쪽 메뉴 아래의 계정 메뉴에 «비밀번호 바꾸기» · «로그아웃».
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
- **화면에는 아직 권한 판정이 없다**(DB 에는 있다 — 위 «Supabase 연결»). 로그인만 되면 `/admin` 에 들어간다. 그래서 **가입이 막혀 있어야 한다**: 운영 프로젝트는 대시보드(Authentication › Sign In / Providers)에서 새 사용자 가입을 끄고, 로컬은 `supabase/config.toml` 의 `[auth] enable_signup = false` 다. 계정은 권한 있는 사람이 만든다.

## Supabase 연결

| 무엇 | 위치 |
|---|---|
| 환경변수 읽기 | [env.ts](../../src/shared/api/supabase/env.ts) — `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 없으면 `null`(던지지 않는다) |
| 서버용 클라이언트 | [serverClient.server.ts](../../src/shared/api/supabase/serverClient.server.ts) — 로그인한 사람의 쿠키 세션. 요청마다 새로 만든다 |
| DB 타입 | [database.types.ts](../../src/shared/api/supabase/database.types.ts) — 자동 생성(`pnpm db:types`). 손으로 고치지 않는다 |
| DB 구조 | **정본 두 파일** — [schema.sql](../../supabase/schemas/schema.sql)(표 · 인덱스 · 권한 규칙 · 트리거) · [reference.sql](../../supabase/reference.sql)(메뉴 · 처음 그룹 · 코드 묶음 · 버킷 · 첫 관리자). `supabase/migrations/` 는 `pnpm db:sync` 가 만든다([ADR 0019](../decisions/0019-db-schema-ssot-uuid-v7.md)). 설계 전체의 표가 들어 있고, 화면은 패키지 2 부터 쓴다 |
| DB 검사 | [supabase/tests/database](../../supabase/tests/database) — `pnpm db:test`(pgTAP: RLS 켜짐 · 외래 키 인덱스 · 파일 묶음 주인 뷰 · 방문자/권한 없는 계정/다른 부서 계정의 직접 호출) · `pnpm db:advisors`(Supabase 점검, 경고 이상이면 실패) |
| enum 일치 검사 | [enumParity.test.ts](../../src/shared/api/supabase/enumParity.test.ts) — DB enum 과 화면의 TS 타입이 어긋나면 `pnpm typecheck` 가 실패한다 |

- **환경변수가 없어도 공개 사이트는 빌드되고 열린다.** `/admin` 은 로그인 화면으로 가고, 로그인 화면은 칸 대신 «관리자 로그인이 아직 설정되지 않았습니다.» 를 보여 준다.
- **프로젝트 주소와 키를 코드·문서에 적지 않는다** — 환경변수로만 받는다. 지금 운영 프로젝트는 개인 계정에 있고 나중에 교회 계정으로 옮긴다.
- 권한 판정은 DB 함수 `private.has_permission(메뉴 key, 기능)` 하나다(`private` 스키마는 API 로 열리지 않는다). 화면 · Server Action 은 `private` 을 부를 수 없으므로 `rpc('my_permissions')`(로그인한 사람의 (메뉴 key, 기능) 목록)로 받는다 — 막는 것은 여전히 RLS 다. 로그인 계정이 생기면 트리거가 `profiles` 를 만든다.
- 만능 키(secret key)는 아직 어디에서도 쓰지 않는다. 브라우저용 클라이언트도 아직 없다(처음 쓰는 곳은 파일 올리기 — 패키지 3).
- 로컬 개발(podman 으로 로컬 Supabase 띄우기 · 로컬 계정 만들기)과 운영 DB 에 변경 파일을 적용하는 절차는 [deploy-and-env.md](../workflow/deploy-and-env.md) 4절 · 6절.

## 공개 쪽과의 경계

공개 사이트 번들에 관리자 코드가 실리지 않게 lint 가 막는다([eslint.config.mjs](../../eslint.config.mjs), 테스트 [adminBoundary.test.ts](../../tests/lint/adminBoundary.test.ts)).

- `src/**` 전체에서 관리자 코드(`@/domains/admin/**` · `@/app/admin/**` · 상대 경로 `../admin/…`)와 `@tanstack/react-form` · `react-hook-form` · `@hookform/*` · `@tanstack/react-table` · `@supabase/*` 를 import 하지 못한다. 루트 레이아웃 · `_provider` · `shared/lib` 처럼 모든 공개 페이지에 실리는 파일도 대상이다.
- 예외는 관리자 자신(`src/domains/admin/**` · `src/app/admin/**` · `src/proxy.ts`)뿐이다. 연결 계층(`src/shared/api/supabase/**` — 공개 화면의 저장소 계층이 서버에서 DB 를 읽을 때 쓴다, 패키지 3 부터)은 Supabase 라이브러리만 쓸 수 있고 관리자 코드는 못 가져온다.
- `import()` · `require()` 는 이 규칙이 잡지 못한다 — 검토에서 본다.

## 아직 없는 것

설계 문서 9절의 순서대로 만든다: 콘텐츠 5종(패키지 B — 파일 올리기 통로 · 공개 화면 교체 · 기존 자료 옮기기) → 다음세대 부서 · 홈 히어로 · 새가족(C) → 홈페이지 메뉴 · 예약 작업 · 정리(D). 화면을 만들면 `adminNav.ts` 의 `SCREENS_READY` 에 메뉴 key 를 더한다.
