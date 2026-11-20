# 관리자 패키지 A(기반) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (사용자 결정: 짧은 계획 → 바로 구현). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사람이 자기 권한대로 메뉴를 보고, 시스템 화면 5개(사용자 · 그룹/권한 · 메뉴 관리 · 코드 관리 · 변경 이력)를 쓸 수 있다. 콘텐츠 화면(패키지 B)이 그대로 얹을 목록/등록/수정 틀이 생긴다.

**Architecture:** DB(권한 · RLS · 트리거)는 `supabase/schemas/schema.sql` 에 이미 있다. 화면은 서버 컴포넌트가 로그인한 사람의 세션으로 읽고, 쓰기는 Server Action(zod → 권한 확인 → 로그인 세션으로 DB → 토스트). 권한 목록은 `rpc('my_permissions')` 한 번으로 받아 메뉴 · 버튼을 그린다(막는 것은 RLS).

**Tech Stack:** Next 16.4.5 App Router · `@supabase/ssr` · TanStack Form + zod 4 · shadcn base-nova(Base UI) 원본 부품 · vitest · pgTAP

**Spec:** [2026-11-17-admin-design.md](2026-11-17-admin-design.md) — 4 · 6.1 · 6.4 · 6.5 · 6.7 · 6.10(알림 · 확인 · 편의 기능 · 보안 헤더 · 세션 길이) · 11 · 12

## Global Constraints

- 관리자 부품은 shadcn 스킬 규칙대로: 폼 `FieldGroup`+`Field`, 안내 `Alert`, 빈 목록 `Empty`, 알림 `toast`, 기다림 `Spinner`, 확인 `alert-dialog`, 링크 버튼 `render`(+`nativeButton={false}`), 부품 색 · 글자 덮어쓰기 금지, 부품 안 아이콘 크기 금지. 부품은 `--dry-run` → `--view` 로 보고 받는다.
- 서버에서 사용자 확인은 `getClaims()` 만. 페이지와 Server Action 이 각자 권한을 확인한다(proxy 는 첫 관문).
- 만능 키(`SUPABASE_SECRET_KEY`, 서버 전용)는 **계정 만들기 · 비밀번호 초기화**에만. 그 밖의 쓰기는 로그인 세션.
- 오류 화면에 DB 오류 원문을 보이지 않는다(우리 트리거의 한글 문구만 그대로).
- 검색어를 PostgREST 필터 문자열에 이어 붙이지 않는다(`.or(\`…${q}…\`)` 금지) — 빌더 메서드(`.ilike(col, …)`)만.
- 로직 모듈(camelCase `.ts`)은 테스트 먼저(RED → GREEN).
- 쓰던 내용 임시 보관: 사용자별 · 로그아웃 · 저장 성공 때 지움 · 7일 만료 · 사용자(비밀번호) 폼은 보관 안 함.
- 주소에 목록 상태(검색 · 필터 · 정렬 · 페이지)를 남긴다 — 페이지 크기 20.
- **내가 정한 값(계획에서 확인)**: 오래 쓰지 않으면 로그아웃 = **마지막 요청 뒤 8시간**. 임시 비밀번호 = 12자(헷갈리는 글자 0/O/1/l/I 제외). 새 비밀번호 최소 8자. `@tanstack/react-table` 은 이번에 넣지 않는다(정렬 · 페이지는 서버가 주소로 처리 — 열 숨기기 같은 표 기능이 필요해질 때 넣는다).

## Review Focus

1. 권한을 뺀 사람이 열려 있던 화면에서 저장 → Server Action 이 거절하고 토스트로 «권한이 없습니다».
2. 두 사람이 같은 그룹/코드를 동시에 고침 → 나중 사람에게 «다른 사람이 먼저 고쳤습니다», 덮어쓰지 않음.
3. 첫 로그인(`must_change_password`) 계정이 다른 관리자 주소를 직접 침 → 비밀번호 변경 화면으로.
4. 8시간 넘게 쉰 뒤 아무 관리자 주소 → 로그인 화면 + «오래 사용하지 않아 로그아웃했습니다», 그 세션의 refresh token 도 끊김.
5. «전체 관리» 가 아닌 사용자 관리자가 «전체 관리» 구성원의 비밀번호를 초기화 → 거절(만능 키 경로라 DB 가 못 막는다 — 서버가 `can_manage_user` 로 확인).

---

### Task 1: 권한 맥락 · DB 메뉴 · 페이지 가드

