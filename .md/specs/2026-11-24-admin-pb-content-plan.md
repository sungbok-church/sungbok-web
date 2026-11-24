# 관리자 패키지 B(콘텐츠 5종) 구현 계획

> 사용자 결정: 짧은 계획 → 바로 구현. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교회 사람이 주보 · 주일광고 · 성복의 뜰 · 교회앨범 · 설교 시트지를 관리자에서 올리고 고치면 공개 사이트에 바로 보인다. 기존 글(주보 90 · 주일광고 87 · 성복의 뜰 30 · 앨범 4 · 시트지 57)은 DB · Storage 로 옮기고 레포의 시드 · `public/files` 는 지운다.

**Architecture:** DB(표 · RLS · 트리거 · Storage 규칙)는 `supabase/schemas/schema.sql` 에 이미 있다 — 이 패키지에서 구조를 바꾸지 않는 것이 기본이다(바꿔야 하면 정본을 고치고 `db:sync`). 파일 바이트는 브라우저가 Storage 로 직접 올리고, 묶음 · 파일 줄 · 글은 Server Action(로그인 세션)이 쓴다. 공개 화면은 저장소 계층(`newsRepository` · `resourceRepository`)의 `load` 만 DB 읽기로 바꾼다.

**Tech Stack:** Next 16.4.5(cacheComponents) · `@supabase/ssr` · TanStack Form + zod 4 · shadcn base-nova 원본 부품 · vitest · pgTAP

**Spec:** [2026-11-17-admin-design.md](2026-11-17-admin-design.md) — 6.3 · 6.6 · 6.7 · 6.8 · 6.9 · 6.10 · 7 · 8 · 9(B). 지금 있는 틀은 [domains/admin.md](../domains/admin.md).

## 단계

한 단계가 끝날 때마다 리뷰 → 전체 검증 → 커밋 · 푸시 · 운영 배포. 자료 옮기기(운영 DB · Storage 쓰기)는 단계마다 **사용자 승인 뒤**에 한다.

| 단계 | 내용 |
|---|---|
| **B1 주보** | 콘텐츠 공통 틀(휴지통 · 복구 · 완전 삭제 · 복제 · 공개/임시저장) + **파일 올리기 통로**(처음 만든다) + 미리보기 창 + 주보 화면 + 공개 주보를 DB 로 + 옮기기 + 첫 화면 «이번 주 주보» |
| B2 주일광고 · 성복의 뜰 | 한 표(`news_videos`, `feed` 로 가름) · 화면 둘. 유튜브 주소 → 영상 id(`parseYoutubeVideoId`) · 분류 바로 추가 · 첫 화면 «이번 주 주일광고» |
| B3 교회앨범 | 제목 · 분류 · 그림(순서). B1 의 통로를 그대로 |
| B4 설교 시트지 | 분류(3) · 묶음 · 회차 · PDF(쪽 그림 미리보기) · 한글 파일 · 설교 영상 연결(`fetchSermonLibrary`) |
| B5 ⌘K 글 검색 | 명령 팔레트에서 권한 있는 콘텐츠의 글을 찾는다(5종이 다 생긴 뒤) |

B2~B4 의 세부 과제는 앞 단계가 끝난 뒤 이 문서에 덧붙인다 — B1 에서 만든 틀이 정해져야 쓸 수 있다.

## Global Constraints

