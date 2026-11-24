# 관리자 (`/admin`)

교회 사람이 개발자 없이 내용을 올리고 고치는 화면. 전체 설계는 [specs/2026-11-17-admin-design.md](../specs/2026-11-17-admin-design.md)(작업 패키지 A~D)이고, 이 문서는 **지금 코드에 있는 것**만 적는다.

> 배경 결정: [ADR 0008](../decisions/0008-admin-backend-vercel-supabase.md)(Vercel + Supabase, 같은 앱 `/admin`) · [ADR 0012](../decisions/0012-date-temporal-and-admin-libraries.md)(날짜·라이브러리) · [ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md)(shadcn 원본 + 색만 교체) · [ADR 0017](../decisions/0017-admin-reference-next-starter-and-tanstack-form.md)(참고 대상 · 폼은 TanStack Form · 화면 색은 의미 토큰만) · [ADR 0018](../decisions/0018-ui-primitives-base-ui.md)(UI 기반은 Base UI · shadcn 부품은 base-nova 원본)

## 지금 있는 것 (패키지 1 준비 + 패키지 A 기반 + 패키지 B 콘텐츠 5종)

로그인 · 권한별 메뉴 · 시스템 화면 5개 · 콘텐츠 5종(주보 · 주일광고 · 성복의 뜰 · 교회앨범 · 설교 시트지)이 있다. 나머지 콘텐츠 · 사이트 화면 · 새가족 화면은 아직 없다(패키지 B · C — 메뉴는 DB 에 있지만 `ADMIN_SCREENS_READY` 에 없어 숨겨진다). 패키지 B 의 진행은 [계획](../specs/2026-11-24-admin-pb-content-plan.md).

| 주소 | 내용 | 권한 |
|---|---|---|
| `/admin/login` | 로그인. `?reason=idle`(8시간 쉬어 로그아웃) · `inactive`(꺼진 계정) · `reset_expired`(비밀번호 찾기 링크 만료) 안내 | — |
| `/admin/login/forgot` | 비밀번호 찾기 — 이메일을 적으면 새 비밀번호를 정하는 링크 메일을 보낸다 | — |
| `/admin/login/confirm` | 그 메일의 링크가 오는 곳(route handler) — 링크로 로그인시키고 `/admin/password` 로 | — |
| `/admin/password` | 비밀번호 바꾸기 — 첫 로그인 · 초기화 뒤에는 다른 화면으로 못 간다 | 로그인 |
| `/admin/logout` | 서버가 로그아웃시킬 때 지나가는 주소(route handler) | — |
| `/admin` | 첫 화면 — 숫자 카드 · 이번 주 할 일(주보 · 주일광고: 이번 주일 날짜 + 공개 · 임시저장 · 아직 없음 — 누르면 그 글, 없으면 날짜를 채운 등록 화면. 새가족은 화면이 생길 때) · 바로 가기 | 로그인 |
| `/admin/bulletin` · `/new` · `/[id]` · `/[id]/edit` | 콘텐츠 › 주보 — 목록(연도 · 상태 · 삭제된 항목, 검색어 칸 없음) · 등록(한 장: 주일 날짜(이번 주일로 채움 — 아무 날짜나) + 쪽 그림 · [미리보기] · [임시저장] · [공개]) · 상세(쪽 그림 · 머리 [복제해서 새로 쓰기] · [사이트에서 보기] · [수정] · «더 보기»: 휴지통 · 복구 · 완전 삭제 · 이력) · 수정(공개된 글은 [임시저장으로 돌리기] · [저장]) | `bulletin` |
| `/admin/announcements` · `/admin/garden` (+ `/new` · `/[id]` · `/[id]/edit`) | 콘텐츠 › 주일광고 · 성복의 뜰 — 한 표(`news_videos`)를 `feed` 로 나눠 쓰고 화면 부품도 같이 쓴다([NewsVideoScreens](../../src/domains/admin/components/widgets/NewsVideoScreens/index.tsx)). 목록(제목 검색 · 분류 · 상태 · 연도 · 삭제된 항목) · 등록(제목 · 분류(+ 새 분류) · 날짜 · 유튜브 영상 — 붙여 넣으면 썸네일이 바로 보인다 · 설명) · 상세 · 수정 | `announcements` · `garden` |
| `/admin/album` · `/new` · `/[id]` · `/[id]/edit` | 콘텐츠 › 교회앨범 — 목록(제목 검색 · 분류 · 상태 · 삭제된 항목, 최신 등록이 위) · 등록(제목 · 분류(+ 새 분류) · 그림 1~30장 — 주보와 같은 올리기 통로) · 상세(분류 · 주소 번호 · 그림) · 수정 | `album` |
| `/admin/resources` · `/new` · `/[id]` · `/[id]/edit` | 콘텐츠 › 설교 시트지 — 목록(제목 · 본문 검색 · 분류 · 상태 · 삭제된 항목, 최신 날짜부터) · 등록(분류 · 묶음(+ 새 묶음) · 회차 · 제목 · 날짜(모르면 연도) · 본문 · 원본(PDF · 한글 파일) · 쪽 그림 · 설교 영상) · 상세 · 수정 | `resources` |
| `/admin/preview/[menu]` | 콘텐츠 미리보기 틀 — 등록 · 수정 화면의 [미리보기] 창이 iframe 으로 연다(`bulletin` · `announcements` · `garden` · `album` · `resources`) | 그 메뉴 조회 |
| `/admin/users` · `/new` · `/[id]` · `/[id]/edit` | 목록(줄 체크 켜기 · 끄기) · 계정 만들기(단계: 기본 정보 → 역할 → 확인, 임시 비밀번호 한 번 · 상세로 / 계속 등록) · 상세(«더 보기» 메뉴: 비밀번호 초기화 · 끄기/켜기 · 이력) · 수정(이름 · 그룹 · 담당 부서) | `users` |
| `/admin/groups` · `/new` · `/[id]` · `/[id]/edit` | 목록 · 만들기(두 단계: 이름 · 설명 → 메뉴 권한 표) · 상세(구성원 · 권한 표 보기 · «더 보기» 메뉴: 끄기/켜기 · 이력) · 수정 — 기본 정보와 «메뉴 × 기능» 권한을 한 번에 저장(끄고 켜기는 사용자처럼 상세에서만, 수정 화면에는 없다) | `groups` |
| `/admin/menus` | 관리자 메뉴의 이름 · 사용 여부 · 순서(홈페이지 탭은 패키지 D) · 화면 전체의 변경 이력 | `menus` |
| `/admin/categories` | 콘텐츠 › 분류 관리 — 왼쪽 묶음 · 오른쪽 분류(더하기 · 이름 · 사용 여부 · 순서). 영문 이름(slug)은 공개 주소용이라 바꾸지 않는다 | `categories` |
| `/admin/codes` | 시스템 › 코드 관리(공통코드) — 왼쪽 묶음 · 오른쪽 코드. 코드 값은 영문 대문자. 잠긴 묶음(콘텐츠 상태 · 새가족 구분 · 새가족 처리 상태 — enum 과 같은 값)은 이름 · 순서만([ADR 0020](../decisions/0020-codes-uppercase-and-categories-split.md)) | `codes` |
| `/admin/audit` | 전체 변경 이력(대상 · 동작 · 사람 · 기간(시작일~끝일, 한국 날짜)) — 한 건은 «자세히» 창 | `audit` |
| `/admin/없는주소` | 관리자 틀 안의 «페이지를 찾을 수 없습니다» — 권한 없는 화면도 이것(있는지조차 드러내지 않는다) | — |

### 코드 위치(2026-11-23 정리)

`src/domains/admin/` 는 역할별 폴더로 나눈다. 파일 이름은 그대로 두고(`*.server.ts` · `use*` · `*Actions`) 폴더만 역할을 말한다.

| 폴더 | 무엇 |
|---|---|
| `api/actions/` | Server Action(`'use server'`) — 화면이 부르는 저장 · 읽기. `authActions` · `userActions` · `groupActions` · `menuActions` · `itemActions`(분류 · 코드) · `passwordActions` · `historyActions` |
| `api/server/` | 서버에서만 도는 것(`*.server.ts`) — 권한 맥락(`adminContext.server`) · 세션 · 목록 기본값 · 이력 줄 · 권한 표 읽기 · 동시 수정(`versionedUpdate.server`) · 순서 저장(`sortRows.server`) · 한 줄 고치기 표의 공통 몸통(`rowActions.server` — 메뉴 · 분류 · 코드의 고치기 · 순서 · 맨 뒤에 더하기) |
| `hooks/` | 클라이언트 훅 — `useAdminAction`(Server Action 부르고 토스트) · `useKeyShortcut`(⌘K · Ctrl/⌘+S · `/` 단축키와 «글 쓰는 칸인가» 판정 하나) · `useFormGuards` · `useAdminNavigate` · `useSignOut`(로그아웃 + 임시 보관 · 최근 검색 지우기) · `useCapsLock` |
| `lib/` | 순수 함수 · 규칙 · 문구(서버 · 화면 공통) — 메뉴 · 권한(`adminNav` · `permissionMatrix`), 목록 주소(`listQuery` · `listMemory`), 이력 문구(`auditFormat` · `auditLabels`), 결과 · 알림(`actionResult` · `notify`), 등록 단계 · 권한 요약(`formSteps` · `permissionSummary`), 브라우저 저장소(`adminStorage` · `formDraft` · `recentSearches`), 로그인 길(`authRedirect` · `idleSession` · `passwordReset` · `adminCsp`) 등 |
| `lib/input/` | 화면 · Server Action 이 같이 쓰는 zod 스키마 — `userInput` · `groupInput` · `itemInput`(분류 · 코드) · `menuInput` · `reorderInput` · `passwordInput` · `loginInput` |
| `components/features/` | 여러 화면이 쓰는 조각 — `AdminForm`(`TextField` · `FormActions` · `RequiredMark` …) · `AdminList`(`AdminTable` · `ListToolbar`) · `StatusBadge`(«사용 중 / 꺼짐») · `PageHeader` · `ConfirmAction` · `FormSteps`(`StepCard` · `Stepper`) … |
| `components/widgets/` | 한 화면 덩어리 — `ItemGroups`(분류 관리 · 코드 관리가 같이 쓰는 화면 — 다른 점은 `itemKinds.ts`) · `SortableRows` · `UserCreateForm` · `UserForm`(수정) · `GroupCreateForm` · `GroupForm`(수정) … |