**Files:** Create `src/domains/admin/api/adminContext.server.ts`, `src/domains/admin/api/adminNav.ts`(고침) + test · Modify `src/app/admin/(panel)/layout.tsx`, `AdminShell/*`

**Interfaces — Produces:**
- `type Permission = { menuKey: string; action: PermissionAction }`; `can(perms: Permission[], menuKey: string, action: PermissionAction): boolean`
- `type AdminNavGroup = { key: string; label: string; items: AdminNavItem[] }`
- `buildAdminNav(menus: MenuRow[], perms: Permission[]): AdminNavGroup[]` — `MenuRow = { id, key, parentId, label, defaultLabel, path, sort, isActive }`. 규칙: 사용 중 · 조회 권한(`read`) 있는 화면만, 첫 화면(`dashboard`)은 늘 보임, 비는 묶음은 뺌, `sort` 순, 이름은 `label ?? defaultLabel`.
- `loadAdminContext(): Promise<AdminContext>` (`cache()` — 한 요청에 한 번) = `{ user: AdminUser; profile: { name; mustChangePassword }; permissions: Permission[]; nav: AdminNavGroup[] }`
- `requirePermission(menuKey, action): Promise<AdminContext>` — 없으면 `notFound()`(메뉴가 있는지조차 드러내지 않는다, 설계 6.4).

- [ ] 테스트: `buildAdminNav` — 권한 없는 메뉴 숨김 · 꺼진 메뉴 숨김 · 빈 묶음 숨김 · label 덮어쓰기 · 정렬 · dashboard 는 권한 없이도. `can` — 있는/없는 경우. `activeNavItem` 기존 테스트 유지(그룹을 펼친 목록으로).
- [ ] RED 확인 → 구현 → GREEN.
- [ ] `(panel)/layout.tsx`: `loadAdminContext()`, `mustChangePassword` 면 `redirect('/admin/password')`. `AdminSidebar` 가 그룹(`SidebarGroup` + `SidebarGroupLabel`)으로 그리고 `MENU_ICONS` 에 14개 key 아이콘.
- [ ] `pnpm typecheck && pnpm test`.

### Task 2: Server Action 결과 · 오류 문구 · 동시 수정

**Files:** Create `src/domains/admin/api/actionResult.ts` + test, `src/domains/admin/api/versionedUpdate.server.ts` + test

**Interfaces — Produces:**
- `type ActionResult<T = void> = { ok: true; data?: T; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`
- `toActionError(e: { code?: string; message?: string } | null): string` — `42501` → 우리 한글 문구가 있으면 그대로, 없으면 «권한이 없습니다». `23505` → «이미 있는 값입니다». `23514`/`23503` → 한글 문구면 그대로, 아니면 «입력한 값을 저장할 수 없습니다». 그 밖 → «저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.» 한글 판정 = `/[가-힣]/`.
- `CONFLICT_MESSAGE = '다른 사람이 먼저 고쳤습니다. 새로고침한 뒤 다시 저장해 주세요.'`
- `updateVersioned(client, table, id, expectedUpdatedAt, patch): Promise<ActionResult<{ updatedAt: string }>>` — `.update(patch).eq('id', id).eq('updated_at', expectedUpdatedAt).select('updated_at')`; 0줄이면 `CONFLICT_MESSAGE`.

- [ ] 테스트: 코드별 문구 6가지(영문 원문이 새지 않음 포함), `updateVersioned` 가짜 클라이언트로 0줄 → 충돌, 1줄 → ok.
- [ ] RED → 구현 → GREEN.

### Task 3: 알림 · 확인 창

**Files:** Add shadcn `alert-dialog`(원본, 머리 주석) · Create `src/domains/admin/components/features/ConfirmAction/index.tsx` · Modify `(panel)/layout.tsx`(`<Toaster />`)

**Interfaces — Produces:** `<ConfirmAction kind="trash" | "purge" | "unpublish" | "deactivate" trigger={ReactNode} onConfirm={() => Promise<ActionResult>} />` — 문구 고정(설계 6.10): trash «휴지통으로 보낼까요? 30일 안에 복구할 수 있습니다.», purge «완전히 지울까요? 되돌릴 수 없습니다.»(위험 버튼), unpublish «사이트에서 사라집니다. 임시저장으로 바꿀까요?», deactivate «끄면 로그인 · 선택 목록에서 빠집니다. 끌까요?». 결과는 `toast` 로.