- 패키지 A 의 제약을 그대로 따른다([2026-11-19-admin-pa-foundation-plan.md](2026-11-19-admin-pa-foundation-plan.md) Global Constraints) — shadcn 규칙, `getClaims()`, 만능 키는 계정 · 초기화(+ 이번 옮기기 스크립트)만, DB 오류 원문 숨김, 검색어를 필터 문자열에 잇지 않음, 로직 모듈은 테스트 먼저.
- **화면 표준(설계 6.10, 2026-11-24 갱신)**: 글자 최소 · 검색 줄 한 줄 · 상세 머리 + «더 보기» · 등록은 **한 장 폼**(단계로 나누지 않는다) · 이동은 `IntentLink` · `useAdminNavigate`. 화면을 만들면 `ADMIN_SCREENS_READY` 에 넣는다.
- **상세 머리(사용자 결정, 2026-11-24)**: [목록] · 이전/다음 · [복제해서 새로 쓰기] · (공개된 글이면) [사이트에서 보기] · [수정]. «더 보기» 에 휴지통 보내기 · 변경 이력(휴지통에 든 글이면 복구 · 완전 삭제).
- **저장 버튼**: 등록 · 수정의 아래 막대 = [취소] · [미리보기] · [임시저장] · [공개](공개된 글을 고칠 때는 [저장] · [임시저장으로 돌리기] — 돌리기만 확인 창 «사이트에서 사라집니다»). 파일을 올리는 중에는 저장을 막는다.
- **공개 화면의 장애 대비**: DB 를 못 읽어도 오류 화면이 아니다 — 캐시 안의 실패는 값으로(`settle`), 운영에서 다시 그리다 실패하면 직전 페이지 유지(`loadForPage`, ADR 0024).
- **공개 화면에 Supabase 클라이언트를 싣지 않는다** — 서버에서 읽기 전용 연결(`createSupabaseReadClient`)로만.
- **내가 정한 값(계획에서 확인)**:
  - 그림은 브라우저에서 긴 변 **2000px** · WebP(품질 0.85)로 줄인다. 브라우저가 WebP 로 만들지 못하면(일부 Safari) **JPEG** 로 — 버킷이 둘 다 받는다. 이미 그보다 작은 WebP · JPEG 는 그대로 올린다.
  - **저장할 때마다 새 묶음**(구현하며 바꿈, 2026-11-24): 화면은 쪽 목록(순서 · 빼기)만 들고 있고, 저장하면 서버가 새 묶음을 만들어 그 순서로 파일 줄을 한 번에 적은 뒤 글이 새 묶음을 가리키게 바꾼다 — 저장 전에는 공개 화면이 바뀌지 않고, 순서 바꾸기에 DB 함수가 필요 없다(처음 안의 «열 때 묶음을 복사해 거기서 고치기» 는 줄 단위 순서 저장이 한 트랜잭션이 아니라 버렸다). 앞 묶음은 주인 없는 묶음이 되어 예약 작업(패키지 D)이 지운다 — **8일 뒤**(임시 보관 7일보다 길게, 설계 6.9 ④. DB 함수는 아직 24시간이라 예약 작업을 켜는 패키지 D 에서 고친다). 복제는 서버가 묶음을 복사한다.
  - «이번 주일» = 서울 시각 기준 오늘이 일요일이면 오늘, 아니면 다음 일요일. 새 주보의 날짜 **기본값**일 뿐이고 칸에서 아무 날짜로 바꿀 수 있다(사용자 확인, 2026-11-24 — 성탄절 · 송구영신 같은 평일 주보). 규칙은 «같은 날짜에 하나» 뿐(DB 부분 유일 인덱스).
  - 주보 목록 쪽당 기본 20, 날짜 내림차순. 조건: 연도 · 상태 · «삭제된 항목».

## Review Focus

1. 공개된 주보를 고치다 저장하지 않고 나감 → 공개 화면은 그대로(새 묶음에서만 고쳤다).
2. 같은 주일 주보를 두 번 등록 → «이미 있는 값입니다»(부분 유일 인덱스), 올린 파일은 묶음째 남아 예약 작업 대상.
3. «주보 수정» 권한만 있는 사람이 휴지통 보내기 → 거절(`guard_content` — «삭제» 권한).
4. 휴지통에 든 주보 · 임시저장 주보 → 공개 목록 · 주소 모두 404, 복구하면 다시 보인다.
5. 다른 메뉴의 묶음 id 를 경로에 넣어 Storage 에 올리기 → 거절(`can_write_storage_path`).
6. DB 가 멈춘 동안 `/news/bulletin` → 마지막으로 그린 목록이 열린다.

---

### Task 1: 콘텐츠 공통 — 상태 · 날짜 · 파일 주소

**Files:** Create `src/domains/admin/lib/content.ts` + test, `src/shared/lib/storageUrl.ts` + test

**Interfaces — Produces:**
- `upcomingSunday(today: Temporal.PlainDate): Temporal.PlainDate` — 일요일이면 그날.
- `storagePublicUrl(bucket: string, path: string): string` — `${SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>`(경로 조각마다 인코딩). 공개 화면 · 관리자 공용이라 `shared`.
- 콘텐츠 목록 조건(`listQuery` 확장): `trash` · `status` · `year`.

- [x] 테스트 → RED → 구현 → GREEN.

### Task 2: 파일 올리기 통로(설계 6.8)

