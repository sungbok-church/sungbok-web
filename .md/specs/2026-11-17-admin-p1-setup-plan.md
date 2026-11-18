# 관리자 패키지 1(준비) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 사이트를 건드리지 않고 `/admin` 에 로그인해 빈 첫 화면까지 들어갈 수 있게 하고, DB 구조를 레포의 변경 파일로 관리하는 체계를 세운다.

**Architecture:** 공개 라우트를 `(site)` 묶음으로 옮겨 헤더·푸터를 그 레이아웃으로 내리고, `/admin` 은 자기 레이아웃을 갖는다. 로그인은 Supabase Auth(이메일+비밀번호)이고 `src/proxy.ts` 가 `/admin/*` 에서만 세션을 갱신·검사한다. DB 구조는 `supabase/migrations/*.sql` 로만 바꾸고 TS 타입을 거기서 만든다.

**Tech Stack:** Next 16.4.5(App Router · `proxy.ts`) · `@supabase/supabase-js` · `@supabase/ssr` · Supabase CLI(devDependency, 로컬 스택은 podman) · zod · vitest

**Spec:** [.md/specs/2026-11-17-admin-design.md](2026-11-17-admin-design.md) — 9절 표의 순서 1(준비). 그룹·권한·메뉴·콘텐츠는 이 계획의 범위가 아니다(패키지 2 이후).

## Global Constraints