- [ ] `pnpm dlx shadcn@latest add alert-dialog --dry-run` → `--view` → 받기. design-lint 통과 확인.
- [ ] 구현 · 첫 화면에 임시로 붙여 눈으로 확인 후 뺀다.

### Task 4: 목록 틀(주소에 상태)

**Files:** Create `src/domains/admin/api/listQuery.ts` + test · `src/domains/admin/components/features/AdminList/{index,ListToolbar,ListPagination}.tsx`

**Interfaces — Produces:**
- `parseListQuery(sp: Record<string, string | string[] | undefined>, spec: ListSpec): ListQuery` — `ListSpec = { sorts: string[]; defaultSort: string; filters: Record<string, readonly string[]>; searchInUrl?: boolean }`; `ListQuery = { q: string; page: number; sort: string; dir: 'asc'|'desc'; filters: Record<string,string>; trash: boolean }`. 틀린 값은 기본값으로(던지지 않는다). page ≥ 1, q ≤ 100자.
- `listQueryHref(pathname, query, patch): string` — 기본값은 주소에서 뺀다. `searchInUrl: false` 면 `q` 를 넣지 않는다(새가족).
- `rangeOf(page): [from, to]` (PAGE_SIZE 20).
- `<AdminList>`: `ResponsiveList` + 위 막대(GET 폼 검색 · 필터 Select · «삭제된 항목» 스위치는 `trashable` 일 때) + 아래 `Pagination` + 빈 목록 `Empty`(«첫 ○○ 등록하기» 링크).

- [ ] 테스트: 기본값 · 틀린 값 정리 · href 왕복 · 새가족 q 제외 · 범위.
- [ ] RED → 구현 → GREEN.

### Task 5: 폼 틀(임시 보관 · 단축키 · 나가기 경고)

**Files:** `pnpm add @tanstack/react-form` · Create `src/domains/admin/api/formDraft.ts` + test · `src/domains/admin/components/features/AdminForm/index.tsx` · Modify `UserMenu`(로그아웃 전 임시 보관 지움)

**Interfaces — Produces:**
- `draftKey(userId, formKey)` = `admin-draft:${userId}:${formKey}`; `readDraft<T>(storage, key, now): T | null`(7일 지난 것 · 깨진 값은 지우고 null); `writeDraft(storage, key, values, now)`; `clearDrafts(storage, userId)`. storage 는 `Pick<Storage, 'getItem'|'setItem'|'removeItem'|'key'|'length'>`(try/catch — 막힌 브라우저에서도 폼은 동작).
- `<AdminForm schema defaultValues formKey userId draft={boolean} action={(values) => Promise<ActionResult>} onSaved?>` — TanStack Form + zod 칸 오류, 바뀌었으면 `beforeunload` 경고, Ctrl/⌘+S 저장, 저장 중 `Spinner`, 결과 `toast`, 저장 성공 시 임시 보관 지움, 다시 열 때 임시 보관이 있으면 `Alert` 로 «쓰던 내용이 있습니다 [불러오기] [버리기]».

- [ ] 테스트: key 모양, 7일 만료, 깨진 JSON, 사용자별 지우기(다른 사용자 것은 남음).
- [ ] RED → 구현 → GREEN.

### Task 6: CSP · 오래 쓰지 않으면 로그아웃

**Files:** Create `src/domains/admin/api/adminCsp.ts` + test, `src/domains/admin/api/idleSession.ts` + test · Modify `src/proxy.ts`, `proxySession.server.ts`, `LoginForm`(«오래 사용하지 않아…» 안내)