### 권한 판정

- 페이지: [requirePermission(menu, action)](../../src/domains/admin/api/server/adminContext.server.ts) — 없으면 404. Server Action: `actionPermission` — 없으면 «권한이 없습니다» 토스트(404 를 던지지 않는다).
- 로그인한 사람의 맥락(`loadAdminContext`, 요청당 한 번): 사용자 정보 · 권한 목록(`rpc('my_permissions')`) · 왼쪽 메뉴([buildAdminNav](../../src/domains/admin/lib/adminNav.ts) — 사용 중 · 조회 권한 · 화면이 있는 메뉴만). 사용자 정보가 없거나 꺼진 계정은 `/admin/logout?reason=inactive` 로 보낸다.
- **막는 것은 DB 다**(RLS · 트리거 — `supabase/schemas/schema.sql`). 화면 · 액션의 판정은 알맞은 안내를 내기 위한 것이다. 쓰기는 모두 로그인한 사람의 세션으로 한다(이력에 «누가» 가 남고 권한 올리기 방지를 DB 가 한다).
- 만능 키([adminClient.server.ts](../../src/shared/api/supabase/adminClient.server.ts), `SUPABASE_SECRET_KEY`)는 계정 만들기 · 비밀번호 초기화에만. 비밀번호 초기화는 DB 트리거가 못 막으므로 먼저 `rpc('can_manage_user')` 로 확인한다. lint 가 관리자 코드 밖의 import 를 막는다.

### 화면 틀 · 편의 기능(설계 6.10)

화면 배치는 참고 대상 `next-shadcn-dashboard-starter` 를 따른다(ADR 0017 — 2026-11-20 사용자 지적 «글만 나열돼 뭐가 뭔지 어렵다» 로 다시 맞춤).

- **왼쪽 메뉴**: 대메뉴(콘텐츠 · 사이트 화면 · 접수 · 시스템) › 세부 메뉴. 펼친 상태는 접히는 묶음(Collapsible), 아이콘만 남긴 상태는 대메뉴를 누르면 오른쪽에 세부 메뉴(DropdownMenu). 화면이 아직 없는 메뉴는 «준비 중»(누를 수 없음). 아이콘은 [MenuIcon](../../src/domains/admin/components/features/MenuIcon/index.tsx).
- **위쪽 막대**: 경로 표시(대메뉴 › 메뉴 › 새로 만들기 · 상세 › 수정 — `buildBreadcrumbs`) · 입력칸 모양의 «메뉴 찾기 ⌘K».
- **화면 머리**: [PageHeader](../../src/domains/admin/components/features/PageHeader/index.tsx) — 제목(h1, 메뉴 관리에서 바꾼 이름) · 제목 옆 작은 표(`badge` — 상세의 상태) · 주요 버튼(새로 만들기 · 변경 이력). 화면 설명 줄은 없다. [screenDescriptions.ts](../../src/domains/admin/lib/screenDescriptions.ts) 의 문구는 첫 화면 «바로 가기» 카드에만 쓴다.
- **문구 규칙(2026-11-24 사용자 — 휴대폰으로 보고 «글이 너무 많고 화면이 다 똑같다»)**:
  - **화면 설명 줄을 달지 않는다.** 머리는 제목 · 버튼만. 상세만 대상의 값 한 줄(그룹 설명 · 이메일)을 제목 아래에 둔다. 수정 화면의 제목은 대상 이름만 — «수정» 은 위쪽 경로 표시가 알린다.
  - **한 값은 한 번만.** 상세 본문에 머리의 이름 · 설명 · 상태를 되풀이하지 않는다(«기본 정보» 카드 없음). 머리에 없는 값만 짧은 «항목 — 값» 목록([DetailList](../../src/domains/admin/components/features/Detail/DetailList.tsx))으로, 개수는 칸 제목 옆(«구성원 3»). 수정 시각은 맨 아래 한 줄(«수정 11-20 20:57 · 홍길동», 등록은 마우스를 올리면 · 전부는 변경 이력).
  - **도움말은 실수를 막을 때만.** 카드 · 칸 아래 설명 문장을 달지 않는다. 남기는 것: 부서 고정(«내 담당 부서로만 …»), «전체 관리» 소속 잠금, 내 그룹만 고를 수 있을 때, 영문 이름 · 코드 값 «나중에 바꿀 수 없습니다», 대메뉴 «끄면 그 아래 메뉴도 숨겨집니다», 충돌 · 오류 알림. 글자 수는 한도의 80% 를 넘겨 쓸 때만 보인다(`TextField` 의 `CharCount` — 알림 자리 `aria-live` 는 늘 두고 내용만 채워 스크린리더가 읽는다).
  - **«전체 관리» 그룹**: 상세는 머리의 «모든 권한» 표 하나(권한 칸 · 설명 없음), 수정은 이름 · 설명 카드 하나.
  - **화면마다 모양이 다르다**: 목록 = 검색 줄 + 표(좁으면 카드), 상세 = 머리 + 짧은 값 목록 + 관련 칸(구성원 · 권한), 수정 = 폼만.