**Files:** Create `src/domains/admin/lib/imageResize.ts` + test(크기 계산 · 형식 고르기 — 그리기는 부품에서), `src/domains/admin/api/fileListActions.ts`(Server Action), `src/domains/admin/components/features/FileListField/*`

**Interfaces — Produces:**
- `fitLongEdge(w, h, max): { width; height }`, `pickOutputType(supportsWebp: boolean): 'image/webp' | 'image/jpeg'`.
- (구현) Server Action `createUploadList(menuKey)` → 올리는 자리(빈 묶음), `signUpload({ menuKey, listId, type, name, bytes })` → 한 번 쓰는 올리기 주소(로그인 세션 — Storage 규칙이 경로의 메뉴 · 묶음을 본다). 브라우저에 Supabase 연결을 싣지 않고 XHR PUT 으로 보낸다(진행 표시). 서버 `writeFileList(client, menuKey, items)` · `copyFileList(client, listId)`.
- `<FileListField id labelId menuKey kinds value onChange onBusyChange max />` — 고르기 · 끌어 놓기, 하나씩 차례로(`useFileUploads`), 실패하면 [다시 올리기] · [빼기], 순서는 화살표 단추(휴대폰에서도 끌 필요 없음 — dnd-kit 를 쓰지 않았다). 큰 그림을 줄였으면 한 번 알린다.

- [x] 줄이기 · 형식 테스트 → 구현.
- [x] 권한: 로컬 Storage 로 직접 확인 — 다른 메뉴 경로 · 방문자의 올리기 주소는 거절, 한 번 쓴 주소는 다시 못 쓴다(DB 쪽은 기존 pgTAP 가 덮는다).
- [x] 로컬에서 실제로 올려 보기(Orca 브라우저 — 1200px WebP 둘 + 3200px JPEG → 2000px WebP). Safari · 휴대폰 사진은 운영에서 사용자 확인.

### Task 3: 주보 관리 화면

**Files:** Create `src/app/admin/(panel)/bulletin/{page,new/page,[id]/page,[id]/edit/page}.tsx`, `src/domains/admin/api/bulletin.server.ts`(읽기) · `bulletinActions.ts`(쓰기), `src/domains/admin/lib/bulletinSchema.ts` + test, `src/domains/admin/components/widgets/BulletinForm/*`, 콘텐츠 상세 머리 부품(5종 공용)

**Interfaces — Produces:**
- `bulletinInputSchema` = `{ date: 'YYYY-MM-DD'(요일 제한 없음), pagesListId: uuid(쪽 1장 이상), status }`.
- 액션: `createBulletin` · `updateBulletin`(동시 수정 — `updated_at`) · `trashBulletin` · `restoreBulletin` · `purgeBulletin` · `duplicateBulletin`(→ 새 임시저장, 날짜 = 원본 다음 주일 또는 이번 주일 중 늦은 날, 묶음 복사). 저장 뒤 공개 화면 태그 갱신(Task 5).
- 목록 칸: 주일 날짜 · 쪽 수 · 상태 · 수정한 사람 · 수정 시각. 상세: 쪽 그림 · 짧은 값 목록 · 맨 아래 수정 시각.

- [x] 스키마 테스트 → 구현.
- [x] 화면 · 액션 · 휴지통 필터 · 이력(`HistorySheet` — 파일 묶음 칸은 «파일 n개 → m개», 상태는 한글, 시각은 서울 시각).
- [x] `ADMIN_SCREENS_READY` 에 `bulletin`.

### Task 4: 미리보기 창(설계 6.10)

**Files:** Create `src/app/admin/preview/[menu]/page.tsx`(noindex, 로그인 · 그 메뉴 조회 권한), `src/domains/admin/components/features/PreviewDialog/*`

- [x] [미리보기] → 화면 전체를 덮는 창, 위 막대에 PC(1280) · 태블릿(768) · 휴대폰(375) 폭. 창 안은 iframe 으로 미리보기 주소를 열고, **저장하지 않은 지금 값**을 `postMessage`(같은 출처만 받는다)로 보낸다. 서버에 아무것도 남기지 않는다.
- [x] 미리보기 주소는 공개 부품(`BulletinPage`)을 그대로 그린다 — 공개 화면과 같은 모양.

### Task 5: 공개 주보를 DB 로

**Files:** Modify `src/domains/news/api/newsRepository.ts`(issues 의 load), Create `src/domains/news/api/newsLoad.server.ts` + test, Modify `src/app/(site)/news/bulletin/**`