- **git**: 스테이징·커밋·푸시는 사용자가 지시할 때만 한다(`CLAUDE.md`). 이 계획의 태스크에는 커밋 단계가 없다 — 태스크가 끝나면 바뀐 것을 보고하고 멈춘다. 파일을 옮길 때 `git mv` 를 쓰지 않는다(스테이징된다) — `mv` 를 쓴다. 커밋할 때는 `git-commit-jwkim` 스킬을 따른다.
- **Next 16**: 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 해당 문서를 읽는다(`AGENTS.md`). 미들웨어 파일은 `src/proxy.ts`, 내보내는 함수 이름은 `proxy` 다.
- **Supabase 가이드**: 클라이언트·proxy 코드는 공식 가이드(`https://supabase.com/docs/guides/auth/server-side/nextjs?router=app`)의 지금 코드를 따른다. 서버에서 사용자 확인은 `supabase.auth.getClaims()` 만 쓴다 — `getSession()` 을 서버 코드에서 믿지 않는다.
- **환경변수 이름**: `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 만능 키(secret key)는 이 패키지에서 쓰지 않는다. 키와 프로젝트 주소를 코드·문서·로그·대화에 적지 않는다(주소는 환경변수로만).
- **TDD**: 로직 모듈(camelCase `.ts` · `*.server.ts`)은 실패하는 테스트를 먼저 쓰고 `pnpm test` 로 실패를 본 뒤 구현한다. 형제 테스트가 없으면 `.claude/hooks/tdd-guard.sh` 가 파일 생성을 막는다. PascalCase 부품과 `src/app/**` 은 대상이 아니다.
- **디자인**: 색·글자·반경은 토큰 유틸만(`bg-b1-*`, `text-label` 등), HEX 하드코딩 금지. 관리자는 같은 색·폰트에 더 촘촘하게, 브랜드 색은 주요 동작에만, 연출 모션 없음. 1024 미만에서 터치 영역 44px 이상, 한글 최소 13px, 포커스 표시. 문구는 사실 진술.
- **공개 사이트 불변**: 공개 페이지의 주소·화면·정적 생성 여부가 바뀌지 않는다.
- **포맷**: `prettier --write` 는 바꾼 파일에만 돌린다.
- **응답 언어**: 사용자에게는 한국어로만 말한다.

## Review Focus

테스트가 없으면 빠뜨리기 쉬운 것 다섯 가지. 각 항목의 검사는 괄호 안 태스크에 들어 있다.

1. **가입이 열려 있다** — 이 패키지에는 권한 판정이 없어 로그인만 되면 `/admin` 에 들어간다. 공개용 키로 누구나 가입할 수 있으면 관리자가 열린다. 가입 요청은 거부돼야 한다(태스크 8).
2. **로그인 뒤 엉뚱한 곳으로 보낸다** — `?next=https://evil.example` · `//evil.example` · `/\evil.example` · `/admin/../` 같은 값이 와도 `/admin` 안으로만 보낸다(태스크 4).
3. **환경변수가 없는 배포** — Supabase 값이 없는 로컬·미리보기에서도 공개 사이트는 빌드되고 열린다. `/admin` 은 오류 화면이 아니라 로그인 화면의 «설정되지 않았습니다» 안내로 간다(태스크 2 · 5 · 8).
4. **위조·만료된 쿠키** — 아무 글자나 넣은 로그인 쿠키로 `/admin` 을 열면 로그인 화면으로 간다(태스크 5 · 8).
5. **공개 페이지가 동적으로 바뀐다** — `proxy.ts` 나 레이아웃 변경 때문에 정적이던 공개 페이지가 요청마다 그려지면 안 된다. 빌드 결과의 라우트 표(○ · ● · ƒ 표시)가 옮기기 전과 같아야 한다(태스크 1 · 8).

---

## 사용자가 미리 해 둘 것

개발은 로컬 DB(podman)에서 하므로 **시작하는 데 필요한 것은 없다.** 아래는 운영 프로젝트에 붙여 확인하는 태스크 8 과 배포 전에 필요하다. 값을 대화에 붙여 넣지 않는다 — 구현하는 쪽은 이 값들을 읽어 쓰기만 하고 출력하지 않는다.

1. `.env.production.local`(커밋되지 않는다)에 운영 프로젝트의 두 줄을 넣는다: `NEXT_PUBLIC_SUPABASE_URL=…` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…`(대시보드 › Project Settings › API Keys).
2. Supabase 대시보드 › Authentication › Sign In / Providers 에서 **새 사용자 가입 허용을 끈다**. Email 로그인은 켜 둔다.
3. Authentication › Users 에서 본인 계정(이메일 + 비밀번호)을 하나 만든다 — 운영에서 첫 로그인 확인용.
4. GitHub 레포 Secrets 에 등록한다: `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(등록 뒤 «Sync env to Vercel» 을 각각 실행) · `SUPABASE_ACCESS_TOKEN` · `SUPABASE_DB_PASSWORD` · `SUPABASE_PROJECT_ID`(뒤 셋은 DB 변경 적용용이라 Vercel 로 보내지 않는다).

**개발용 DB**: 로컬 Supabase 를 podman 으로 띄운다(이 PC 는 `DOCKER_HOST` 가 podman 소켓을 가리키고 podman machine 이 켜져 있다 — 메모리 3GiB). `.env.local` 에는 로컬 스택의 주소와 키가 들어간다. 운영 프로젝트는 개발 중에 건드리지 않고, 변경 파일은 머지 뒤 워크플로우로 적용한다.

---

## 파일 구조

```
src/app/layout.tsx                       [수정] html·body·폰트·globals.css·SpeedInsights 만
src/app/not-found.tsx                    [신규] 어디에도 없는 주소 — 사이트 틀로 감싼 안내
src/app/(site)/layout.tsx                [신규] AppProvider + Header + main + Footer
src/app/(site)/not-found.tsx             [신규] 공개 페이지가 notFound() 를 부를 때
src/app/(site)/…                         [이동] page.tsx · page.test.tsx · about · design · location · news
                                                · next-generation · plan · resources · worship
src/app/admin/layout.tsx                 [신규] noindex
src/app/admin/login/page.tsx             [신규]
src/app/admin/(panel)/layout.tsx         [신규] 로그인 확인 + AdminShell
src/app/admin/(panel)/page.tsx           [신규] 첫 화면(임시)
src/proxy.ts · src/proxy.test.ts         [신규] /admin/* 세션 갱신·검사

src/shared/api/supabase/env.ts (+test)                    환경변수 읽기
src/shared/api/supabase/serverClient.server.ts (+test)    서버용 클라이언트
src/shared/api/supabase/proxySession.server.ts (+test)    proxy 에서 세션 갱신
src/shared/api/supabase/database.types.ts                 자동 생성(손으로 고치지 않는다)
src/shared/api/supabase/enumParity.test.ts                DB enum ↔ TS 타입 일치
src/shared/components/features/NotFoundMessage/index.tsx  404 안내 문구

src/domains/admin/api/authRedirect.ts (+test)      어디로 보낼지(순수)
src/domains/admin/api/loginInput.ts (+test)        로그인 값 검증(zod)
src/domains/admin/api/session.server.ts (+test)    로그인한 사람 읽기
src/domains/admin/api/authActions.ts (+test)       로그인·로그아웃 Server Action
src/domains/admin/components/widgets/LoginForm/index.tsx
src/domains/admin/components/widgets/AdminShell/index.tsx

supabase/config.toml · supabase/migrations/<시각>_enums.sql
scripts/dev-admin-user.mjs                         [신규] 로컬 DB 전용 계정 만들기(운영 주소면 거부)
.github/workflows/apply-db-migrations.yml          [신규]
.github/workflows/sync-vercel-env.yml              [수정] 제어용 이름 거부 목록
tests/lint/adminBoundary.test.ts                   [신규]
eslint.config.mjs · package.json · pnpm-workspace.yaml · .env.example · .prettierignore  [수정]
.md/domains/admin.md [신규] · .md/README.md · .md/workflow/deploy-and-env.md
  · .md/workflow/prototype-preview.md · .md/domains/home.md · .md/domains/location.md [수정]
```

브라우저용 Supabase 클라이언트는 만들지 않는다 — 처음 쓰는 곳이 파일 올리기(패키지 3)다.

---

### Task 1: 공개 라우트를 `(site)` 묶음으로 옮기고 레이아웃을 나눈다

**Files:**
- Create: `src/app/(site)/layout.tsx`, `src/app/(site)/not-found.tsx`, `src/app/not-found.tsx`, `src/shared/components/features/NotFoundMessage/index.tsx`
- Modify: `src/app/layout.tsx`, `src/shared/config/siteNav.test.ts`, `src/shared/config/siteNav.ts`(주석의 경로만)
- Move(`mv`): `src/app/{page.tsx,page.test.tsx,about,design,location,news,next-generation,plan,resources,worship}` → `src/app/(site)/`
- 그대로: `src/app/{_provider.tsx,api,favicon.ico,globals.css}`
- Docs: `.md/README.md`(동기화 표의 `src/app/page.tsx` · `src/app/location/` · `src/app/resources/` · `src/app/news/` 경로), `.md/domains/home.md` · `.md/domains/location.md`(파일 경로), `.md/workflow/prototype-preview.md`(프리뷰 라우트 위치 → `src/app/(site)/<name>-preview`)

**Interfaces:**
- Produces: `src/app/(site)/layout.tsx` 의 default export `SiteLayout({ children })`(다른 파일이 import 해서 쓴다), `NotFoundMessage()`(props 없음).

먼저 읽을 것: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` · `layout.md` · `not-found.md`.

- [ ] **Step 1: 옮기기 전 기준을 남긴다**

Run: `pnpm build 2>&1 | tee <scratchpad>/build-before.txt`
라우트 표(경로와 ○ · ● · ƒ 표시)를 태스크 8 에서 비교한다. `pnpm dev` 를 띄우고 `curl -s -o /dev/null -w '%{http_code}' localhost:3005/없는주소` 가 404 인지, 그 HTML 에 헤더(`<header`)가 있는지도 적어 둔다.

- [ ] **Step 2: 실패하는 테스트로 바꾼다**

`src/shared/config/siteNav.test.ts` 에서 «`siteNav` 의 항목마다 페이지 파일이 있다» 를 확인하는 경로를 `src/app/{section}/…` 에서 `src/app/(site)/{section}/…` 로 바꾼다.

Run: `pnpm test src/shared/config/siteNav.test.ts`
Expected: FAIL(파일 없음).

- [ ] **Step 3: 옮긴다**

`mkdir 'src/app/(site)'` 뒤 위 Move 목록을 `mv` 로 옮긴다. `src/app/layout.tsx` 에서 `AppProvider` · `Header` · `Footer` · `<main>` 을 빼고 `<body>{children}<SpeedInsights /></body>` 만 남긴다(폰트·`globals.css` import · `metadata` · body 의 class 는 그대로). `src/app/(site)/layout.tsx` 는 `<AppProvider><Header /><main className="flex-1">{children}</main><Footer /></AppProvider>` 를 그린다(주석 «본문이 짧아도 푸터가 바닥에…» 도 함께 옮긴다).

- [ ] **Step 4: 404 를 사이트 틀 안에 둔다**

- `NotFoundMessage`: 제목 «페이지를 찾을 수 없습니다», 설명 «주소가 바뀌었거나 없는 페이지입니다.», 링크 «홈으로»(`href="/"`, `OUTLINE_BTN` + `FOCUS`, `min-h-11`). `SectionShell` 의 본문 폭·여백 규칙에 맞춘다.
- `src/app/(site)/not-found.tsx`: `<NotFoundMessage />`.
- `src/app/not-found.tsx`: `import SiteLayout from './(site)/layout'` 로 감싸 `<SiteLayout><NotFoundMessage /></SiteLayout>`.

- [ ] **Step 5: 확인한다**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 전부 통과(테스트 수는 옮기기 전과 같다).

Run: `pnpm dev` 뒤 `curl -s localhost:3005/없는주소 | grep -c '<header'` 와 `curl -s localhost:3005/resources/sunday-sermon/없는id | grep -c '<header'`
Expected: 둘 다 1 이상, 상태 코드 404.

Run: `pnpm design:audit --routes /,/location,/news/bulletin,/resources/sunday-sermon`
Expected: 위반 0.

- [ ] **Step 6: 문서의 경로를 고치고 보고한다**

위 Docs 목록을 고친다. 불변 문서(`decisions/` · `specs/` 의 옛 문서 · `meetings/`)는 고치지 않는다.

---

### Task 2: Supabase 연결 — 환경변수 읽기와 서버용 클라이언트

**Files:**
- Create: `src/shared/api/supabase/env.ts`, `env.test.ts`, `serverClient.server.ts`, `serverClient.server.test.ts`
- Modify: `package.json`(의존성), `.env.example`

**Interfaces:**
- Produces:
  ```ts
  // env.ts
  export type SupabaseEnv = { url: string; publishableKey: string };
  /** 둘 중 하나라도 비어 있으면 null. 기본 인자는 process.env.NEXT_PUBLIC_* 를 글자 그대로 읽는다(빌드 때 채워지게) */
  export const readSupabaseEnv = (raw?: { url?: string; publishableKey?: string }): SupabaseEnv | null;
  /** 없으면 Error — 메시지에 빠진 변수 이름을 넣는다(값은 넣지 않는다) */
  export const requireSupabaseEnv = (): SupabaseEnv;

  // serverClient.server.ts  (첫 줄 import 'server-only')
  export const createSupabaseServerClient = async (): Promise<SupabaseClient<Database>>;
  ```
  `Database` 는 태스크 3 이 만든다 — 이 태스크에서는 `SupabaseClient` 로 두고 태스크 3 에서 제네릭을 붙인다.

- [ ] **Step 1: 설치**

Run: `pnpm add @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: `env.test.ts` — 실패하는 테스트**