- **흐름**: 목록 → (줄 누름) 상세 → [수정] → 저장하면 상세. 상세가 없는 목록(변경 이력)은 «자세히» 창, 목록만 있는 화면(메뉴 · 코드)은 그 자리에서 고친다.
- **목록 검색 줄**: [ListToolbar](../../src/domains/admin/components/features/AdminList/ListToolbar.tsx) — 카드 없이 한 줄(좁으면 줄바꿈): 검색어 · 조건 고르기 · 기간 · 작은 [초기화]. **칸마다 제 값만 바꾸고, 주소는 언제나 «적용된 값»(주소, 또는 방금 보내서 주소가 아직 따라오지 않은 값 — 새 이동이 앞 이동을 버리므로) 위에 그 하나만 얹어 만든다** — 다른 칸에 쓰다 만 값은 싣지 않는다. 조건 고르기 · «삭제된 항목» 은 고르면 바로, 검색어는 Enter(모바일 키보드 «검색», `/` 단축키 · 최근 검색 조건 5개), 기간은 두 칸이 각각 비었거나 다 고른 날짜(`isCompleteDate`)이고 적용된 값과 다를 때만 [적용] 이 뜬다(`canApplyDates` — 두 날짜를 함께 보낸다, 날짜 칸에서 Enter 도 같다; 고르는 중 · 칸을 떠날 때는 가지 않는다). 주소가 바뀌면(뒤로 가기 · 다른 칸 · «조건 초기화») 적용한 뒤 손대지 않은 칸만 주소 값으로 맞춘다 — 고치던 칸은 지우지 않는다. [초기화] 는 조건이 있거나 정렬 · 쪽당 개수가 기본값과 다를 때(`canResetList`) 보이고, 누르면 기억한 쪽당 개수(쿠키)를 지우고 칸을 비운 뒤 맨 주소로 간다 — 이미 맨 주소면(쿠키 개수만 달랐다) `router.refresh()` 로 다시 그린다. 최근 검색은 조건이 있는 이동(`hasConditions`)만 «검색어: 홍 · 상태: 사용 중» 같은 이름으로 남긴다. [검색] 버튼 · 조건 칩은 없다(적용된 값은 각 칸에 보인다). 표([AdminTable](../../src/domains/admin/components/features/AdminList/AdminTable.tsx))는 마지막 쪽을 넘긴 주소(2쪽 이상인데 빈 쪽)면 «이 쪽에는 항목이 없습니다» + [1쪽으로](쪽 번호는 그대로)를 띄운다.
- **목록**: [AdminTable](../../src/domains/admin/components/features/AdminList/AdminTable.tsx) — 테두리 있는 표(회색 머리) · 머리 눌러 정렬 · 줄 누르면 상세(Ctrl/⌘ 는 새 탭) · 줄 체크 일괄 처리 · 아래 «총 N건 · 10/20/50/100개씩(쿠키로 기억) · 쪽 번호». 좁은 화면은 카드. 그린 쪽의 주소 · 줄 순서를 탭 저장소에 남겨 상세의 [목록] · 이전/다음이 쓴다([listMemory](../../src/domains/admin/lib/listMemory.ts)).
- **상세**: 머리에 [목록] · 이전/다음 · [수정] 만 두고, 자주 쓰지 않는 동작(비밀번호 초기화 · 끄기/켜기 · 변경 이력)은 «더 보기»(⋯) 메뉴 하나로 접는다(좁은 화면에서 버튼이 여러 줄로 넘치지 않게). 확인 창 · 이력 창은 메뉴 밖에 두고 `open` · `onOpenChange` 로 연다(ConfirmAction · HistorySheet 의 버튼 없는 쓰임). 맨 아래 수정 시각 · 사람 한 줄([RecordMeta](../../src/domains/admin/components/features/Detail/RecordMeta.tsx)).
- **불러오는 중**: 다른 화면으로 가는 순간 브라우저가 본문 자리에 뼈대를 그린다([PendingScreen](../../src/domains/admin/components/features/PendingScreen/index.tsx) · [ScreenSkeleton](../../src/domains/admin/components/features/ScreenSkeleton/index.tsx)) — 서버에서 받는 `loading.tsx` 는 두지 않는다(2026-11-24, 사용자 결정). 운영 실측: 처음 가는 화면은 `loading.tsx` 뼈대부터 서버에서 받아야 떠서 0.17초쯤 늦고, React 는 Suspense 뼈대를 한 번 보이면 0.3초는 두고 바꿔서 서버가 0.2초 만에 답해도 0.3~0.5초를 기다렸다. 이 뼈대는 Suspense 가 아니라 새 화면이 그려지면 곧바로 거둔다. 같은 화면의 조건만 바꾸는 이동(검색 · 쪽 · 정렬)은 뼈대 없이 지금 목록을 둔 채 새 목록이 오면 바꾼다. 가는 도중에 지금 화면을 다시 고르면(앞 이동을 Next 가 버린다) 뼈대를 거둔다. 주소줄로 처음 열 때는 뼈대 없이 화면이 한 번에 온다. 위쪽 진행 표시줄([NavigationProgress](../../src/domains/admin/components/features/NavigationProgress/index.tsx) — 링크 클릭은 스스로 알아채고, `router.push` 로 옮기는 곳(목록 줄 · 검색 · 저장 뒤 상세로)은 [useAdminNavigate](../../src/domains/admin/hooks/useAdminNavigate.ts) 를 쓴다). 목록 줄은 마우스를 올리면 그 화면을 미리 받기 시작한다. 왼쪽 메뉴 링크도 올렸을 때만 미리 받는다([IntentLink](../../src/domains/admin/components/features/IntentLink/index.tsx) — Next 공식 hover-triggered prefetch). 보이면 미리 받는 기본 방식이면 무엇을 저장할 때마다 미리 받은 화면이 모두 다시 받아졌다(저장 한 번에 14건 → 2건, 2026-11-23 측정). 2026-11-24 부터 관리자 화면의 **모든 링크**(첫 화면 카드 · 목록 줄 · 정렬 · 쪽 번호 · 버튼 링크)가 IntentLink 다 — 운영 실측으로 첫 화면을 열자마자 미리 받기 12건, 목록은 줄마다 1건이 나갔다. 관리자 화면은 요청마다 그리므로 데이터는 어차피 누른 뒤에 받는다. `next/link` 를 관리자 코드에서 직접 쓰면 lint 가 막는다(로그인 전 화면은 예외, [eslint.config.mjs](../../eslint.config.mjs)).
- **빠르게 그리기(2026-11-23)**: 페이지는 권한 확인(`requirePermission`)과 화면 데이터 읽기를 `Promise.all` 로 함께 시작한다 — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 RLS). 저장한 뒤 화면은 Server Action 이 다시 그려 보내므로(`revalidatePath`) 화면 쪽에서 `router.refresh()` 를 또 부르지 않는다(실패해서 지금 값을 다시 읽을 때만).
- **왼쪽 메뉴 숫자**: `AdminNavItem.badge`(값은 패키지 C).
- **엑셀 다운로드**: 메뉴의 `actions` 에 `export` 가 있고 그 권한이 있을 때만 버튼 — 지금은 새가족(패키지 C)만.
- **새 사용자 · 새 그룹은 단계로 나눈다(2026-11-24 사용자가 시안 B · G1 을 골랐다)**. 수정 화면은 그대로 한 장짜리 폼이다(아래 «등록 · 수정»).
  - **새 사용자**([UserCreateForm](../../src/domains/admin/components/widgets/UserCreateForm/index.tsx)): 한 화면에 단계 카드가 세로로 — 1 기본 정보(이름 · 이메일) → 2 역할(그룹 카드 · 담당 부서) → 3 확인 → [계정 만들기]. 한 번에 한 단계만 열리고, 끝낸 단계는 한 줄 요약(«홍길동 · a@b.c» · «콘텐츠 담당 · 영아부»)으로 접힌다. **접힌 단계는 머리 전체가 버튼**이라(Base UI Collapsible — Enter · Space · aria-expanded) 누르면 그 단계가 다시 열린다(오른쪽 «바꾸기» 는 눈에 보이는 표시일 뿐). 단계 상태는 [formSteps](../../src/domains/admin/lib/formSteps.ts) — 닿지 않은 단계는 열지 않고, 앞 단계를 고친 뒤 [다음] 은 가장 멀리 갔던 단계로 바로 간다. 기본 정보를 떠날 때(다음 · 다른 단계 머리) 이름 · 이메일을 같은 zod 스키마로 먼저 검사해 그 칸에 오류를 단다. Enter · Ctrl/⌘+S 는 열린 단계의 주 버튼(다음 · 계정 만들기). 만들 때 검사 · 서버 오류(이메일 중복 등)가 나면 그 칸이 있는 가장 앞 단계를 다시 연다(`stepWithError` · 서버 오류는 `routeServerErrors` 가 «groupIds.0» → «groupIds» 로 모으고 화면에 없는 칸은 버린다 — 알림으로만). 낼 때마다 지난번 서버 칸 오류를 지우고 다시 본다(`clearSubmitErrors` — 고치지 않은 칸의 서버 오류로 TanStack Form 이 제출을 조용히 막지 않게). 단계 검사 · 서버 오류 붙이기(`checkFields` · `applyStepServerErrors`)는 AdminForm 에 두고 새 그룹과 함께 쓴다. 만든 뒤는 전과 같다 — 임시 비밀번호 창에서 [상세로] · [계속 등록](폼 · 단계를 처음으로). 쓰던 내용은 보관하지 않는다(비밀번호가 오가는 화면).
  - **그룹 카드와 «이 사람이 갖게 될 권한»**: 페이지가 관리자 메뉴와 그룹 권한(`menus` + `group_permissions` 한 번에 — 다른 읽기와 함께)을 읽어, 카드마다 그 그룹이 주는 메뉴를 한 줄로(«주보 · 주일광고 · 성복의 뜰 외 3개»), 역할 · 확인 단계에는 고른 그룹의 권한을 합쳐 같은 기능 묶음끼리 한 줄씩(«주보 · 주일광고 — 조회 · 등록 · 수정») 보인다([permissionSummary](../../src/domains/admin/lib/permissionSummary.ts) — 메뉴 순서 · 기능 이름은 권한 표와 같다). 그룹 권한은 «그룹 · 권한» 조회 권한이 있어야 읽히므로(RLS) 없으면 카드에 그룹 설명을 보이고 권한 요약은 뺀다. 고를 그룹은 전과 같다(`groupChoices` — «전체 관리» 가 아니면 내 그룹만, «전체 관리» 그룹은 없다).
  - **담당 부서는 늘 묻는다**(역할 단계, 공용 [DepartmentField](../../src/domains/admin/components/features/DepartmentField/index.tsx) — 수정 화면과 같은 부품): 담당 부서는 «다음세대 부서» · «사용자» 권한의 범위만이 아니라 **누가 이 계정을 관리하는지**도 정한다(`in_my_department` → `can_manage_user` — 부서를 비우면 부서 범위가 있는 담당자는 이 사람을 관리하지 못한다). 그래서 고른 그룹과 상관없이 칸을 보이고, 고른 값을 그대로 보낸다(«정하면 그 부서 담당자가 이 사람을 관리하고, «다음세대 부서» 에서 그 부서만 다룹니다.»). 부서 범위가 있는 사람은 늘 그 부서로 고정해 보인다(전과 같다). 권한 요약에는 그 메뉴 이름 뒤에 부서를 붙인다(«다음세대 부서(영아부)»).
  - **새 그룹**([GroupCreateForm](../../src/domains/admin/components/widgets/GroupCreateForm/index.tsx), «전체 관리» 만 — 전과 같다): 위에 단계 표시(Stepper), 카드 하나에 1 이름 · 설명 → 2 메뉴 권한 표(같은 PermissionMatrix — 줄 · 기능 칸 한꺼번에, 조회 함께 켜기). [이전] 으로 돌아가도 쓴 것은 남는다. [그룹 만들기] 는 `createGroup` 그대로(이름 · 설명 · 권한을 한 트랜잭션), 만들면 상세로. 이름 · 설명 · 고른 권한은 전처럼 임시 보관한다(`groups:new`).
  - 펼치고 접을 때 움직임은 두지 않는다(줄이는 움직임 설정과 상관없이 바로 바뀐다). 단계 틀은 [FormSteps](../../src/domains/admin/components/features/FormSteps/index.tsx).