- [x] `loadIssues()` — 읽기 전용 연결로 `bulletins`(공개 · 삭제 안 됨, RLS 가 거른다) + `files` 를 읽어 `BulletinIssue[]` 로(그림 주소는 `storagePublicUrl`). `'use cache'` + `cacheTag('bulletins')` + `cacheLife`(만료 없음), 실패는 값으로.
- [x] 저장 액션이 `bulletins` 태그를 갱신한다 — **`updateTag`**(Next 16 문서: Server Action 전용, 다음 요청이 새 값을 기다려 받는다).
- [x] (구현하며 정함) `cacheLife({ stale: 300, revalidate: 60 })` — stale 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(개발 알림). 운영 옮기기 전까지는 시드와 합쳤다(옮긴 뒤 지움).
- [x] `[date]` 의 `generateStaticParams` 는 최신 한 호만(`oneBuildParam`).
- [x] 시드를 읽는 테스트는 가짜 load 로 바꾼다.

### Task 6: 기존 주보 옮기기(설계 7)

**Files:** Create `scripts/import-bulletins.mjs`(만능 키, 서버에서만)

- [x] `bulletinSeed` + `public/files/bulletin`(360장, 40MB)을 Storage · DB 로. 여러 번 돌려도 같은 결과 — 같은 주일이 이미 있으면 건너뛴다(관리자에 있는 것이 이긴다). 등록자는 «시스템»(비움). 처음에는 «돌리면 무엇을 할지» 만 보이는 모드로.
- [x] 로컬 DB 에 돌려 공개 화면 90호 · 기존 주소 확인.
- [x] **운영: 사용자 승인 뒤** 실행(2026-11-24, 90호 · 360장 약 100초) → 운영에서 확인(공개 주보 그림 360개 모두 Storage, 옛 주소 열림) → 다음 커밋에서 `bulletinSeed.ts` · `public/files/bulletin` · 시드 합치기 · 일회용 스크립트 지움.
- [ ] 기존 사이트를 다시 읽어 오는 가져오기(오픈 직전, 설계 7)는 기존 사이트 스크립트를 레포로 옮길 때 함께 — 이번에는 시드에서만.

### Task 7: 첫 화면 · 마무리

- [x] 첫 화면 «이번 주 주보» 카드: 이번 주일 주보가 있는지(임시저장 · 공개 · 없음), 없으면 [등록]으로 바로(날짜 채워서).
- [x] 문서: `domains/admin.md`(주보 · 파일 올리기 통로 · 미리보기), `domains/news.md`(주보는 DB), 설계 6.10 에 정한 세부.
- [ ] 리뷰(심각한 발견이 연속 2번 나오지 않으면 끝) → `tsc` · `eslint` · `test` · `design:lint --diff` · `build` → 커밋 · 푸시 · 운영 배포 → 운영에서 주보 하나 올려 보기(임시저장 → 공개 → 공개 화면 → 휴지통 → 복구).

---

## B2 주일광고 · 성복의 뜰(2026-11-24 덧붙임)

한 표(`news_videos`, `feed` = ANNOUNCEMENTS · GARDEN)를 두 메뉴(`announcements` · `garden`)가 나눠 쓴다. 파일은 없다(유튜브 영상 id). B1 의 틀(상세 머리 · 상태 · 미리보기 · `updateTag`)을 그대로 쓴다.