```ts
it('둘 다 있으면 값을 돌려준다', () => {
  expect(readSupabaseEnv({ url: 'https://x.supabase.co', publishableKey: 'k' }))
    .toEqual({ url: 'https://x.supabase.co', publishableKey: 'k' });
});
it.each([
  [{ url: '', publishableKey: 'k' }],
  [{ url: 'https://x.supabase.co' }],
  [{ url: '   ', publishableKey: '   ' }],
  [{}],
])('하나라도 비면 null (%o)', raw => expect(readSupabaseEnv(raw)).toBeNull());
it('requireSupabaseEnv 는 빠진 이름만 알린다', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'secret-looking-value');
  expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  expect(() => requireSupabaseEnv()).not.toThrow(/secret-looking-value/);
});
```

Run: `pnpm test src/shared/api/supabase/env.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: `env.ts` 구현 → 같은 명령으로 PASS**

모듈을 import 하는 것만으로는 던지지 않는다(읽는 것은 함수를 부를 때) — 환경변수가 없는 빌드가 깨지지 않게.

- [ ] **Step 4: `serverClient.server.test.ts` — 실패하는 테스트**

`next/headers` 의 `cookies` 와 `@supabase/ssr` 의 `createServerClient` 를 `vi.mock` 한다.

```ts
it('환경변수의 주소·키와 쿠키 저장소로 클라이언트를 만든다', async () => {
  await createSupabaseServerClient();
  const [url, key, opts] = vi.mocked(createServerClient).mock.calls[0];
  expect([url, key]).toEqual(['https://x.supabase.co', 'k']);
  expect(opts.cookies.getAll()).toEqual([{ name: 'a', value: '1' }]);
});
it('서버 컴포넌트에서 쿠키를 못 써도(set 이 던져도) 던지지 않는다', async () => {
  cookieStore.set.mockImplementation(() => { throw new Error('read-only'); });
  await createSupabaseServerClient();
  const opts = vi.mocked(createServerClient).mock.calls[0][2];
  expect(() => opts.cookies.setAll([{ name: 'a', value: '2', options: {} }])).not.toThrow();
});
```

- [ ] **Step 5: 구현 → PASS**

공식 가이드의 서버 클라이언트 코드(`cookies()` 의 `getAll` / `setAll`)를 따른다.

- [ ] **Step 6: `.env.example` 에 두 변수를 빈 값으로 추가(설명 한 줄씩) → `pnpm test && pnpm typecheck && pnpm lint` 통과 → 보고**

---

### Task 3: DB 변경 파일 체계 — CLI · 첫 변경 파일 · 타입 생성 · 적용 워크플로우

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/<시각>_enums.sql`, `scripts/dev-admin-user.mjs`, `src/shared/api/supabase/database.types.ts`, `src/shared/api/supabase/enumParity.test.ts`, `.github/workflows/apply-db-migrations.yml`
- Modify: `package.json`(devDependency `supabase`, 스크립트 `db:start` · `db:stop` · `db:reset` · `db:types`), `.env.local`(로컬 스택 값), `pnpm-workspace.yaml`(`allowBuilds` 에 `supabase: true`), `.prettierignore`(`database.types.ts`), `eslint.config.mjs`(`globalIgnores` 에 같은 파일), `.github/workflows/sync-vercel-env.yml`, `src/shared/api/supabase/serverClient.server.ts`(제네릭), `.md/workflow/deploy-and-env.md`

**Interfaces:**
- Produces: `Database` 타입(`@/shared/api/supabase/database.types`), `pnpm db:start` · `db:stop` · `db:reset` · `db:types`, 로컬 계정 `admin@local.test`, 수동 워크플로우 «Apply DB migrations».