- **등록 · 수정**: 넓은 화면은 카드를 나란히(기본 정보 · 그룹/권한), 화면 아래에 붙은 막대([FormActions](../../src/domains/admin/components/features/AdminForm/index.tsx))에 취소 · 저장. 필수 칸 *, 글자 수. 그룹 권한은 «메뉴 × 기능» 표([PermissionMatrix](../../src/domains/admin/components/widgets/PermissionMatrix/index.tsx) — 상세는 보기 전용, 폼은 체크). 폼(«전체 관리» 만 연다)에서는 메뉴 이름 옆 체크로 그 줄, 기능 이름 아래 체크로 그 기능 칸을 한꺼번에 켜고 끈다(모두 · 일부 · 없음 세 모양. `rowKeys` · `columnKeys` · `bulkState` · `toggleCells`). 표를 고치는 사람이 «전체 관리» 뿐이라 막힌 칸은 없다 — 그 메뉴에 없는 기능 «–» 에 올리면 «이 메뉴에는 없는 기능입니다»(`NO_ACTION`)가 뜬다. «보기만» 같은 줄 모음 선택은 두지 않았다(줄 체크 · «조회» 칸 체크로 두 번이면 된다). **조회가 있어야 다른 기능을 쓴다(2026-11-23)** — 다른 기능을 켜면 그 줄의 조회도 켜고, 조회를 끄면 그 줄의 다른 칸도 끈다. 줄 · 기능 칸 한꺼번에 고르기도 같다(`toggleCells`). 화면에서만 맞춘다(DB 는 막지 않는다). 좁은 화면에서는 표 안에서만 옆으로 밀리고 메뉴 이름 칸이 왼쪽에 붙어 있다. 기능 이름은 교회 사무실에서 바로 알아보게 «조회 · 등록 · 수정 · 삭제 · 영구 삭제 · 엑셀로 받기 · 변경 이력 보기»([permissionMatrix](../../src/domains/admin/lib/permissionMatrix.ts) `ACTION_LABELS` — 이름표만, DB 코드 `PURGE` · `EXPORT` · `HISTORY` 는 그대로).
  - **역할: «전체 관리» 와 그 밖의 사용자 관리자(2026-11-23 결정 — 단순화, 설계 6.4 ① · ②)**:
    - **그룹 만들기 · 고치기(이름 · 설명 · 권한 표 · 끄기 · 켜기)는 «전체 관리» 만** — 그룹 권한이 있어도 그 밖의 사람은 못 한다. DB 가 막는다(`guard_groups` · `guard_group_permissions` — 행 권한은 그대로 두고 지키는 규칙이 «전체 관리» 가 아니면 거절). 화면: 목록의 [새 그룹], 상세의 [수정] · «더 보기» 의 끄기/켜기는 «전체 관리» 에게만 그리고, 등록 · 수정 주소는 404([requireFullAdmin](../../src/domains/admin/api/server/myGroups.server.ts)), 액션은 `actionFullAdmin` 으로 DB 전에 «권한이 없습니다». 상세의 권한 표는 누구에게나 보기 전용. 판정은 [loadMyGroups](../../src/domains/admin/api/server/myGroups.server.ts)(내 user_groups 를 한 번 읽어 «전체 관리» 인가 · 내 그룹 id — 요청마다 한 번).
    - **그 밖의 사용자 관리자는 자기가 속한 그룹에만 사람을 넣고 뺀다**(`guard_user_groups` — `private.is_my_group`, 꺼진 내 그룹도 내 그룹). **넣고 빼는 대상도 관리할 수 있는 사람(`can_manage_user`)일 때만** — 남의 그룹에도 속한 사람에게서 내 그룹을 빼 권한을 깎지 못한다. 바꾸기 전 소속으로 본다(BEFORE 트리거 — 그룹 없는 새 계정 · save_user 의 줄마다 넣고 빼기는 그대로 된다). 같은 그룹이면 그 그룹의 권한(꺼진 메뉴의 잠자는 권한도)이 나와 같이 살고 같이 자서 따로 «그 그룹의 권한을 모두 가졌는가» 를 볼 필요가 없다 — 그 판정(`holds_group_permissions`)과 «꺼진 그룹 켜기는 권한을 모두 가졌을 때만» 규칙은 지웠다. `can_manage_user`(비밀번호 초기화 등)는 대상이 속한 그룹이 **모두** 내 그룹이고(그룹이 없어도 된다) 내 부서 범위 안일 때만. **다른 사람의 사용자 정보(이름 · 부서 · 끄기 · 켜기)도 `can_manage_user` 일 때만 고친다**(`guard_profiles` — save_user 는 사용자 정보를 그룹보다 먼저 고쳐 바꾸기 전 그룹으로 본다. 그룹 없는 새 계정도 관리할 수 있다): 상세의 [수정] 과 수정 주소는 [canEditUser](../../src/domains/admin/lib/userAccess.ts)(수정 권한 + 자기 자신이거나 관리할 수 있음 — 아니면 404), 목록의 일괄 끄기/켜기(`setUsersActive`)는 미리 확인하지 않고 한 명씩 고쳐 `guard_profiles` 에 맡기고, 다른 사람의 줄이 막히면(42501) 건너뛰어 «내가 관리할 수 없는 사용자는 바꾸지 않았습니다» 로 알린다. 사용자 폼은 [groupChoices](../../src/domains/admin/lib/groupScope.ts) 로 내 그룹만 고르게 한다(남의 그룹 사람은 수정 화면이 열리지 않아 잠긴 남의 그룹 칸은 없앴다). `createUser` · `updateUser` 는 넣거나 뺀 그룹 중 내 그룹이 아닌 것이 있으면(`outsideGroups`) Auth API · DB 전에 «내가 속한 그룹에만 넣고 뺄 수 있습니다.»(그룹 칸 오류). 내 그룹이 없으면 그룹 없이 만든다(폼은 `Empty` 로 알린다). 수정 화면의 임시저장을 되살릴 때는 지금 고를 수 있는(잠기지 않은) 그룹의 변경만 얹는다(`applySetChanges` 의 `only`).
    - **«전체 관리» 소속은 화면에서 아무도 바꾸지 않는다(2026-11-23 결정, 설계 6.4 ⑥)** — «전체 관리» 도. `guard_user_groups` 가 로그인한 세션의 넣기 · 빼기를 막고(만능 키 · SQL 편집기 · 변경 파일처럼 `auth.uid()` 가 없으면 된다), `save_user` 는 목록에 없어도 그 소속을 지우지 않는다. 폼은 그 그룹을 내지 않고 이미 속했으면 잠긴 줄로 보여 주며, `createUser` · `updateUser` 는 넣거나 빼면(`touchesSystemGroup` · `loadSystemGroupIds`) Auth API · DB 전에 ««전체 관리» 소속은 화면에서 바꿀 수 없습니다.». 운영자 절차는 [deploy-and-env.md](../workflow/deploy-and-env.md).
  - **내 범위보다 넓게 주지 못한다(2026-11-23 결정, 설계 6.4 ③ · ⑤)**: 부서 범위(`my_department_limit` — «전체 관리» 가 아니고 담당 부서가 있으면 그 부서)가 있으면 다른 사람의 부서는 내 부서로만 정하고 내 부서의 사용자만 고친다(`guard_profiles` · `guard_user_groups`) — 예외 없이: 범위 밖 계정(부서가 빈 방금 만든 계정 · 물러난 관리자의 꺼진 계정 등)을 내 부서로 끌어와 비밀번호를 초기화하지 못한다. `can_manage_user` 도 내 부서 범위 안일 때만. **계정 만들기는 부서를 계정과 함께 정한다**: `createUser` 가 Auth API 를 부르기 전에 내 부서인지 확인하고(부서 범위가 있으면 내 부서로만 — 만능 키라 DB 가 거르지 못한다) `user_metadata: { name, department }` 로 넘기면, 계정이 생길 때 `on_auth_user_changed` 가 사용자 정보의 부서로 넣는다(INSERT 때만 — 로그인한 사람이 `auth.updateUser({ data })` 로 자기 metadata 를 바꿔도 부서는 그대로. 목록에 없는 부서면 계정을 만들지 않는다). 그 뒤 그룹은 로그인한 사람의 세션으로 넣는다(`guard_user_groups` 가 범위 · 내 그룹인지를 본다). 부서는 «사용자 등록» 만으로 정해지므로 계정 만들기는 등록 권한으로 되고(목록의 [새 사용자] · `/admin/users/new` 모두 `users:CREATE`), 그룹을 고르면 지금처럼 «사용자 수정» 도 있어야 한다(없으면 Auth API 전에 «권한이 없습니다»). 화면: 사용자 폼은 담당 부서를 고정해 «내 담당 부서로만 정할 수 있습니다.» 를 띄우고, 범위 밖 사용자는 상세에서 [수정] 을 숨기고 수정 주소는 404.
  - **메뉴 켜기 · 끄기는 «전체 관리» 만(2026-11-23 결정)**: 권한은 메뉴가 켜져 있을 때만 살아 있어서(`user_has_permission`) 메뉴를 켜면 잠자던 내 권한이 깨어나고 끄면 모두의 권한이 빠진다 — `guard_menus` 가 «전체 관리» 가 아닌 사람의 `is_active` 변경을 막는다(이름 · 순서는 메뉴 수정 권한으로 된다). 메뉴 관리 화면은 [loadMyGroups](../../src/domains/admin/api/server/myGroups.server.ts) 로 판정해 사용 스위치를 막고 «메뉴 켜기 · 끄기는 «전체 관리» 만 합니다.» 한 줄을 띄운다(분류 · 코드는 그대로).
- **첫 화면**: 숫자 카드(권한 있는 것만) · 이번 주 할 일 · 아이콘 있는 바로 가기 카드.