**내가 정한 값(계획에서 확인)**
- 칸: 제목(200자) · 분류(그 메뉴의 분류 묶음 — «코드/분류 관리» 등록 권한이 있으면 그 자리에서 새 분류 추가) · 날짜(주일광고는 이번 주일, 성복의 뜰은 오늘로 채움) · 유튜브 영상(주소를 붙여 넣으면 id 로 — `parseYoutubeVideoId`) · 설명(5000자). 날짜 출처(행사 · 업로드)는 옮긴 글에만 있는 값이라 칸을 두지 않는다(새 글은 행사 날짜).
- **공개하려면 영상이 있어야 한다**(공개 목록은 영상이 있는 글만 — RLS 도 같다). 임시저장은 영상 없이도 된다.
- 썸네일 · 표지는 영상 id 로 만든다 — 썸네일 `hqdefault`, 표지는 `maxresdefault` 가 있으면 그것, 없으면 `hqdefault`(서버가 저장할 때 한 번 확인).
- 같은 메뉴에 같은 영상은 하나(DB) — «이미 등록된 영상입니다».
- 복제: 제목 · 분류 · 설명을 복사한 임시저장(영상은 비움 — 같은 영상은 하나라서), 날짜는 주보와 같은 규칙(주일광고) · 오늘(성복의 뜰).
- 공개 화면: 예배 영상 화면의 서버 캐시(태그 `video-page-announcements` · `video-page-garden`, 10분 확인) 안에서 `newsRepository.videos` 가 DB 를 읽는다. 저장하면 그 태그를 `updateTag`. 옮기기 전까지는 주보처럼 시드와 합친다(그 메뉴의 DB 글이 시드 기간에 하나라도 있으면 DB 만).
- 미리보기: 공개 «영상 한 편» 화면(`SermonWatchPage`)에 저장 전 값으로 만든 한 편을 넘긴다. 유튜브 플레이어 · 썸네일 때문에 미리보기 틀의 CSP 에 유튜브(`frame-src` · `img-src`)를 연다. 관리자 상세의 썸네일 때문에 관리자 `img-src` 에 `i.ytimg.com` 을 더한다.
- 첫 화면 «이번 주 주일광고»: 이번 주일 날짜의 주일광고(공개 · 임시저장 · 아직 없음).

### Task B2-1: 입력 · 규칙
- [x] `newsFeed.ts`(두 메뉴의 설정 · 썸네일 주소) · `newsVideoInput.ts`(스키마) 테스트 → 구현.

### Task B2-2: 액션 · 읽기
- [x] `newsVideoActions.ts`(등록 · 수정 · 휴지통 · 복구 · 완전 삭제 · 복제, 표지 확인) · `newsVideo.server.ts` 테스트 → 구현. 이력(`news_videos`)을 두 메뉴의 «이력조회» 로.

### Task B2-3: 화면
- [x] 목록(분류 · 상태 · 연도 · 삭제된 항목 · 제목 검색) · 등록 · 상세 · 수정 — 두 메뉴가 같은 부품을 쓰고 페이지는 얇게. 분류 칸 + 새 분류 추가. `ADMIN_SCREENS_READY` 에 둘.

### Task B2-4: 미리보기 · 공개 화면 · 첫 화면
- [x] 미리보기(영상 한 편) · `newsRepository.videos` 를 DB 로(시드와 합치기) · 첫 화면 카드.

### Task B2-5: 옮기기 · 마무리
- [x] 옮기기 스크립트(시드 117편 — 같은 `legacy_id` · 같은 메뉴의 같은 영상은 건너뜀) → 로컬 확인(117편 · 다시 돌리면 0편) → 리뷰 · 검증 · 배포(e70f3d0) → **운영 옮기기(사용자 승인, 2026-11-24 — 방문자 권한으로 87 · 30편 확인)** → 시드 · 합치기 · 스크립트 정리.

---

## B3 교회앨범(2026-11-24 덧붙임)

표 `albums`(분류 묶음 ALBUM_CATEGORY · 그림 묶음 `images_list_id`). B1 의 파일 올리기 통로와 B2 의 분류 칸 · 아래 막대 · 상세 머리를 그대로 쓴다.

**내가 정한 값(계획에서 확인)**
- 칸: 제목(200자) · 분류(교회행사 · 다음세대 …, 그 자리에서 새 분류) · 그림(1~30장, 순서 — 화보 · 포스터). 날짜 칸은 없다(표에 없다) — 공개 화면은 **등록한 순서의 반대(최신이 위)**.
- 공개 주소 = `slug`(옮긴 글은 기존 번호 1 · 2 · 4 · 5, 새 글은 1000 부터 — DB 시퀀스).
- 복제: 제목 · 분류 · 그림(같은 Storage 파일)을 복사한 임시저장.
- 공개 화면: 주보처럼 서버 캐시(태그 `albums`) · 저장하면 `updateTag`. 옮기기 전까지는 시드와 합친다(옮긴 글 — 번호가 1000 보다 작은 글 — 이 DB 에 있으면 DB 만).
- 미리보기: 공개 앨범 화면(`AlbumPage`)에 저장 전 값으로 만든 한 건.