- [ ] **Step 1: CLI 설치와 초기화**

Run: `pnpm add -D supabase` → `pnpm-workspace.yaml` 의 `allowBuilds` 에 `supabase: true` 추가 → `pnpm install` → `pnpm supabase --version`
Run: `pnpm supabase init`(VS Code · IntelliJ 설정을 묻는 질문은 거절)
`supabase/config.toml` 의 `[auth]` 에서 `enable_signup = false`, `[auth.email]` 에서도 `enable_signup = false` 로 둔다. 이 파일은 로컬 스택과 설정 내보내기에만 쓰인다 — 운영 프로젝트의 가입 차단은 사용자가 대시보드에서 끈 것이 정본이다(태스크 8 이 확인).

- [ ] **Step 1b: 로컬 스택을 podman 으로 띄운다**

`package.json` 스크립트: `db:start`(= `supabase start` 에 이 패키지에 필요 없는 서비스를 뺀 것), `db:stop`, `db:reset`(= `supabase db reset`).

Run: `pnpm db:start`
- 필요한 서비스는 DB · Auth · REST · API 게이트웨이 · 타입 생성용 메타 서비스다. 나머지(스튜디오 · 로그 수집 · 실시간 · 이미지 변환 · 엣지 함수 등)는 `-x` 로 뺀다 — podman machine 메모리가 3GiB 이고, 로그 수집 서비스는 Docker 소켓을 직접 물려 podman 에서 자주 실패한다. 뺄 이름은 `pnpm supabase start --help` 로 확인한다.
- 포트가 겹치면 `config.toml` 의 포트를 바꾼다(이 PC 에는 다른 podman 컨테이너가 돌고 있다).
- Expected: `pnpm supabase status` 가 API 주소와 키를 보여 준다.

**podman 에서 끝내 뜨지 않으면 멈추고 보고한다** — 무엇이 실패했는지와 함께, 대안(두 번째 클라우드 프로젝트 또는 지정 프로젝트를 패키지 1~2 동안 그대로 쓰기)을 사용자에게 묻는다. 임의로 운영 프로젝트에 붙지 않는다.

`.env.local` 에 로컬 스택의 `NEXT_PUBLIC_SUPABASE_URL` 과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 를 쓴다(`supabase status` 의 값 — 로컬 전용이라 비밀이 아니다). 기존 `.env.local` 의 다른 줄은 건드리지 않는다.

`scripts/dev-admin-user.mjs`: 로컬 스택의 Auth 관리 API 로 `admin@local.test` 계정을 만든다(이미 있으면 그대로 둔다). 주소가 `127.0.0.1` · `localhost` 가 아니면 실행을 거부한다 — 운영에 계정을 만드는 데 쓰이지 않게. 비밀번호는 인자로 받는다.

- [ ] **Step 2: 첫 변경 파일 — enum 12개**

Run: `pnpm supabase migration new enums`

```sql
create type content_status    as enum ('draft', 'published');
create type resource_section  as enum ('sunday', 'series', 'seasonal');
create type news_feed         as enum ('announcements', 'garden');
create type date_source       as enum ('event', 'upload');
create type file_kind         as enum ('image', 'pdf', 'hwp');
create type menu_area         as enum ('admin', 'site');
create type permission_action as enum ('read', 'create', 'update', 'delete', 'purge', 'export', 'history');
create type newcomer_intent   as enum ('register', 'inquiry');
create type newcomer_status   as enum ('new', 'contacted', 'done');
create type audit_action      as enum ('insert', 'update', 'delete', 'export');
create type hero_media_kind   as enum ('photo', 'youtube');
create type department_slug   as enum ('infant', 'kindergarten', 'lower-elementary', 'elementary',
                                       'middle', 'high', 'young-adult', 'english');
```

값은 설계 6.3 과 글자 그대로 같다.

- [ ] **Step 3: 로컬 DB 에 적용한다**

Run: `pnpm db:reset`
Expected: 변경 파일이 처음부터 다시 적용되고 오류가 없다. 운영 DB 에는 이 태스크에서 적용하지 않는다 — 머지 뒤 워크플로우로 한다(Step 6, 태스크 8).

- [ ] **Step 4: 타입 생성**

`package.json` 에 `"db:types"` 스크립트를 추가한다 — **로컬 DB** 에서 `public` 스키마의 타입을 `src/shared/api/supabase/database.types.ts` 로 쓴다(플래그는 `pnpm supabase gen types typescript --help` 로 확인). 파일 첫 줄에 «자동 생성 — `pnpm db:types`» 주석이 남게 스크립트에서 앞에 붙인다.

Run: `pnpm db:types` → 파일에 `content_status: "draft" | "published"` 가 있다.
`.prettierignore` 와 eslint `globalIgnores` 에 이 파일을 넣는다.

- [ ] **Step 5: `enumParity.test.ts` — DB enum 과 TS 타입이 어긋나면 `pnpm typecheck` 가 실패한다**

```ts
import { expectTypeOf, it } from 'vitest';
import type { Database } from './database.types';
import type { ContentStatus } from '@/shared/api/content.types';
import type { ResourceSection } from '@/domains/resources/api/resource.types';
import type { NewsVideo, NewsVideoFeed } from '@/domains/news/api/news.types';
import type { DepartmentSlug } from '@/domains/next-generation/data/departments';

type E = Database['public']['Enums'];
it('DB enum 은 화면이 쓰는 타입과 같다', () => {
  expectTypeOf<E['content_status']>().toEqualTypeOf<ContentStatus>();
  expectTypeOf<E['resource_section']>().toEqualTypeOf<ResourceSection>();
  expectTypeOf<E['news_feed']>().toEqualTypeOf<NewsVideoFeed>();
  expectTypeOf<E['date_source']>().toEqualTypeOf<NewsVideo['dateFrom']>();
  expectTypeOf<E['department_slug']>().toEqualTypeOf<DepartmentSlug>();
});
```

확인: `database.types.ts` 의 값 하나를 임시로 바꿔 `pnpm typecheck` 가 실패하는 것을 본 뒤 되돌린다. 이어서 `serverClient.server.ts` 의 반환 타입을 `SupabaseClient<Database>` 로 바꾼다.

- [ ] **Step 6: 적용 워크플로우**