- **검색 조건**: [ListToolbar](../../src/domains/admin/components/features/AdminList/ListToolbar.tsx) — 검색어(`/` 로 이동 · 최근 검색 조건 5개, 사용자별 · 로그아웃 때 지움) · 조건 · 기간 · [초기화](모양은 위 «목록 검색 줄»). 검색 · 조건 · 정렬 · 쪽 · 개수가 주소에 남는다([listQuery.ts](../../src/domains/admin/lib/listQuery.ts)). 검색어는 `orIlike` 로만 필터에 넣는다(따옴표 이스케이프 — 필터 문법 끼워 넣기 방지). 개인정보 목록은 `searchInUrl: false`.
- **폼**: TanStack Form + 화면 · 액션이 같은 zod 스키마(`zodFormValidator` · `parseInput`). 글자 칸은 [TextField](../../src/domains/admin/components/features/AdminForm/index.tsx)(이름 · 필수 * · 글자 수 · 오류를 한 덩어리로 — 비밀번호 칸만 따로), 서버 검사에서 틀린 칸은 토스트와 함께 그 칸 아래에도 보인다(`applyServerErrors` — 사용자 · 그룹 · 분류 · 코드 · 비밀번호 폼 모두). [useFormGuards](../../src/domains/admin/hooks/useFormGuards.ts) — 나가기 경고 · Ctrl/⌘+S · 쓰던 내용 임시 보관([formDraft](../../src/domains/admin/lib/formDraft.ts): 사용자별 · 7일 · 저장 · 로그아웃 때 지움 · 사용자 등록 · 새가족 폼은 보관 안 함). 사용자 수정 · 그룹은 «내가 바꾼 것» 만 보관하고([draftChanges](../../src/domains/admin/lib/draftChanges.ts)), 불러오면 새 화면 위에 얹는다 — «다른 사람이 먼저 고쳤습니다» 로 새로고침한 뒤 불러와도 남의 변경을 덮지 않는다.
- **동시 수정**: [updateVersioned](../../src/domains/admin/api/server/versionedUpdate.server.ts) — 열었을 때의 `updated_at` 이 같을 때만 고친다.
- **여러 표를 함께 저장**: 사용자(정보 + 그룹 소속) · 그룹(정보 + 권한 표)은 DB 함수 하나로 한 트랜잭션에 저장한다 — `save_user` · `save_group` · `create_group`([schema.sql](../../supabase/schemas/schema.sql)). 로그인한 사람의 권한으로 돌아(행 권한 · 지키는 규칙 그대로) 하나라도 막히면 아무것도 바뀌지 않는다. 화면을 열었을 때의 `updated_at` 과 그룹 목록 · 권한 표를 함께 보내, 그 사이 다른 사람이 바꿨으면 저장하지 않는다(null → «다른 사람이 먼저 고쳤습니다»). 열었을 때의 목록은 폼이 열릴 때 한 번만 기억한다(페이지 데이터가 새로 와도 바뀌지 않게).
- **순서 바꾸기(메뉴 · 분류 · 코드)**: [SortableRows](../../src/domains/admin/components/widgets/SortableRows/index.tsx) — 줄 앞 손잡이(«<이름> 순서 옮기기»)를 끌어서 옮긴다(dnd-kit, [ADR 0025](../decisions/0025-admin-drag-reorder-dnd-kit.md)). 키보드는 손잡이에서 스페이스 · 엔터로 집고 ↑↓ 로 옮긴 뒤 스페이스 · 엔터로 놓는다(Esc 취소), 화면 낭독기 문장은 한글([sortAnnouncements](../../src/domains/admin/components/widgets/SortableRows/sortAnnouncements.ts)). 손가락은 손잡이에서 4px 넘게 움직여야 끌린다(이름 칸 · 스위치 누르기는 그대로). 놓으면 바로 그 순서로 보이고(useOptimistic) 무리 전체의 새 순서를 Server Action 한 번(`reorderMenus` · `reorderCategories` · `reorderCodes`)으로 보내, DB 함수 `reorder_rows(표, id 목록)` 가 한 트랜잭션에 10, 20, 30 … 을 매긴다(값이 바뀐 줄만 고쳐 이력도 그 줄만). 받은 목록이 무리(메뉴: 같은 영역 · 같은 상위, 분류 · 코드: 같은 묶음)와 정확히 같지 않으면(그사이 줄이 더해짐 등) 아무것도 바꾸지 않고 «목록이 그사이 바뀌었습니다» — 화면은 서버의 순서로 돌아가고 다시 읽는다. 무리의 줄을 잠가 동시에 옮기면 차례로 돈다. 잠긴 줄(«항상 켜짐»)도 순서는 옮긴다. 좁은 화면(390px)은 둘째 칸(주소 · 코드 값)을 이름 밑에 작게 보인다.
- **알림 · 확인**: 결과는 `notifyResult` 토스트(화면은 [useAdminAction](../../src/domains/admin/hooks/useAdminAction.ts) 으로 부른다 — 기다리는 동안 pending, 끝나면 토스트, 뒤처리는 `after`)(오류 원문은 [toActionError](../../src/domains/admin/lib/actionResult.ts) 가 쉬운 문구로). 되돌리기 어려운 동작은 [ConfirmAction](../../src/domains/admin/components/features/ConfirmAction/index.tsx)(문구 고정 — 끄기는 대상마다 뜻이 달라 사용자 `deactivate` «로그인 · 선택 목록에서 빠집니다» · 그룹 `deactivateGroup` «구성원이 이 그룹으로 받은 권한을 쓸 수 없고 선택 목록에서 빠집니다»).
- **이력**: 상세 화면(메뉴 · 코드는 목록 화면) 머리의 «변경 이력» 버튼 → 오른쪽 창, 한 건마다 «항목 | 이전 | 이후» 표([HistorySheet](../../src/domains/admin/components/features/HistorySheet/index.tsx), 그 메뉴의 «변경 이력 보기»(HISTORY) 권한이 있을 때만 버튼이 보이고 서버 액션 `loadHistory` 가 다시 확인) · 전체는 `/admin/audit`(표 + «자세히» 창). 칸 · 값은 한글로([auditFormat](../../src/domains/admin/lib/auditFormat.ts) · [auditLabels](../../src/domains/admin/lib/auditLabels.ts) — 표에 칸을 더하면 이름표에도 더한다), id 는 이름으로, 새가족 개인정보 칸은 «(값 숨김)».
- **코드 · 분류 읽기**: 드롭다운 · 조건 · 표의 이름은 `getCodeBook()` · `getCategoryBook()`([codeBook.server.ts](../../src/shared/api/codeBook.server.ts) — 캐시 없이 그릴 때마다 DB 에서 읽고 한 요청 안에서만 중복 제거, [ADR 0023](../decisions/0023-codes-read-without-cache.md))에서 읽고 `codeOptions` · `codeLabel` · `categoryOptions`([codeBook.ts](../../src/shared/api/codeBook.ts))로 만든다. 코드 관리 · 분류 관리 화면은 고치기 위해 줄마다 판(updated_at)까지 따로 읽는다.
- **메뉴 찾기**: ⌘K · Ctrl+K 또는 위쪽 막대 «찾기»([CommandMenu](../../src/domains/admin/components/features/CommandMenu/index.tsx), shadcn `command` · cmdk — 관리자 전용).

### 보안 헤더 · 세션

- [proxy](../../src/proxy.ts) 가 `/admin` 응답마다 CSP 를 싣는다([adminCsp.ts](../../src/domains/admin/lib/adminCsp.ts) — 요청마다 새 nonce, 스크립트는 nonce 를 단 것만, 연결 · 그림은 이 사이트와 Supabase 만, 틀 안에 넣기 금지).
- 마지막 요청 뒤 8시간이 지나면 proxy 가 그 세션을 Supabase 에서 끊고 로그인 화면으로 보낸다([idleSession.ts](../../src/domains/admin/lib/idleSession.ts), 쿠키 `admin_last_seen` httpOnly). Supabase 의 refresh token 은 만료가 없어서 이렇게 한다.
- **서버 미리 깨우기(2026-11-24)**: Vercel Hobby 는 몇 분 요청이 없으면 함수를 내리고 다음 첫 요청에 다시 켠다(미리 깨워 두는 «scale to one» 은 Pro 이상). 공개 페이지 · 로그인 화면 · 관리자 화면은 한 함수(`vercel build` 로 확인 — route handler 만 따로)인데, 공개 홈페이지는 CDN 이 미리 만든 파일로 답해 그 함수를 깨우지 않는다. 그래서 관리자 로그인 쿠키(`sb-*-auth-token`)가 있는 브라우저가 공개 페이지를 열면 [AdminWarmup](../../src/shared/components/features/AdminWarmup/index.tsx) 이 **관리자 첫 화면을 한 번 그려 둔다**(3분에 한 번까지, [adminWarmup.ts](../../src/shared/lib/adminWarmup.ts)). 운영 실측(로그인한 브라우저, 15분 쉰 뒤): 바로 `/admin` 3.89초 · 로그인 화면만 깨운 뒤 2.25초 · 첫 화면을 그려 둔 뒤 **0.30초**(그려 두는 요청이 2.7초를 대신 치른다) — 관리자 화면이 처음 하는 일(화면 코드 불러오기 · 로그인 확인 공개키 · Supabase 연결)은 그 화면을 그려야 데워진다. 첫 화면 다음으로 **자주 쓰는 화면들을 하나씩 차례로** 화면 데이터(RSC)로 불러 둔다 — Vercel 은 서버가 켜질 때 화면 코드를 미리 부르지 않아(Next `preloadEntriesOnStart` 가 Vercel 방식 minimal mode 에서는 꺼진다) 화면마다 처음 부를 때 0.3~0.8초가 더 든다(운영 실측, 같은 서버에서 화면 데이터: 사용자 추가 처음 1.04초 · 다시 0.22초, 그룹 만들기 0.53초 · 0.28초). 어떤 화면을 어떤 순서로 부를지는 [adminScreens.ts](../../src/shared/config/adminScreens.ts) 한 곳에서 정한다 — 앞으로 만들 화면까지 자주 쓰는 순서(매주 할 일 → 콘텐츠 → 사람·권한 → 기록·설정)로 미리 적어 두었고, 그중 만든 화면만 앞에서 6개까지 부른다(사용자가 맡김 — 쓰면서 바꾼다). 새 화면을 만들어 `ADMIN_SCREENS_READY` 에 더하고 순서에 자리를 정하지 않으면 테스트가 실패한다. 등록 · 상세 같은 하위 화면은 부르지 않는다. 깨우기 요청은 표시 헤더 `x-admin-warm` 을 달고, proxy 는 이 요청에 «마지막 요청 시각» 을 남기지도 지우지도 않는다 — 공개 페이지를 열었다고 8시간 규칙이 늘어나면 안 된다(8시간이 지난 세션은 그대로 끊는다). 넘겨 보내기는 따라가지 않는다(꺼진 계정의 로그아웃 주소를 공개 페이지가 열지 않게). 공개 번들에 실리므로 `shared` 에 둔다(아래 «공개 쪽과의 경계»).