**Interfaces — Produces:**
- `buildAdminCsp({ nonce, supabaseUrl, isDev }): string` — `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'(+dev 'unsafe-eval'); style-src 'self' 'unsafe-inline'`(Base UI 가 style 속성을 쓴다)`; img-src 'self' blob: data: <supabase>; connect-src 'self' <supabase>; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- `IDLE_LIMIT_MS = 8 * 60 * 60 * 1000`; `isIdle(lastSeen: string | undefined, now: number): boolean`(값이 없으면 false — 막 로그인한 경우). 쿠키 `admin_last_seen`(httpOnly · sameSite lax · secure · path /admin).
- proxy: 로그인 상태에서 idle 이면 `supabase.auth.signOut({ scope: 'local' })` 로 그 세션을 끊고 `/admin/login?reason=idle`. 아니면 `admin_last_seen` 갱신. 모든 `/admin` 응답에 CSP(요청 헤더에도 — Next 가 nonce 를 스크립트에 단다).

- [ ] 테스트: CSP 문자열(개발/운영 차이, Supabase 주소 포함, 줄바꿈 없음), isIdle 경계(8시간 정각 = idle 아님, 초과 = idle, 깨진 값 = idle).
- [ ] RED → 구현 → GREEN. 로컬에서 콘솔에 CSP 위반이 없는지 agent-browser 로 확인(로그인 · 메뉴 · 시트 · 토스트).

### Task 7: 비밀번호 변경(첫 로그인 강제)

**Files:** Create `src/app/admin/password/page.tsx`, `src/domains/admin/api/passwordActions.ts`(+ `passwordInput.ts` + test), `src/domains/admin/components/widgets/PasswordForm/index.tsx`

**Interfaces — Produces:** `passwordInputSchema`(새 비밀번호 8~72자, 확인 일치). `changePassword(prev, formData): Promise<ActionResult>` — `requireAdminUser` → `auth.updateUser({ password })` → `profiles.must_change_password = false`(자기 행, DB 가 허용) → `/admin`. 사이드바 사용자 메뉴에 «비밀번호 바꾸기». 이 폼은 임시 보관하지 않는다.

- [ ] 테스트(입력 검증) RED → GREEN. 로컬: `must_change_password = true` 계정으로 `/admin/users` 직접 → `/admin/password` 로 가는지.

### Task 8: 사용자 화면 + 만능 키

**Files:** Create `src/shared/api/supabase/adminClient.server.ts`(`SUPABASE_SECRET_KEY`, `server-only`, 없으면 null) · `src/domains/admin/api/tempPassword.ts` + test · `src/domains/admin/api/userActions.ts` · `src/domains/admin/api/userInput.ts` + test · `src/app/admin/(panel)/users/{page,new/page,[id]/page}.tsx` · widgets `UserList` · `UserForm` · `TempPasswordDialog` · Modify `schema.sql`(+`public.can_manage_user(p_target uuid) returns boolean` — 대상이 «전체 관리» 구성원이면 «전체 관리» 만 true, 자기 자신이면 false; authenticated 실행) + pgTAP · `eslint.config.mjs`(adminClient 는 `src/domains/admin/**` 에서만 import)

**Interfaces — Produces:**
- `generateTempPassword(random = crypto.getRandomValues): string` — 12자, 영대 · 영소 · 숫자 각 1자 이상, `0 O 1 l I` 없음.
- `createUser({ name, email, groupIds, department })`: `requirePermission('users','create')` → 만능 키로 `auth.admin.createUser({ email, password: temp, email_confirm: true, user_metadata: { name } })` → **로그인 세션으로** 그룹 · 부서 넣기(DB 가 권한 올리기를 막는다) → 실패하면 만능 키로 profile · 계정 지우기 → `{ ok, data: { tempPassword } }`(한 번만 보여 준다).
- `resetPassword(userId)`: `requirePermission('users','update')` + `rpc('can_manage_user')` → 만능 키로 새 임시 비밀번호 + `must_change_password = true`.
- `updateUser(id, expectedUpdatedAt, { name, department, isActive, groupIds })` — 로그인 세션, `updateVersioned` + 그룹 차이만 넣고 빼기.
- 화면: 목록(이름 · 이메일 · 그룹 · 부서 · 사용 여부, 검색 · 그룹 필터), 등록(→ 임시 비밀번호 창: 복사 버튼, «이 창을 닫으면 다시 볼 수 없습니다»), 수정(+ 끄기 `ConfirmAction kind="deactivate"`, 비밀번호 초기화, 이력 패널).

- [ ] 테스트: 임시 비밀번호 규칙(가짜 난수로 고정), 입력 검증. pgTAP: `can_manage_user`. RED → GREEN. `pnpm db:sync` → `db:reset` → `db:types` → `db:test` → `db:probe`.
- [ ] 로컬 e2e: 계정 만들기 → 그 계정으로 로그인 → 비밀번호 변경 강제 → 메뉴가 그룹 권한대로.

### Task 9: 그룹 · 권한 화면

**Files:** `src/domains/admin/api/permissionMatrix.ts` + test · `groupActions.ts` · `groupInput.ts` + test · `src/app/admin/(panel)/groups/{page,new/page,[id]/page}.tsx` · widgets `GroupList` · `GroupForm` · `PermissionMatrix`

**Interfaces — Produces:**
- `buildMatrix(menus: MenuRow[] & { actions }, granted: Permission[], mine: Permission[], isFullAdmin): MatrixRow[]` — 행 = 화면 메뉴, 칸 = 그 메뉴의 기능만, `disabled` = 내가 없는 권한(전체 관리는 모두 가능).
- `diffPermissions(before: Permission[], after: Permission[]): { add: Permission[]; remove: Permission[] }`.
- 시스템 그룹은 표 대신 «모든 권한» 안내(`Alert`). 저장은 차이만 넣고 빼기(로그인 세션 — DB 가 «자기 권한만» 을 다시 막는다).

- [ ] 테스트: 기능 없는 칸 없음, disabled 규칙, diff. RED → GREEN.

### Task 10: 메뉴 관리(관리자 탭) · 코드 관리

**Files:** `menuActions.ts` · `codeActions.ts` · `codeInput.ts` + test · `src/domains/admin/api/reorder.ts` + test · `src/app/admin/(panel)/{menus,codes}/page.tsx` · widgets `MenuTree` · `CodeTable`

**Interfaces — Produces:**
- `moveItem<T extends { id; sort }>(items: T[], id, dir: 'up'|'down'): { id; sort }[]` — 바뀐 두 줄만 돌려준다(끝에서는 빈 배열).
- 메뉴: 묶음별 표 — 이름(빈 값 = 기본 이름으로), 사용 스위치(잠긴 메뉴는 꺼진 상태로 막고 툴팁 «끌 수 없는 메뉴»), 위/아래. 홈페이지 탭은 패키지 D(지금은 탭을 그리지 않는다).
- 코드: 묶음 `Select`(주소 `?group=`) → 표(코드 · 이름 · 사용 · 위/아래) + 추가 행. `code` 는 영문 소문자 · 숫자 · `-`/`_`(DB check 와 같게).

- [ ] 테스트: moveItem 경계, codeInput. RED → GREEN.

### Task 11: 변경 이력 화면 · 이력 패널

**Files:** `src/domains/admin/api/auditFormat.ts` + test · `auditLabels.ts`(표 · 칸의 한글 이름) · `src/app/admin/(panel)/audit/page.tsx` · widgets `AuditTable` · `HistoryPanel`

**Interfaces — Produces:**
- `formatChanges(row: { action; changes; table_name }): { field: string; before: string; after: string }[]` — 칸 이름은 `auditLabels`(없으면 원래 이름), `null`(개인정보) → «(값 숨김)», 등록 = «→ 값», 삭제 = «값 →», 엑셀 = «N건 내려받음».
- `<HistoryPanel table rowId />`(서버 컴포넌트): 그 행 + `parent_table/parent_id` 로 묶인 딸린 행, 최신 20개 · 더 보기. 사용자 · 그룹 수정 화면에 붙인다(`history` 권한일 때만).
- 전체 이력: 표 · 사람 · 기간 필터, 주소에 상태.

- [ ] 테스트: 수정/등록/삭제/엑셀/값 숨김 형식. RED → GREEN.

### Task 12: 첫 화면 · ⌘K

**Files:** Modify `(panel)/page.tsx` · add shadcn `command`(+ dialog) · `src/domains/admin/components/features/CommandMenu/index.tsx`

- 첫 화면: 지금은 «바로 가기» 카드(권한 있는 메뉴) — 할 일 카드는 패키지 B/C 에서 채운다.
- ⌘K / Ctrl+K: 권한 있는 메뉴 이름으로 이동(글 검색은 패키지 B).

- [ ] shadcn `command` dry-run → view → 받기. 단축키가 입력칸 안에서는 동작하지 않게.

### Task 13: 검증 · 문서 · 운영 적용 준비

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm design:lint` · `pnpm db:test && pnpm db:advisors && pnpm db:probe`.
- [ ] agent-browser 로컬 e2e(375 · 1280): 전체 관리 · 콘텐츠 담당 · 권한 없음 계정으로 Review Focus 1~5.
- [ ] `/code-review high` 한 번(리뷰 상한 2번).
- [ ] 문서: `.md/domains/admin.md`(지금 있는 것), `deploy-and-env.md`(`SUPABASE_SECRET_KEY` Secret · Vercel 동기화), 설계 문서 상태.
- [ ] **사용자 승인 후**: 운영 로그인 계정 수 확인(첫 관리자 조건) → Secrets 에 `SUPABASE_SECRET_KEY` 등록 · Vercel 동기화 → Apply DB migrations(미리 보기 → 적용) → 커밋 · 배포.