`.github/workflows/apply-db-migrations.yml` — `workflow_dispatch` 만, `permissions: contents: read`, `concurrency: apply-db-migrations`. 단계: `actions/checkout@v4` → `supabase/setup-cli@v1`(버전은 `package.json` 의 `supabase` 와 같게 고정) → `supabase link --project-ref "$SUPABASE_PROJECT_ID"` → `supabase db push --yes` → `supabase migration list`. 환경변수는 Secrets 의 `SUPABASE_ACCESS_TOKEN` · `SUPABASE_DB_PASSWORD` · `SUPABASE_PROJECT_ID`. 세 Secret 중 하나라도 비면 `::error::` 로 이름만 알리고 끝낸다. 파일 머리에 `sync-vercel-env.yml` 과 같은 식의 사용 설명 주석을 둔다.

`sync-vercel-env.yml` 의 제어용 이름 거부 줄을 `VERCEL_*|GITHUB_*|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_PROJECT_ID` 로 넓힌다 — DB 비밀번호가 Vercel 환경변수로 들어가지 않게.

워크플로우는 main 에 들어간 뒤에야 실행할 수 있다. 머지 뒤 실행해 운영 DB 에 적용하는 일은 태스크 8 의 마지막 단계다.

- [ ] **Step 7: 문서와 확인**

`.md/workflow/deploy-and-env.md` 에 «DB 변경 적용» 절을 추가한다: 변경 파일 만들기 → 코드보다 먼저 적용(«추가 → 코드 배포 → 제거» 순서) → 타입 다시 만들기, 필요한 Secret 세 개, preview 도 운영 DB 를 본다는 점. 5절 «규칙» 의 «레포 Secrets 에는 Vercel 환경변수와 제어용 3개만» 을 지금 목록에 맞게 고친다.

Run: `pnpm test && pnpm typecheck && pnpm lint` → 통과 → 보고.

---

### Task 4: 로그인 판정 로직(순수)

**Files:**
- Create: `src/domains/admin/api/authRedirect.ts`, `authRedirect.test.ts`, `loginInput.ts`, `loginInput.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // authRedirect.ts
  export const ADMIN_HOME = '/admin';
  export const ADMIN_LOGIN = '/admin/login';
  /** 로그인 뒤 갈 곳. /admin 또는 /admin/ 로 시작하는 사이트 안 경로만 받고, 나머지는 ADMIN_HOME */
  export const safeNextPath = (next: string | null | undefined): string;
  export type AuthDecision = { kind: 'pass' } | { kind: 'redirect'; to: string };
  /** proxy 가 쓴다. search 는 '?a=1' 꼴(없으면 '') */
  export const adminAuthDecision = (pathname: string, search: string, signedIn: boolean): AuthDecision;

  // loginInput.ts
  export const loginInputSchema: z.ZodType<{ email: string; password: string }>;
  ```

- [ ] **Step 1: `authRedirect.test.ts` — 실패하는 테스트**

```ts
describe('safeNextPath', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/bulletin?year=2026', '/admin/bulletin?year=2026'],
    [null, '/admin'], [undefined, '/admin'], ['', '/admin'],
    ['https://evil.example/admin', '/admin'],
    ['//evil.example/admin', '/admin'],
    ['/\\evil.example', '/admin'],
    ['/administrator', '/admin'],
    ['/admin/../news', '/admin'],
    ['/admin/login', '/admin'],          // 로그인 화면으로 되돌리지 않는다
    ['/admin/login?next=/admin', '/admin'],
    ['/', '/admin'],
    ['javascript:alert(1)', '/admin'],
    ['/admin\n/x', '/admin'],
  ])('%s → %s', (input, expected) => expect(safeNextPath(input)).toBe(expected));
});

describe('adminAuthDecision', () => {
  it('로그인 안 했으면 로그인 화면으로 — 오던 곳을 next 에 싣는다', () => {
    expect(adminAuthDecision('/admin/bulletin', '?year=2026', false)).toEqual({
      kind: 'redirect',
      to: '/admin/login?next=%2Fadmin%2Fbulletin%3Fyear%3D2026',
    });
  });
  it('/admin 으로 오다 막히면 next 를 붙이지 않는다', () => {
    expect(adminAuthDecision('/admin', '', false)).toEqual({ kind: 'redirect', to: '/admin/login' });
  });
  it('로그인 화면은 로그인 안 한 사람에게 그대로 보인다', () => {
    expect(adminAuthDecision('/admin/login', '?next=%2Fadmin', false)).toEqual({ kind: 'pass' });
  });
  it('로그인한 사람이 로그인 화면에 오면 갈 곳으로 보낸다', () => {
    expect(adminAuthDecision('/admin/login', '?next=%2Fadmin%2Fbulletin', true))
      .toEqual({ kind: 'redirect', to: '/admin/bulletin' });
    expect(adminAuthDecision('/admin/login', '?next=https%3A%2F%2Fevil.example', true))
      .toEqual({ kind: 'redirect', to: '/admin' });
  });
  it('로그인한 사람은 지나간다', () => {
    expect(adminAuthDecision('/admin/bulletin', '', true)).toEqual({ kind: 'pass' });
  });
});
```

Run: `pnpm test src/domains/admin/api/authRedirect.test.ts` → FAIL.

- [ ] **Step 2: 구현 → PASS**

`safeNextPath` 는 `new URL(next, 'http://x')` 로 풀어 본 뒤 출처가 `http://x` 이고 풀린 경로가 `/admin` 이거나 `/admin/` 로 시작하며 `/admin/login` 이 아닐 때만 `경로 + 쿼리` 를 돌려준다(역슬래시·제어 문자가 있으면 거절).

- [ ] **Step 3: `loginInput.test.ts` — 실패하는 테스트 → 구현 → PASS**

```ts
it('앞뒤 공백을 지운 이메일과 비밀번호를 받는다', () => {
  expect(loginInputSchema.parse({ email: ' a@b.kr ', password: 'pw' }))
    .toEqual({ email: 'a@b.kr', password: 'pw' });
});
it.each([
  [{ email: '', password: 'pw' }], [{ email: 'a@b.kr', password: '' }],
  [{ email: 'not-an-email', password: 'pw' }], [{}],
])('빠지거나 틀리면 거절 (%o)', v => expect(loginInputSchema.safeParse(v).success).toBe(false));
it('비밀번호는 고치지 않는다(공백 포함)', () => {
  expect(loginInputSchema.parse({ email: 'a@b.kr', password: ' p w ' }).password).toBe(' p w ');
});
```