- **틀**: [AdminShell](../../src/domains/admin/components/widgets/AdminShell/index.tsx) — **shadcn 의 sidebar 부품과 dashboard 배치를 원본 값 그대로 쓰고 색만 이 사이트 팔레트로 바꾼다**([ADR 0016](../decisions/0016-admin-ui-follows-shadcn.md), 사용자 결정 2026-11-18). 왼쪽 메뉴(위: 교회 표시 · 가운데: 메뉴 · 아래: 로그인한 계정과 «로그아웃») + 위쪽 막대(메뉴 버튼 · 화면 제목) + 본문. 화면 제목(`h1`)은 위쪽 막대가 지금 메뉴 이름으로 그린다 — 페이지는 제목을 따로 그리지 않는다.
  - `md`(768) 이상: 왼쪽 메뉴(256px)를 아이콘만 남기고 접을 수 있다(메뉴 버튼 · 메뉴 가장자리 · Ctrl/⌘+B — 글 편집기가 들어오면 굵게 단축키와 겹치는지 본다). 접힘 상태는 쿠키 `sidebar_state` 에 남아 다음 방문 때 같은 모양으로 그린다. 그 아래 폭: 메뉴 버튼이 왼쪽 시트를 연다.
  - 부품은 [ui/sidebar](../../src/shared/components/ui/sidebar.tsx)(shadcn base-nova 원본, Base UI — 다른 곳은 파일 머리 주석의 목록뿐이다). 메뉴 항목을 링크로 그릴 때는 `render={<Link … />}` 를 쓴다. «동작 줄이기» 설정에서는 `globals.css` 가 전환을 끈다. 색은 `--sidebar-*` 의미 토큰이 B1 을 가리킨다([color-palette.md](../design/color-palette.md)).
  - 메뉴는 DB(`menus`)에서 묶음별로 그린다. 아이콘은 화면 코드가 `key` 로 고른다([AdminSidebar](../../src/domains/admin/components/widgets/AdminShell/AdminSidebar.tsx) 의 `MENU_ICONS`). 왼쪽 메뉴 아래의 계정 메뉴에 «비밀번호 바꾸기» · «로그아웃».
  - 공개 사이트의 헤더·푸터·부드러운 스크롤은 없다(그것들은 `src/app/(site)/layout.tsx` 에만 있다).
- **로그인 · 비밀번호 바꾸기 화면**: 둘이 같은 틀 [AuthFrame](../../src/domains/admin/components/features/AuthFrame/index.tsx) 을 쓴다 — shadcn 로그인 블록 login-03 모양(옅은 `bg-muted` 바탕 · 가운데 카드 · 위에 왼쪽 메뉴와 같은 ChurchIcon 교회 표시, 공개 사이트 HomeLogo 는 가져오지 않는다). 비밀번호 칸은 [PasswordInput](../../src/domains/admin/components/features/PasswordInput/index.tsx)(InputGroup 의 보기 · 숨기기 단추 + Caps Lock 안내 — [useCapsLock](../../src/domains/admin/hooks/useCapsLock.ts), aria-live). 로그인 화면은 글자를 줄였다(제목 아래 설명 없음, 2026-11-23 사용자) — 비밀번호 칸 이름 옆 «비밀번호를 잊으셨나요?» 링크(login-03 자리)와 카드 아래 «홈페이지로 돌아가기», 비밀번호를 꼭 바꿔야 하는 사람에게는 «로그아웃»(UserMenu 와 같은 `signOut` + 임시 보관 지우기)을 둔다.
- **폼과 안내**: 로그인 폼은 shadcn 의 `FieldGroup` · `Field` · `Alert`, 화면은 `Card` 로 짠다 — 관리자 폼의 기본 모양이다(규칙은 [.claude/skills/shadcn](../../.claude/skills/shadcn/SKILL.md), 이 프로젝트의 추가 규칙은 `CLAUDE.md` 의 «shadcn 부품 작업»). 기다리는 동안의 버튼은 `Spinner`, 없는 주소 안내는 `Empty` 를 쓴다. 전에 이 사이트가 만든 `FormField` · `EmptyState` · sonner `Toaster` 는 지웠다(각각 `Field` · `Empty` · `toast` 로 대체).
- **검색 제외**: `src/app/admin/layout.tsx` 가 관리자 전체에 `noindex, nofollow` 를 건다.
- **`(panel)` 묶음**: 로그인해야 보이는 화면은 전부 `src/app/admin/(panel)/` 아래에 둔다 — 그 레이아웃이 로그인을 확인하고 틀을 그린다. 로그인 화면만 묶음 밖이다.

## 로그인 흐름

> 비밀번호 찾기(메일 링크)는 만들어 두었지만 **꺼 두었다** — 메일 서비스(Resend)를 붙일 때 켠다(`PASSWORD_RESET_ENABLED`, deploy-and-env 9절).

1. `/admin/*` 요청은 [src/proxy.ts](../../src/proxy.ts) 를 지난다(매처 `/admin/:path*` 하나뿐 — 공개 페이지는 지나지 않는다). proxy 는 로그인 쿠키를 갱신하고([proxySession.server.ts](../../src/shared/api/supabase/proxySession.server.ts)), 로그인하지 않았으면 `/admin/login?next=<오던 곳>` 으로 보낸다. 로그인한 사람이 로그인 화면에 오면 `next` 로 보낸다.
2. 로그인 폼은 Server Action [signIn](../../src/domains/admin/api/actions/authActions.ts) 을 부른다: 값 검증([loginInput.ts](../../src/domains/admin/lib/input/loginInput.ts)) → Supabase Auth → `next` 로 이동. 실패하면 안내 문구와 적었던 이메일을 돌려준다(비밀번호는 돌려주지 않는다).
3. `(panel)` 레이아웃과 페이지는 [requireAdminUser](../../src/domains/admin/api/server/session.server.ts) 로 한 번 더 확인한다.
4. «로그아웃» 은 Server Action `signOut` — 세션을 끝내고 로그인 화면으로 보낸다.
5. **비밀번호 찾기(스스로)**: 로그인 화면의 «비밀번호를 잊으셨나요?» → `/admin/login/forgot` 에서 이메일 → Server Action [requestPasswordReset](../../src/domains/admin/api/actions/authActions.ts) 이 `resetPasswordForEmail` 을 부른다 → 메일의 링크 `<Site URL>/admin/login/confirm?token_hash=…&type=recovery` → route handler([confirm/route.ts](../../src/app/admin/login/confirm/route.ts))가 `verifyOtp` 로 그 계정에 로그인시키고(쿠키) `/admin/password` 로 → 새 비밀번호를 정하면 `/admin`. 링크 읽기 · 경로는 [passwordReset.ts](../../src/domains/admin/lib/passwordReset.ts). 만료 · 이미 쓴 링크면 `/admin/login?reason=reset_expired`.
   - **링크는 token_hash 로 만든다**(PKCE `code` 가 아니다) — `code` 는 요청한 브라우저의 쿠키가 있어야 바꿀 수 있어서, PC 에서 요청하고 휴대폰 메일에서 열면 실패한다. 링크의 모양은 Supabase 메일 양식이 정한다: 로컬은 [supabase/templates/recovery.html](../../supabase/templates/recovery.html)(`config.toml` 의 `[auth.email.template.recovery]`), 운영은 대시보드 — 설정 절차는 [deploy-and-env.md](../workflow/deploy-and-env.md) 9절. 양식을 바꾸기 전의 기본 링크(`?code=`)도 확인 주소가 받는다(요청한 브라우저에서만 된다).
   - **계정이 있는지 알려 주지 않는다.** 결과는 늘 «입력한 주소로 메일을 보냈습니다…» 하나다. 계정이 있을 때만 나는 거절(메일 발송 실패 · 기본 메일로 팀 밖 주소)도 같은 결과로 답하고 원인은 서버 로그에만 남긴다(이메일은 찍지 않는다). 횟수 제한(429)은 «잠시 뒤에 다시 시도해 주세요.», 연결 실패는 «메일을 보내지 못했습니다…».
   - **확인 주소는 로그인했어도 지나간다**([authRedirect.ts](../../src/domains/admin/lib/authRedirect.ts) — 막으면 링크의 계정으로 바꿔 들지 못한다). 찾기 화면은 다른 로그인 화면처럼 로그인한 사람을 첫 화면으로 보낸다. 8시간 쉰 세션이 남은 브라우저에서 링크를 열면 proxy 가 먼저 로그아웃시키고 로그인 화면으로 보낸다 — 링크는 쓰이지 않았으니 다시 누르면 된다.
   - **새 비밀번호를 정할 때 지금 비밀번호는 묻지 않는다**(로그인한 세션이 본인 확인 — 링크로 들어온 사람도 같은 화면 · 같은 `changePassword`). 바꾸면 «비밀번호를 바꿔야 함» 을 끄고, 같은 계정의 다른 기기 로그인을 끊는다(`signOut({ scope: 'others' })` — 이 기기는 남는다).
   - **메일이 실제로 가려면 운영에 메일 서비스(Resend)를 붙여야 한다.** 그 전까지 Supabase 기본 메일은 프로젝트 팀 구성원 주소에만, 시간당 2통까지 간다. 코드는 그대로 두고 대시보드 설정만 하면 된다([설계](../specs/2026-11-17-admin-design.md) 12절 1 · 2번).