### Task B3-1 ~ B3-4
- [x] 입력 스키마 · 액션(등록 · 수정 · 휴지통 · 복구 · 완전 삭제 · 복제) · 한 건 읽기 — 테스트 먼저. 이력(`albums`)을 «교회앨범» 이력조회로.
- [x] 화면(목록 — 제목 검색 · 분류 · 상태 · 삭제된 항목 · 등록 · 상세 · 수정) · 미리보기 · `ADMIN_SCREENS_READY`.
- [x] 공개 화면을 DB 로(시드와 합치기) · `[id]` 빌드 주소는 최신 한 건.
- [x] 옮기기 스크립트(4건 · 그림 4장 — 같은 번호는 건너뜀, 새 앨범이 있으면 멈춤) → 로컬 확인 → 리뷰 · 검증 · 배포(20ac075) → **운영 옮기기(사용자 승인, 2026-11-24 — 공개 그림 4장 Storage, 옛 주소 4개 열림)** → 시드 · `public/files/album` · 합치기 · 스크립트 정리.

---

## B4 설교 시트지(2026-11-24 덧붙임)

표 `resources`(분류 `section` = 주일 강해 · 시리즈 · 가정/명절/절기, 묶음 `series_id` = 그 분류의 분류 묶음 · 원본 `file_list_id` · 쪽 그림 `pages_list_id`) + `resource_videos`(설교 영상 id, 다대다). 메뉴는 하나(`resources`).

**내가 정한 값(계획에서 확인)**
- 칸: 분류(셋 중 하나) · 묶음(그 분류의 분류 묶음 — 그 자리에서 새 묶음) · 회차(선택) · 제목 · 사용 날짜(선택 — 모르면 연도만) · 본문(100자) · 원본 파일(PDF 또는 한글 파일 하나, 50MB) · 쪽 그림(미리보기, 0~60장) · 설교 영상(유튜브 주소 · id 여러 개).
- **PDF 를 고르면 브라우저가 쪽마다 그림(WebP, 긴 변 1700px)을 만들어 쪽 그림 칸에 올린다**(설계 6.8) — PDF.js(`pdfjs-dist`)를 쓴다. 등록 화면에서 PDF 를 고를 때만 불러온다(방문자 화면에 싣지 않는다). 한글 파일은 미리보기를 만들 수 없어 쪽 그림을 따로 올리거나 비운다(지금 자료실 규칙과 같다).
- 공개하려면 원본이나 쪽 그림이 하나 이상 있어야 한다.
- 설교 영상: 유튜브 주소를 붙여 넣어 더한다. 영상 고르기 목록(예배 페이지 목록에서 찾기)은 이번에 넣지 않는다 — 주소 붙여 넣기로 충분하고 유튜브를 더 부르지 않는다.
- 복제: 분류 · 묶음 · 제목 · 본문을 복사하고 회차는 다음 회, 날짜 · 파일 · 영상은 비운 임시저장.
- 공개 화면: 주보처럼 서버 캐시(태그 `resources`) · 저장하면 `updateTag` — 자료실 목록 · 문서 · 예배 영상의 «설교 시트지» 카드가 같이 쓴다. 옮기기 전까지는 시드와 합친다(옮긴 자료 — 기존 번호 «0404-40» 모양 — 가 DB 에 있으면 DB 만).
- 미리보기: 공개 «문서 열람» 화면(`ResourceViewPage`)에 저장 전 값으로 만든 한 건.

### Task B4-1 ~ B4-5
- [x] 분류 설정 · 입력 스키마 · 액션(등록 · 수정 · 휴지통 · 복구 · 완전 삭제 · 복제, 영상 연결) · 한 건 읽기 — 테스트 먼저.
- [x] PDF → 쪽 그림(브라우저, PDF.js) · 파일 칸에 PDF · 한글 파일 받기. (구현하며 찾음) 한글 PDF 는 CMap · 기본 글꼴이 없으면 글자가 빠진다 — `scripts/pdfjs-assets.mjs` 가 `public/pdfjs/<버전>/` 으로 복사(dev · build 전), CSP `worker-src 'self' blob:`.
- [x] 화면(목록 — 분류 · 상태 · 삭제된 항목 · 제목 검색, 등록 · 상세 · 수정) · 미리보기 · `ADMIN_SCREENS_READY`.
- [x] 공개 화면을 DB 로(시드와 합치기).
- [ ] 옮기기 스크립트(57건 — 원본 56 · 쪽 그림 112 · 영상 연결 37, 같은 번호는 건너뜀) → 로컬 확인(57건 · 다시 돌리면 0건) → 리뷰 · 검증 · 배포 → **운영 옮기기는 사용자 승인 뒤** → 시드 · `public/files/resources` · 합치기 정리.