- [ ] **Step 4: `pnpm test && pnpm typecheck && pnpm lint` → 보고**

---

### Task 5: `/admin/*` 세션 갱신·검사 — proxy 와 서버 쪽 사용자 읽기

**Files:**
- Create: `src/shared/api/supabase/proxySession.server.ts`, `proxySession.server.test.ts`, `src/proxy.ts`, `src/proxy.test.ts`, `src/domains/admin/api/session.server.ts`, `session.server.test.ts`

**Interfaces:**
- Consumes: `readSupabaseEnv`(태스크 2), `createSupabaseServerClient`(태스크 2), `adminAuthDecision` · `ADMIN_LOGIN`(태스크 4).
- Produces:
  ```ts
  // proxySession.server.ts — 공식 가이드의 proxy 유틸을 따른다
  /** 세션 쿠키를 갱신한 응답과 로그인 여부. 환경변수가 없으면 요청을 그대로 넘기고 signedIn: false */
  export const updateSession = async (request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }>;

  // src/proxy.ts
  export async function proxy(request: NextRequest): Promise<NextResponse>;
  export const config = { matcher: ['/admin/:path*'] };

  // session.server.ts
  export type AdminUser = { id: string; email: string };
  export const getAdminUser = async (): Promise<AdminUser | null>;   // getClaims() 의 sub · email
  export const requireAdminUser = async (): Promise<AdminUser>;      // 없으면 redirect(ADMIN_LOGIN)
  ```

먼저 읽을 것: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` · `01-app/02-guides/authentication.md`.

- [ ] **Step 1: 테스트 세 개 — 실패**

`@supabase/ssr` 의 `createServerClient` 를 mock 해 `auth.getClaims` 의 결과를 바꿔 가며 본다.

```ts
// proxySession.server.test.ts — req = new NextRequest('http://localhost/admin')
it('getClaims 가 사용자를 주면 signedIn: true', async () => {
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.kr' } }, error: null });
  expect((await updateSession(req)).signedIn).toBe(true);
});
it.each([
  [{ data: null, error: null }],
  [{ data: { claims: null }, error: null }],
  [{ data: null, error: new Error('bad jwt') }],
])('getClaims 가 비거나 오류면 signedIn: false (%o)', async result => {
  auth.getClaims.mockResolvedValue(result);
  expect((await updateSession(req)).signedIn).toBe(false);
});
it('getClaims 가 던져도(네트워크) 요청을 죽이지 않고 signedIn: false', async () => {
  auth.getClaims.mockRejectedValue(new Error('fetch failed'));
  expect((await updateSession(req)).signedIn).toBe(false);
});
it('환경변수가 없으면 Supabase 를 부르지 않고 signedIn: false', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  expect((await updateSession(req)).signedIn).toBe(false);
  expect(createServerClient).not.toHaveBeenCalled();
});
it('getSession 을 부르지 않는다', async () => {
  await updateSession(req);
  expect(auth.getSession).not.toHaveBeenCalled();
});

// proxy.test.ts — updateSession 을 mock
it('matcher 는 /admin/:path* 하나뿐이다', () => expect(config.matcher).toEqual(['/admin/:path*']));
it('로그인 안 한 채 오면 오던 곳을 싣고 로그인 화면으로 보낸다', async () => {
  mockSession({ signedIn: false });
  const res = await proxy(new NextRequest('http://localhost/admin/bulletin?year=2026'));
  expect(res.status).toBe(307);
  expect(res.headers.get('location'))
    .toBe('http://localhost/admin/login?next=%2Fadmin%2Fbulletin%3Fyear%3D2026');
});
it('돌려보낼 때 updateSession 이 갱신한 쿠키를 그 응답에 옮긴다', async () => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set('sb-x-auth-token', 'new');
  mockSession({ signedIn: false, response: refreshed });
  const res = await proxy(new NextRequest('http://localhost/admin/bulletin'));
  expect(res.cookies.get('sb-x-auth-token')?.value).toBe('new');
});
it('로그인한 채 오면 updateSession 의 응답을 그대로 돌려준다', async () => {
  const passthrough = NextResponse.next();
  mockSession({ signedIn: true, response: passthrough });
  expect(await proxy(new NextRequest('http://localhost/admin'))).toBe(passthrough);
});