지켜야 할 것:

- **서버에서 사용자 확인은 `getClaims()` 만 쓴다.** 토큰 서명을 검증한다. `getSession()` 은 쿠키를 그대로 믿으므로 서버 코드에서 쓰지 않는다(테스트가 부르지 않는지 확인한다).
- **`next` 는 `/admin` 안 경로만 받는다**([authRedirect.ts](../../src/domains/admin/lib/authRedirect.ts) 의 `safeNextPath`). `https://…` · `//…` · `/\…` · `/admin/../…` · 제어 문자는 `/admin` 으로 바꾼다. 로그인 화면 자체로는 되돌리지 않는다.
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

- **환경변수가 없어도 공개 사이트는 빌드되고 열린다.** `/admin` 은 로그인 화면으로 가고, 로그인 화면은 칸 대신 «관리자 로그인이 아직 설정되지 않았습니다.» 안내(Alert)를 보여 준다.
- **프로젝트 주소와 키를 코드·문서에 적지 않는다** — 환경변수로만 받는다. 지금 운영 프로젝트는 개인 계정에 있고 나중에 교회 계정으로 옮긴다.
- 권한 판정은 DB 함수 `private.has_permission(메뉴 key, 기능)` 하나다(`private` 스키마는 API 로 열리지 않는다). 화면 · Server Action 은 `private` 을 부를 수 없으므로 `rpc('my_permissions')`(로그인한 사람의 (메뉴 key, 기능) 목록)로 받는다 — 막는 것은 여전히 RLS 다. 로그인 계정이 생기면 트리거가 `profiles` 를 만든다.
- 만능 키(secret key)는 아직 어디에서도 쓰지 않는다. 브라우저용 클라이언트도 아직 없다(처음 쓰는 곳은 파일 올리기 — 패키지 3).
- 로컬 개발(podman 으로 로컬 Supabase 띄우기 · 로컬 계정 만들기)과 운영 DB 에 변경 파일을 적용하는 절차는 [deploy-and-env.md](../workflow/deploy-and-env.md) 4절 · 6절.

## 공개 쪽과의 경계

공개 사이트 번들에 관리자 코드가 실리지 않게 lint 가 막는다([eslint.config.mjs](../../eslint.config.mjs), 테스트 [adminBoundary.test.ts](../../tests/lint/adminBoundary.test.ts)).

- `src/**` 전체에서 관리자 코드(`@/domains/admin/**` · `@/app/admin/**` · 상대 경로 `../admin/…`)와 `@tanstack/react-form` · `react-hook-form` · `@hookform/*` · `@tanstack/react-table` · `@supabase/*` 를 import 하지 못한다. 루트 레이아웃 · `_provider` · `shared/lib` 처럼 모든 공개 페이지에 실리는 파일도 대상이다.
- 예외는 관리자 자신(`src/domains/admin/**` · `src/app/admin/**` · `src/proxy.ts`)뿐이다. 연결 계층(`src/shared/api/supabase/**` — 공개 화면의 저장소 계층이 서버에서 DB 를 읽을 때 쓴다, 패키지 3 부터)은 Supabase 라이브러리만 쓸 수 있고 관리자 코드는 못 가져온다.
- `import()` · `require()` 는 이 규칙이 잡지 못한다 — 검토에서 본다.

## 콘텐츠(패키지 B)

### 파일 올리기 통로(설계 6.8)

- **바이트는 서버를 거치지 않는다.** 화면이 처음 파일을 고를 때 올리는 자리(빈 묶음)를 하나 만들고(`createUploadList`), 파일마다 서버가 로그인한 사람의 세션으로 «한 번 쓰는 올리기 주소» 를 만든다(`signUpload` — Storage 권한 규칙 `media_insert` 가 이때 경로의 메뉴 · 묶음을 본다. 다른 메뉴 경로 · 방문자는 거절, 로컬 Storage 로 확인). 브라우저는 그 주소로 XHR PUT(진행 표시 — [putFile](../../src/domains/admin/components/features/FileListField/putFile.ts)). 경로는 `<메뉴>/<묶음 id>/<파일 id(uuid v7)>.<확장자>`, 1년 캐시(내용이 바뀌지 않는 주소).
- **그림은 올리기 전에 줄인다**([prepareImage](../../src/domains/admin/components/features/FileListField/prepareImage.ts)): 긴 변 2000px 를 넘거나 PNG 면 WebP(품질 0.85)로 다시 만든다 — 브라우저가 WebP 를 못 만들면(일부 Safari) JPEG. 한도 안의 WebP · JPEG 는 그대로. 사진의 회전 정보를 반영한다. 줄였으면 한 번 알린다.
- **파일 줄은 저장할 때 한 번에 적는다**([fileList.server](../../src/domains/admin/api/server/fileList.server.ts) `writeFileList`): 화면은 쪽 목록(순서 · 빼기)만 들고 있다가, 저장하면 서버가 **새 묶음**을 만들어 그 순서대로 적고 글이 새 묶음을 가리키게 바꾼다. 그래서 저장하기 전에는 공개 화면이 바뀌지 않고, 다시 시도해도 안전하며, 순서 바꾸기에 DB 함수가 필요 없다. 앞 묶음은 주인 없는 묶음이 되어 예약 작업(패키지 D)이 지운다 — Storage 파일은 가리키는 줄이 하나도 없을 때만. 글이 가리킬 수 있는 경로는 **그 메뉴 아래**뿐이다(`isAllowedPath` — 고치기 · 복제는 앞 묶음의 파일을 그대로 가리킨다, 다른 메뉴의 파일은 못 가리킨다).
- 새 묶음의 id 는 서버가 만들고 돌려받지 않는다 — 넣는 문장 안에서는 읽기 규칙(`can_read_list`)이 새 묶음을 아직 못 봐서 «넣고 돌려받기» 가 권한 오류가 된다(로컬에서 확인).
- 칸: [FileListField](../../src/domains/admin/components/features/FileListField/index.tsx) — 고르기 · 끌어 놓기, 하나씩 차례로, 실패한 파일은 줄에 까닭과 [다시 올리기] · [빼기], 순서는 화살표 단추(휴대폰에서도 끌 필요 없음). 올리는 동안 폼은 저장을 막는다. 순서 · 실패 처리는 [useFileUploads](../../src/domains/admin/hooks/useFileUploads.ts).

### 콘텐츠 화면 공통

- **상태**: 임시저장 · 공개, 휴지통은 따로(`deleted_at`). 목록의 «삭제된 항목» 스위치로 휴지통을 본다. 배지 `ContentStatusBadge`.
- **등록 · 수정은 한 장 폼**(사용자 결정 2026-11-24). 아래 막대: 새 글 · 임시저장 글은 [미리보기] · [임시저장] · [공개], 공개된 글은 [미리보기] · [임시저장으로 돌리기](확인 창) · [저장]. Enter · Ctrl/⌘+S 는 지금 상태 그대로 저장한다(새 글은 임시저장) — 공개는 [공개] 단추로만.
- **상세 머리**(사용자 결정 2026-11-24, [ContentDetailActions](../../src/domains/admin/components/widgets/ContentDetailActions/index.tsx)): [목록] · 이전/다음 · [복제해서 새로 쓰기](등록 권한 — 새 임시저장 글의 수정 화면으로) · (공개면) [사이트에서 보기] · [수정] · «더 보기»(휴지통으로 + 토스트 «되돌리기» / 휴지통에 들었으면 복구 · 완전히 지우기 · 변경 이력). 휴지통에 든 글은 고치지 않는다(수정 주소 404 — 복구한 뒤에).
- **저장하면 공개 화면이 바로 바뀐다**: Server Action 이 `updateTag(태그)` — 공개 화면의 다음 요청은 새 값을 기다려 받는다.
- **미리보기**([PreviewDialog](../../src/domains/admin/components/features/PreviewDialog/index.tsx)): 화면 전체 창 + PC(1280) · 태블릿(768) · 휴대폰(375) 폭. 창 안의 iframe 이 `/admin/preview/<메뉴>` 를 열고, 화면이 저장 전 값을 `postMessage`(같은 출처만)로 보낸다 — 서버에 아무것도 남기지 않는다. 틀은 공개 사이트의 헤더 · 푸터 · 섹션 머리와 공개 화면 부품을 그대로 그린다. 이 주소만 CSP 가 `frame-ancestors 'self'`(나머지 관리자 화면은 `'none'`).
- **변경 이력**: 글의 파일 묶음 칸(쪽 · 사진 · 파일)은 «파일 4개 → 파일 3개» 로, 상태는 «공개 · 임시저장» 으로, 시각 칸은 서울 시각으로 보인다. 등록 때 늘 빈 휴지통 칸은 보이지 않는다.

### 주보

- 같은 날짜에 하나(휴지통에 든 것은 빼고 — DB). 날짜는 요일을 묻지 않는다(성탄절 등 평일 주보). 쪽은 1~20장.
- 복제하면 날짜는 이번 주일과 원본 다음 주 중 늦은 날, 그 날짜에 주보가 있으면 비는 주일까지 넘긴다.
- **공개 화면**: [bulletinLoad.server](../../src/domains/news/api/bulletinLoad.server.ts) 가 «공개 + 휴지통 아님» 을 공개 키로 읽는다 — `'use cache'` + 태그 `bulletins` · `cacheLife({ stale: 300, revalidate: 60 })`(stale 30 이면 빠른 이동용 틀에서 빠진다). DB 를 못 읽으면 운영에서는 직전 페이지를 유지한다(빌드 · 개발에서는 «아직 등록된 주보가 없습니다»).
- **기존 주보 옮기기(끝, 2026-11-24)**: 시드 90호(360장)를 일회용 스크립트(`scripts/import-bulletins.mjs` — git 기록에 있다)로 운영 DB · Storage 에 옮기고 확인한 뒤 시드 · `public/files/bulletin`(40MB) · 합치기 코드를 지웠다. 오픈 직전에 기존 사이트를 다시 읽어 오는 가져오기(설계 7)는 기존 사이트 스크립트를 레포로 옮길 때 새로 만든다.

### 주일광고 · 성복의 뜰(B2)

- 칸: 제목(200) · 분류(그 메뉴의 분류 묶음 — 분류 관리 등록 권한이 있으면 [새 분류] 로 그 자리에서 더한다, [CategoryField](../../src/domains/admin/components/features/CategoryField/index.tsx)) · 날짜(주일광고 이번 주일 · 성복의 뜰 오늘로 채움) · 유튜브 영상(주소나 id — `parseYoutubeVideoId`) · 설명(5000). **공개하려면 영상이 있어야 한다**(임시저장은 영상 없이). 같은 메뉴에 같은 영상은 하나(DB).
- 썸네일 · 표지는 저장할 때 영상 id 로 만든다 — 썸네일 `hqdefault`, 표지는 `maxresdefault` 가 있으면(서버가 HEAD 로 한 번 묻는다 — 유튜브 API 쿼터를 쓰지 않는다) 그것, 없으면 `hqdefault`.
- 액션은 입력의 메뉴(feed)로 그 메뉴의 권한을 보고, 그 feed 의 글에만 쓴다(다른 메뉴의 글 id 를 보내면 0줄 — `updateVersioned` · `setTrashed` · `purgeRow` 의 범위 조건). 휴지통 · 복구 · 완전 삭제는 콘텐츠 공용 [contentState.server](../../src/domains/admin/api/server/contentState.server.ts).
- 복제: 제목 · 분류 · 설명을 복사한 임시저장(영상은 비움), 날짜는 주일광고 다음 주일 · 성복의 뜰 오늘.
- 이력: 두 메뉴 중 한쪽의 «이력조회» 로 열고 그 글의 메뉴인지는 DB(`can_read_history`)가 거른다. 분류 · 메뉴 · 날짜 출처는 이름으로 보인다.
- **공개 화면**: 예배 영상 화면의 서버 캐시(태그 `video-page-announcements` · `video-page-garden`, 10분 확인) 안에서 [newsVideosLoad.server](../../src/domains/news/api/newsVideosLoad.server.ts) 가 DB 를 읽는다. 저장하면 그 태그를 `updateTag`.
- **미리보기**: 공개 «영상 한 편» 화면(`SermonWatchPage`)에 저장 전 값으로 만든 한 편을 넘긴다. 미리보기 틀만 CSP `frame-src` 에 유튜브를 연다. 관리자 `img-src` 에는 유튜브 썸네일(`i.ytimg.com`)을 더했다.
- **기존 글 옮기기(끝, 2026-11-24)**: 시드 117편(주일광고 87 · 성복의 뜰 30)을 일회용 스크립트(`scripts/import-news-videos.mjs` — git 기록에 있다)로 운영 DB 에 옮기고(방문자 권한으로 87 · 30편 확인) 시드 · 합치기 코드 · 스크립트를 지웠다. 등록 · 수정 화면 아래 막대는 콘텐츠 공용 [ContentFormActions](../../src/domains/admin/components/features/ContentFormActions/index.tsx).

### 교회앨범(B3)

- 칸: 제목 · 분류 · 그림(1~30장, 순서). 날짜 칸이 없다 — 목록 · 공개 화면은 등록 순서의 반대(최신이 위). 공개 주소는 번호(`slug`) — 옮긴 앨범은 기존 번호(1 · 2 · 4 · 5), 새 앨범은 DB 시퀀스(1000 부터).
- 액션 · 저장 규칙은 주보와 같다(그림은 저장할 때마다 새 묶음, 복제는 같은 Storage 파일을 가리키는 새 묶음).
- **공개 화면**: [albumLoad.server](../../src/domains/news/api/albumLoad.server.ts) — 주보와 같은 서버 캐시(태그 `albums`, stale 300 · revalidate 60), 저장하면 `updateTag`.
- **기존 앨범 옮기기(끝, 2026-11-24)**: 시드 4건 + `public/files/album` 을 일회용 스크립트(`scripts/import-albums.mjs` — git 기록에 있다)로 운영 DB · Storage 에 옮기고(공개 그림 4장 모두 Storage, 옛 주소 1 · 2 · 4 · 5 열림 확인) 시드 · 그림 · 합치기 코드 · 스크립트를 지웠다. 이로써 교회소식 시드(`src/domains/news/data`)가 모두 없어졌다.

### 설교 시트지(B4)

- 표 `resources`(분류 `section` = 주일 강해 · 시리즈 · 가정/명절/절기 — [resourceSection](../../src/domains/admin/lib/resourceSection.ts), 묶음 = 그 분류의 분류 묶음) + `resource_videos`(설교 영상 id, 다대다). 원본(`file_list_id`, PDF · 한글 파일 하나, 없을 수 있다)과 쪽 그림(`pages_list_id`, 늘 — 비어도)을 각각 저장할 때마다 새 묶음에 적는다. 두 묶음을 가리켜 DB 조회는 연결 이름으로 나눈다(`file:file_lists!resources_file_list_id_fkey` · `pages:…pages_list_id_fkey`).
- **PDF 를 원본에 고르면 브라우저가 쪽마다 그림을 만들어 쪽 그림 칸에 올린다**([renderPdfPages](../../src/domains/admin/components/features/PdfPages/renderPdfPages.ts) — PDF.js `pdfjs-dist`, 긴 변 1700px WebP(못 만들면 JPEG), 60쪽까지, 있던 쪽 그림은 바꾼다). 라이브러리는 PDF 를 고를 때만 받는다. **한글 PDF 는 CMap · 기본 글꼴이 없으면 글자가 빠진다**(2026-11-24 확인) — [pdfjs-assets](../../scripts/pdfjs-assets.mjs) 가 `dev` · `build` 전에 `node_modules/pdfjs-dist` 의 `cmaps` · `standard_fonts` · `wasm` 을 `public/pdfjs/<버전>/` 으로 복사하고(git 에 넣지 않는다) 같은 출처에서 받는다. 관리자 CSP 에 `worker-src 'self' blob:`(PDF.js worker).
- 회차 · 날짜 · 연도는 폼에서 글자로 받아 숫자 · null 로(날짜가 있으면 연도는 비운다). 설교 영상은 유튜브 주소나 id 를 줄 · 칸으로 나눠(겹치면 하나). 공개하려면 원본이나 쪽 그림이 하나 이상. 영상 연결은 바뀐 것만 빼고 넣는다(이력이 «넣음 · 뺌» 만). «등록» 권한만 있으면 자기 임시저장 글에만 영상을 이을 수 있어(DB) — 공개로 등록할 때 막히면 시트지는 저장하고 그 뜻을 알린다.
- 복제: 분류 · 묶음 · 제목 · 본문을 복사하고 회차는 다음 회 — 날짜 · 파일 · 영상은 비운 임시저장.
- **공개 화면**: [resourcesLoad.server](../../src/domains/resources/api/resourcesLoad.server.ts) — 서버 캐시(태그 `resources`, stale 300 · revalidate 60), 저장하면 `updateTag`. 자료실 목록 · 문서 · 예배 영상의 «설교 시트지» 카드가 같이 쓴다.
- 미리보기: 공개 «문서 열람»(`ResourceViewPage`) — 영상 링크는 유튜브로(사이트 안 설교 페이지 찾기는 저장 뒤 공개 화면이 한다).
- **기존 자료 옮기기(끝, 2026-11-24)**: 시드 57건(원본 56 · 쪽 그림 112장 · 영상 연결 37)을 일회용 스크립트(`scripts/import-resources.mjs` — git 기록에 있다)로 운영 DB · Storage 에 옮기고(방문자 권한으로 15 · 26 · 16건 · 영상 37 확인, 공개 페이지 모두 Storage) 시드 · `public/files/resources` · 합치기 코드 · 스크립트를 지웠다. 이로써 `public/files` 가 모두 없어졌다.

## 아직 없는 것

설계 문서 9절의 순서대로 만든다: 콘텐츠 나머지(⌘K 글 검색) → 다음세대 부서 · 홈 히어로 · 새가족(C) → 홈페이지 메뉴 · 예약 작업 · 정리(D). 화면을 만들면 [adminScreens.ts](../../src/shared/config/adminScreens.ts) 의 `ADMIN_SCREENS_READY` 에 메뉴 key 를 더한다.