// session.server.test.ts — createSupabaseServerClient 와 next/navigation 의 redirect 를 mock
it('claims 의 sub · email 을 AdminUser 로 돌려준다', async () => {
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'u1', email: 'a@b.kr' } }, error: null });
  expect(await getAdminUser()).toEqual({ id: 'u1', email: 'a@b.kr' });
});
it('claims 가 없으면 null 이고 requireAdminUser 는 로그인 화면으로 보낸다', async () => {
  auth.getClaims.mockResolvedValue({ data: null, error: null });
  expect(await getAdminUser()).toBeNull();
  await requireAdminUser();
  expect(redirect).toHaveBeenCalledWith('/admin/login');
});
it('환경변수가 없으면 Supabase 를 부르지 않고 null', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  expect(await getAdminUser()).toBeNull();
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
```

Run: `pnpm test src/proxy.test.ts src/shared/api/supabase/proxySession.server.test.ts src/domains/admin/api/session.server.test.ts` → FAIL.

- [ ] **Step 2: 구현 → PASS**

- `updateSession` 은 공식 가이드대로 `NextResponse.next({ request })` 로 시작해 `setAll` 에서 요청·응답 쿠키를 함께 갱신하고 `getClaims()` 를 부른다.
- `proxy` 는 `adminAuthDecision(pathname, search, signedIn)` 의 결과가 `redirect` 면 `NextResponse.redirect(new URL(to, request.url))` 를 만들고, `updateSession` 응답의 쿠키를 전부 옮겨 담아 돌려준다.
- `proxy.ts` 는 매처 밖의 공개 경로에서 돌지 않는다 — 매처를 넓히지 않는다.

- [ ] **Step 3: `pnpm test && pnpm typecheck && pnpm lint` → 보고**

---

### Task 6: 로그인 화면 · 로그아웃 · 관리자 레이아웃 · 첫 화면

**Files:**
- Create: `src/domains/admin/api/authActions.ts`, `authActions.test.ts`, `src/domains/admin/components/widgets/LoginForm/index.tsx`, `src/domains/admin/components/widgets/AdminShell/index.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/(panel)/layout.tsx`, `src/app/admin/(panel)/page.tsx`, `.md/domains/admin.md`
- Modify: `.md/README.md`(트리 · Domains 목록 · 동기화 표에 `src/domains/admin/` · `src/app/admin/` → `domains/admin.md`)

**Interfaces:**
- Consumes: `loginInputSchema` · `safeNextPath` · `ADMIN_LOGIN`(태스크 4), `createSupabaseServerClient` · `readSupabaseEnv`(태스크 2), `requireAdminUser` · `AdminUser`(태스크 5).
- Produces:
  ```ts
  // authActions.ts  ('use server')
  export type LoginState = { error?: string };
  export const signIn = async (prev: LoginState, formData: FormData): Promise<LoginState>;  // 성공하면 redirect
  export const signOut = async (): Promise<void>;                                           // redirect(ADMIN_LOGIN)

  // AdminShell — 서버 컴포넌트. 메뉴 목록은 패키지 2 에서 DB 로 바뀐다
  export const AdminShell = (props: { user: AdminUser; children: React.ReactNode }) => JSX.Element;
  // LoginForm — 'use client'
  export const LoginForm = (props: { next: string; configured: boolean }) => JSX.Element;
  ```

- [ ] **Step 1: `authActions.test.ts` — 실패하는 테스트**

`createSupabaseServerClient` 와 `next/navigation` 의 `redirect` 를 mock 한다.

```ts
it('값이 빠지면 Supabase 를 부르지 않고 안내를 돌려준다', async () => {
  expect(await signIn({}, form({ email: '', password: '' })))
    .toEqual({ error: '이메일과 비밀번호를 입력해 주세요.' });
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
});
it('로그인이 거절되면 어느 쪽이 틀렸는지 말하지 않는다', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') });
  expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' })))
    .toEqual({ error: '이메일 또는 비밀번호가 맞지 않습니다.' });
});
it('성공하면 next 로 보낸다 — 바깥 주소는 /admin 으로', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: null });
  await signIn({}, form({ email: 'a@b.kr', password: 'x', next: '/admin/bulletin' }));
  expect(redirect).toHaveBeenCalledWith('/admin/bulletin');
  await signIn({}, form({ email: 'a@b.kr', password: 'x', next: 'https://evil.example' }));
  expect(redirect).toHaveBeenLastCalledWith('/admin');
});
it('환경변수가 없으면 설정 안내를 돌려준다', async () => {
  // readSupabaseEnv → null
  expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' })))
    .toEqual({ error: '관리자 로그인이 아직 설정되지 않았습니다.' });
});
it('signOut 은 세션을 끝내고 로그인 화면으로 보낸다', async () => {
  await signOut();
  expect(auth.signOut).toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith('/admin/login');
});
```

Run: `pnpm test src/domains/admin/api/authActions.test.ts` → FAIL.

- [ ] **Step 2: `authActions.ts` 구현 → PASS**

- [ ] **Step 3: 라우트와 화면**

- `src/app/admin/layout.tsx`: `metadata = { title: '관리자 | 성복교회', robots: { index: false, follow: false } }`, `children` 만 그린다.
- `src/app/admin/login/page.tsx`(서버): `searchParams.next` 를 `safeNextPath` 로 정리해 `<LoginForm next={…} configured={readSupabaseEnv() !== null} />`.
- `LoginForm`: `useActionState(signIn, {})`. 칸 둘(이메일 `type="email" autoComplete="username"`, 비밀번호 `type="password" autoComplete="current-password"`), 숨긴 칸 `next`, 버튼 «로그인»(보내는 동안 비활성 + «로그인 중…»). 오류는 `role="alert"` 로 폼 위에. `configured` 가 false 면 칸 대신 «관리자 로그인이 아직 설정되지 않았습니다.» 만 보인다. 공용 `form-field` · `input` · `button` 을 쓴다.
- `src/app/admin/(panel)/layout.tsx`(서버): `const user = await requireAdminUser()` → `<AdminShell user={user}>{children}</AdminShell>`.
- `AdminShell`: `lg` 이상은 왼쪽 메뉴(폭 240px) + 본문, 그 아래는 위쪽 막대의 메뉴 버튼으로 여는 `Sheet`(왼쪽). 메뉴 항목은 지금 «첫 화면»(`/admin`) 하나. 위쪽 막대 오른쪽에 로그인한 이메일과 «로그아웃»(`<form action={signOut}>` 의 버튼). 사이트 헤더·푸터·부드러운 스크롤은 없다.
- `src/app/admin/(panel)/page.tsx`: 제목 «첫 화면», 한 줄 «로그인한 계정: {email}». 이번 주 할 일은 뒤 패키지에서 채운다.

- [ ] **Step 4: 화면 확인**

`pnpm dev` 를 띄우고 `agent-browser` 로:
- `/admin` → `/admin/login` 으로 넘어간다.
- 틀린 비밀번호 → «이메일 또는 비밀번호가 맞지 않습니다.».
- 로컬 계정 `admin@local.test`(태스크 3 의 `scripts/dev-admin-user.mjs` 로 만든 것) → `/admin`, 이메일이 보인다 → «로그아웃» → `/admin/login`.
- 375 · 768 · 1024 · 1280 에서 스크린샷. 가로로 넘치지 않고, 375 에서 메뉴가 시트로 열리고 닫힌다.

Run: `pnpm design:lint --diff` → 위반 0. `pnpm design:audit --routes /admin/login` → 위반 0(로그인이 필요한 `/admin` 은 태스크 8 에서 눈으로 본다).

- [ ] **Step 5: 문서 → `pnpm test && pnpm typecheck && pnpm lint` → 보고**

`.md/domains/admin.md`(살아 있는 문서): 지금 있는 것(라우트 · 로그인 흐름 · proxy 가 도는 범위 · 파일 위치 · 환경변수 · 가입 차단)과 아직 없는 것(권한 · 메뉴 · 콘텐츠 — 설계 문서로 연결). `.md/README.md` 를 함께 고친다.

---

### Task 7: 공개 쪽이 관리자 코드를 가져다 쓰지 못하게 하는 lint 경계

**Files:**
- Create: `tests/lint/adminBoundary.test.ts`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Produces: eslint 규칙 블록 — 대상 `src/app/(site)/**` · `src/domains/**`(`src/domains/admin/**` 제외) · `src/shared/components/**`. 금지: `@/domains/admin/**`, `react-hook-form`, `@hookform/*`, `@tanstack/react-table`, `@supabase/*`. `src/shared/api/supabase/**` 는 대상이 아니다(공개 화면의 저장소 계층이 패키지 3 부터 여기를 거쳐 읽는다).

- [ ] **Step 1: 실패하는 테스트**

```ts
// @vitest-environment node
import { ESLint } from 'eslint';
const eslint = new ESLint();
const ruleIds = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath }))[0].messages.map(m => m.ruleId);

it.each([
  ["import { signIn } from '@/domains/admin/api/authActions';", 'src/domains/home/x.tsx'],
  ["import { useForm } from 'react-hook-form';", 'src/app/(site)/location/x.tsx'],
  ["import { useReactTable } from '@tanstack/react-table';", 'src/shared/components/ui/x.tsx'],
  ["import { createServerClient } from '@supabase/ssr';", 'src/domains/news/api/x.ts'],
])('공개 쪽에서 %s 는 막힌다', async (code, file) =>
  expect(await ruleIds(code, file)).toContain('no-restricted-imports'));

it.each([
  ["import { signIn } from '@/domains/admin/api/authActions';", 'src/app/admin/login/x.tsx'],
  ["import { useForm } from 'react-hook-form';", 'src/domains/admin/components/x.tsx'],
  ["import { createServerClient } from '@supabase/ssr';", 'src/shared/api/supabase/x.server.ts'],
  ["import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';", 'src/domains/news/api/x.ts'],
])('관리자·연결 계층에서 %s 는 된다', async (code, file) =>
  expect(await ruleIds(code, file)).not.toContain('no-restricted-imports'));
```

Run: `pnpm test tests/lint/adminBoundary.test.ts` → FAIL.

- [ ] **Step 2: `eslint.config.mjs` 에 `no-restricted-imports` 블록을 추가 → PASS**

Temporal 예외 블록이 `no-restricted-globals` · `no-restricted-syntax` 를 통째로 끄는 것과 섞이지 않게, 이 금지는 다른 규칙(`no-restricted-imports`)과 별도 블록으로 둔다(파일 안 주석의 주의 사항). 메시지는 «관리자 전용이다 — 방문자 번들에 실린다(ADR 0008)».

- [ ] **Step 3: `pnpm lint`(전체 트리) 통과 → 보고**

---

### Task 8: 전체 검증

**Files:** 없음(확인만). 문제가 나오면 해당 태스크의 파일을 고친다.

- [ ] **Step 1: 기본 검사**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build 2>&1 | tee <scratchpad>/build-after.txt`
Expected: 전부 통과.

- [ ] **Step 2: 공개 페이지의 정적 생성이 그대로다(Review Focus 5)**

`build-before.txt` 와 `build-after.txt` 의 라우트 표를 비교한다. 공개 경로의 목록과 ○ · ● · ƒ 표시가 같고, 늘어난 것은 `/admin` · `/admin/login` · `/_not-found` 와 `Proxy` 줄뿐이다.

- [ ] **Step 3: 환경변수 없이도 공개 사이트가 선다(Review Focus 3)**

Run: `.env.local` 을 잠시 다른 이름으로 바꾼 뒤 `pnpm build && pnpm start -p 3099`
- `curl -s -o /dev/null -w '%{http_code}' localhost:3099/` → 200
- `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' localhost:3099/admin` → 307, `/admin/login`
- `curl -s localhost:3099/admin/login` 에 «관리자 로그인이 아직 설정되지 않았습니다.» 가 있다.
끝나면 서버를 끄고 `.env.local` 이름을 되돌린다.

- [ ] **Step 4: 위조 쿠키(Review Focus 4)**

`.env.local` 이 있는 상태로 `pnpm start -p 3099`(로컬 스택). 쿠키 이름 `sb-<프로젝트 ref>-auth-token` 에 아무 글자나 넣어:
`curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Cookie: sb-<ref>-auth-token=base64-abcdef' localhost:3099/admin` → 307, `/admin/login`.

- [ ] **Step 5: 가입이 막혀 있다(Review Focus 1)**

공개용 키로 가입을 시도하는 한 번짜리 스크립트를 scratchpad 에 써서 돌린다(`supabase.auth.signUp({ email: 'signup-check@example.com', password: … })`). 로컬 스택(`.env.local`)과 **운영 프로젝트**(`.env.production.local` — 사용자가 넣어 둔 값을 읽기만 하고 출력하지 않는다) 양쪽에 한 번씩. `.env.production.local` 이 없으면 운영 쪽 확인은 «못 했음» 으로 보고하고 배포 전 필수 항목으로 남긴다.
Expected: 오류(가입 불가). **계정이 만들어지면 여기서 멈춘다** — 사용자에게 대시보드의 가입 허용을 끄고 그 계정을 지워 달라고 알린 뒤 다시 확인한다.

- [ ] **Step 6: 방문자 번들에 관리자 라이브러리가 없다**

`pnpm start -p 3099` 상태에서 `/` 의 HTML 이 불러오는 `/_next/static/chunks/*.js` 를 전부 받아 `supabase` 글자를 찾는다.
Expected: 0건. `/admin/login` 의 청크에도 `@supabase` 본체가 없어야 한다(로그인은 Server Action 이라 브라우저에 싣지 않는다).

- [ ] **Step 7: 화면**

`pnpm design:audit --routes /,/location,/news/bulletin,/admin/login` → 위반 0. 로그인한 `/admin` 은 `agent-browser` 로 375 · 1280 스크린샷을 찍어 눈으로 본다(가로 넘침 · 터치 영역 · 포커스).

- [ ] **Step 8: 보고하고 멈춘다**

바뀐 파일 목록, 검사 결과, 남은 것(머지 뒤 «Apply DB migrations» 워크플로우를 돌려 운영 DB 에 enum 을 만들고 통과를 확인 — 운영 DB 를 바꾸는 일이라 사용자가 실행하거나 승인한 뒤에 한다, 운영에서 본인 계정으로 로그인 확인)을 보고한다. `pnpm db:stop` 으로 로컬 스택을 끈다. 커밋·배포는 사용자가 지시하면 한다.
