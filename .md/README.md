# 문서 인덱스

성복교회 웹사이트 프로젝트 문서. 이 README는 전체 문서의 진입점이며, Claude가 작업 전 가장 먼저 확인해야 할 파일입니다.

## 디렉토리 구조

```
.md/
├── README.md                       # 이 파일 — 문서 인덱스 + 컨벤션
├── design/                         # 디자인 시스템 (살아있는 문서)
│   ├── color-palette.md
│   └── design-system.md
├── domains/                        # 도메인별 상세 (살아있는 문서)
│   ├── admin.md
│   ├── home.md
│   ├── location.md
│   ├── news.md
│   ├── resources.md
│   └── worship-video.md
├── workflow/                       # 작업 방식·도구 (살아있는 문서)
│   ├── prototype-preview.md
│   └── deploy-and-env.md
├── patterns/                       # 재사용 인터랙션 패턴 (살아있는 문서)
│   └── scroll-autoplay-intro.md
├── meetings/                       # 회의록 (불변 — 회의 시점 기록)
│   └── 2026-10-08-pastor-review.md
├── specs/                          # 작업 패키지 설계 스펙 (구현 전 승인본)
│   ├── 2026-10-10-site-nav-skeleton-design.md
│   ├── 2026-10-10-site-nav-skeleton-a1-plan.md
│   ├── 2026-10-10-subpage-layouts-round2-analysis.md
│   ├── 2026-10-11-home-video-sections-analysis.md
│   ├── 2026-11-05-design-system-design.md
│   ├── 2026-11-05-design-system-plan.md
│   ├── 2026-11-10-github-org-env-sync-design.md
│   ├── 2026-11-10-github-org-env-sync-plan.md
│   ├── 2026-11-12-worship-sermon-g-plan.md
│   ├── 2026-11-17-admin-design.md
│   ├── 2026-11-17-admin-p1-setup-plan.md
│   ├── 2026-11-19-admin-pa-foundation-plan.md
│   ├── 2026-11-24-admin-pb-content-plan.md
│   ├── 2026-11-25-admin-pc-site-plan.md
│   └── 2026-11-25-admin-pd-sitemenu-plan.md
└── decisions/                      # 의사결정 기록 (ADR — 불변)
    ├── 0001-sky-palette.md
    ├── 0002-home-ia-and-tone.md
    ├── 0003-hero-v2-bleed-blur-kenburns.md
    ├── 0004-subpage-routing.md
    ├── 0005-dock-toss-bar.md
    ├── 0006-home-lead-flow-stage.md
    ├── 0007-department-page-template.md
    ├── 0008-admin-backend-vercel-supabase.md
    ├── 0009-design-system-tokens-responsive.md
    ├── 0010-next16-node26-perf-baseline.md
    ├── 0011-github-org-and-env-source.md
    ├── 0012-date-temporal-and-admin-libraries.md
    ├── 0013-photo-size-variants-prebuilt.md
    ├── 0014-content-repository-and-video-id-link.md
    ├── 0015-location-map-to-location-page.md
    ├── 0016-admin-ui-follows-shadcn.md
    ├── 0017-admin-reference-next-starter-and-tanstack-form.md
    ├── 0018-ui-primitives-base-ui.md
    ├── 0019-db-schema-ssot-uuid-v7.md
    ├── 0020-codes-uppercase-and-categories-split.md
    ├── 0021-code-cache-strategy.md
    ├── 0022-api-response-and-error-codes.md
    ├── 0023-codes-read-without-cache.md
    ├── 0024-cache-components.md
    ├── 0025-admin-drag-reorder-dnd-kit.md
    └── 0026-site-menu-db-overrides.md
```

향후 추가될 카테고리(빈 폴더는 미리 만들지 않음):

- `architecture/` — 데이터 흐름·라우팅·상태 관리·렌더링 전략

## 문서 카테고리

| 폴더 | 성격 | 추가 규칙 |
|------|------|-----------|
| `design/` | **살아있는 문서** — 현재 상태만 기술 | 변경 시 기존 파일 직접 업데이트. 변경 이력은 ADR로 분리 |
| `domains/` | **살아있는 문서** — 도메인별 상세 | 도메인 1개당 파일 1개. 변경 시 기존 파일 업데이트 |
| `workflow/` | **살아있는 문서** — 작업 방식·도구 | 방식 변경 시 기존 파일 업데이트 |
| `patterns/` | **살아있는 문서** — 재사용 인터랙션 패턴 | 패턴 1개당 파일 1개. 개선 시 기존 파일 업데이트 |
| `meetings/` | **불변 문서** — 회의 시점의 기록 | 회의 1건당 파일 1개, `YYYY-MM-DD-slug.md`. 결정·미결·액션을 상단에 요약. 여기서 나온 결정은 살아있는 문서/ADR에 반영하고 회의록 자체는 고치지 않음 |
| `specs/` | **승인본** — 작업 패키지 1개의 설계(목적·성공 기준·구조·검증·범위 밖) | `YYYY-MM-DD-slug-design.md`. 구현 전 사용자 승인. 구현 중 확정되는 세부(시안 승자 등)는 해당 절에 반영하고 상태 필드를 갱신. 되돌리기 어려운 결정은 ADR로 분리 |
| `decisions/` | **불변 문서** — 결정 시점의 기록 | 새 결정마다 새 파일 생성. 기존 ADR은 수정하지 않음(폐기 시 상태 필드만 변경) |
| `architecture/` | 살아있는 문서 | 변경 시 기존 파일 업데이트 |

## 현재 문서 목록

### Design

- [../DESIGN.md](../DESIGN.md) — **(루트 예외)** 디자인 바 정본. gstack `/design-review`·`design-qa` 의 채점 기준(토큰 규율·카피 톤·모션 바·한글 타이포·a11y·subtraction). 루트에 두는 이유·운용은 [CLAUDE.md](../CLAUDE.md) "디자인 QA" 참조. 토큰 수치 표는 아래 color-palette.md
- [color-palette.md](design/color-palette.md) — B1 Sky 팔레트. 컬러 토큰 정의·시각적 위계·Tailwind 사용 예시·접근성·상태 색·shadcn 의미 토큰 연결표
- [design-system.md](design/design-system.md) — 글자 크기·그림자·모션 토큰, 공용 부품 목록, 반응형 기준, `/design` 견본·`pnpm design:audit` 안내

### Domains

- [architecture/api-response.md](architecture/api-response.md) — 요청 · 응답 모양(Server Action · Route Handler 공통)과 오류 코드 표(HTTP 상태 · 기본 문장 · 언제 · 사용자가 할 일). 정본은 `src/shared/api/result.ts` · `errorCodes.ts`
- [admin.md](domains/admin.md) — 관리자(`/admin`)에 **지금 있는 것**: 로그인 흐름(proxy 는 `/admin/*` 만 · `getClaims()` · `next` 는 `/admin` 안 경로만), 관리자 틀, Supabase 연결(환경변수·서버 클라이언트·DB 타입·enum 일치 검사), 가입 차단, 공개 쪽과의 lint 경계. 전체 설계는 specs 의 admin-design
- [home.md](domains/home.md) — 홈(`/`) 페이지의 섹션 IA·섹션별 사양·CTA·모바일 적응·미결 사항(지도는 홈에 없다 — location.md)
- [location.md](domains/location.md) — 찾아오시는 길(`/location`): 오시는 길(지도·주소 복사·네이버/카카오 지도·주차·대중교통·전화) + 예배 시간표, 화면 규칙, 값의 위치(`shared/config/church.ts`), 교회 확인이 필요한 문구
- [news.md](domains/news.md) — 교회소식(`/news/*`): 주일광고·성복의 뜰은 예배와 같은 영상 화면(등록한 게시글의 유튜브 영상 id), 주보 B안 «바로 읽기»(연도별 접이식 목록·휴대폰 바텀시트·한 면/양면), 교회앨범 C안 «목록 + 미리보기», 공용 «크게 보기» 뷰어, 관리자 연동 때 바꿀 곳
- [resources.md](domains/resources.md) — 자료실 설교 시트지(`/resources/*`): A안 목록·문서 열람 화면 규칙(확장자·용량 표시 안 함, 자료 형태별 처리), 저장소 구조, **관리자 등록 → 유튜브 영상 id 연결 → 자료실·예배 시트지 공통 사용** 구조와 연동할 때 할 일
- [worship-video.md](domains/worship-video.md) — 예배 설교 영상(`/worship/sunday` 목록 · `/worship/sunday/영상id` 설교 한 편): 유튜브에 올리는 규칙(재생목록·제목·설명 첫 줄 날짜), 서버 수집·캐시 구조, 두 페이지의 화면 규칙

### Workflow

- [prototype-preview.md](workflow/prototype-preview.md) — 시안(디자인 변형) 탐색·라이브 프리뷰 방식. 좋은 시안의 조건(콘텐츠 분리·쏠림 금지·등장/사라짐 설계) + `<name>-preview` 라우트 + `_variants/` + 전용 dev 포트 + 비인터랙티브 영상/스크롤 헬퍼 + browse 자기점검. (구 standalone HTML 방식 폐기)
- [deploy-and-env.md](workflow/deploy-and-env.md) — 배포·환경변수 운영 절차. 정본 = GitHub Secrets, Actions "Sync env to Vercel"(수동, 변수 1개씩)로 Vercel 에 덮어쓰기, 배포는 Vercel Git 자동. 1회 셋업 체크리스트(조직 이전·Vercel 재연결·토큰)·일상 절차·로컬 개발·규칙·Vercel 방화벽(공식 권장만: `/api/` · `/admin/` 요청 제한 기본값 · 공격 때 Attack Challenge Mode)

### Patterns

- [scroll-autoplay-intro.md](patterns/scroll-autoplay-intro.md) — 스크롤 트리거 일방향 자동재생 인트로(연출을 시간 기반으로 분리 + 입력 잠금 + 래치). 히어로 문열림에 적용, 재사용 가능

### Meetings

- [2026-10-08-pastor-review.md](meetings/2026-10-08-pastor-review.md) — 2026-10-08 — 담당 목사님과 시안 리뷰. 교회소개·예배·다음세대·교회소식·자료실 IA 확정(공지사항·엘림가족부·악보/서식 제외, 사진첩→교회앨범), 유튜브 연동·모바일 재설계·"수요 청년예배" 표기, 목표 오픈 2027-01. 미결: 히어로 영상·도메인 이관·다음세대 레이아웃

### Specs

- [2026-10-10-site-nav-skeleton-design.md](specs/2026-10-10-site-nav-skeleton-design.md) — 작업 패키지 A: 글로벌 IA·네비 골격. `siteNav` 단일 소스, `/{section}/{page}` 영문 슬러그 26개, 상위→첫 하위 redirect, 공통 머리 S1. **A1 구현 완료(2026-10-10)**, 모바일 메뉴 미확정. 구현 계획: [-a1-plan.md](specs/2026-10-10-site-nav-skeleton-a1-plan.md)
- [2026-10-10-subpage-layouts-round2-analysis.md](specs/2026-10-10-subpage-layouts-round2-analysis.md) — 서브페이지 본문 레이아웃 페이지별 분석(영어예배부·주일예배·섬기는 이들·주보) + 머리 20종 비교 결과(S1 확정)
- [2026-10-11-home-video-sections-analysis.md](specs/2026-10-11-home-video-sections-analysis.md) — 홈 영상 섹션 분석: 위=라이브 스테이지(라이브 우선·없으면 담임 최신 설교) / 아래=광고 릴(재생목록 로테이션). 유튜브 채널 실데이터(라이브 패턴·제목 규칙·재생목록)·쿼터·자동재생 제약·광고 비율 분석, 확정/미결 목록. 승격 완료, 프리뷰 정리 완료
- [2026-11-05-design-system-design.md](specs/2026-11-05-design-system-design.md) — 작업 패키지 1: 디자인 시스템 + 모바일·태블릿 보완. 토큰 2계층(B1 원시 → shadcn 의미), 타이포 스케일·그림자·모션 토큰, 공용 부품 세트, `/design` 견본(dev 전용), 반응형 기준(375/768/1280·터치 44px·한글 최소 13px), `design:lint` 확장 + `design:audit`. 2026-11-05 실측 문제 목록 포함. **구현 완료(2026-11-05)**. 구현 계획: [-plan.md](specs/2026-11-05-design-system-plan.md) (12 태스크 — audit 도구·기준 캡처 → 토큰 → 폰트 → 부품 → `/design` → 글자 이전 → 반응형 보완 → lint 확장 → 문서·ADR 0009)
- [2026-11-10-github-org-env-sync-design.md](specs/2026-11-10-github-org-env-sync-design.md) — 레포를 GitHub Organization 으로 이전하고 환경변수 정본을 GitHub Secrets 로 둔다. Actions 는 Secrets→Vercel 동기화만(수동), 배포는 Vercel Git 자동 유지. 협업자가 본인 없이 운영 변수 추가·변경 가능. **승인·구현 완료(2026-11-10), 셋업 검증 대기**. 계획: [-plan.md](specs/2026-11-10-github-org-env-sync-plan.md)
- [2026-11-12-worship-sermon-g-plan.md](specs/2026-11-12-worship-sermon-g-plan.md) — 주일예배 설교 영상 G안 구현 계획: 페이지 안 플레이어·유튜브식 설명란·「설교 목록」(제목의 시리즈로 자동 분류)·검색. 페이지↔재생목록은 코드 설정, 유튜브에 올리기만 하면 반영. 화면 배치는 2026-11-13 에 목록·설교 한 편 두 페이지로 바뀜(worship-video.md)
- [2026-11-17-admin-design.md](specs/2026-11-17-admin-design.md) — 관리자(`/admin`) 설계: 그룹 + 메뉴·기능 권한(RLS 로 차단), 메뉴는 데이터(관리자·홈페이지 메뉴의 사용 여부·이름·순서, 추가만 배포), enum 과 공통코드 구분, 휴지통/비활성/완전 삭제 규칙, 칸 단위 변경 이력(DB 트리거), 브라우저 직접 올리기, 파일은 공통 표 둘(묶음 `file_lists` · 파일 `files`), 공개 화면은 저장소 `load` 만 교체, 새가족 자체 폼. 1차 = 주보·주일광고·성복의 뜰·교회앨범·설교 시트지·홈 히어로(사진·유튜브)·다음세대 부서(소개 글·담당자·사진 — 지금 값을 DB 로)·새가족. 작업 패키지는 2026-11-19 에 4개(A 기반 · B 콘텐츠 5종 · C 사이트 화면 + 새가족 · D 홈페이지 메뉴 + 정리)로 묶었다. **승인(2026-11-17), 패키지 A 구현(운영 적용 전)**. 패키지 1 계획: [-p1-setup-plan.md](specs/2026-11-17-admin-p1-setup-plan.md) (8 태스크 — `(site)` 묶음 분리 → Supabase 연결 → DB 변경 파일 체계 → 로그인 판정 → proxy·세션 → 로그인 화면·관리자 틀 → lint 경계 → 전체 검증. 개발은 로컬 Supabase(podman)). 패키지 A 계획: [-pa-foundation-plan.md](specs/2026-11-19-admin-pa-foundation-plan.md) (13 태스크 — 권한 맥락 · DB 메뉴 → 저장 결과 · 동시 수정 → 알림 · 확인 창 → 목록 틀 → 폼 틀 → CSP · 8시간 로그아웃 → 비밀번호 변경 → 사용자 → 그룹 · 권한 → 메뉴 · 코드 → 변경 이력 → 첫 화면 · ⌘K → 검증)

### Decisions

- [0001-sky-palette.md](decisions/0001-sky-palette.md) — 2026-05-07 — Warm Paper 팔레트에서 Sky Blue 팔레트로 전환한 의사결정 기록
- [0002-home-ia-and-tone.md](decisions/0002-home-ia-and-tone.md) — 2026-05-07 — 홈 1순위 타깃·카피 톤 원칙·7섹션 IA 결정
- [0003-hero-v2-bleed-blur-kenburns.md](decisions/0003-hero-v2-bleed-blur-kenburns.md) — 2026-05-24 — 히어로를 사진 4단 Bleed + Blur 페이드 + Ken Burns(sketch 12)로 확정, ADR 0002 미결 종결
- [0004-subpage-routing.md](decisions/0004-subpage-routing.md) — 2026-10-10 — 서브페이지를 `/{section}/{page}` + 섹션 중첩 레이아웃으로, `siteNav` 단일 소스에서 메뉴·라우트·redirect 파생. 공통은 머리(S1)뿐, 본문은 섹션별
- [0005-dock-toss-bar.md](decisions/0005-dock-toss-bar.md) — 2026-10-18 — 글로벌 헤더를 글래스 캡슐에서 토스식 전폭 바 + 흰 안개 패널로 교체(hover 섹션 하위만 한 열, 스크롤 숨김 없음). "독=accent 알약" 위계 폐기
- [0006-home-lead-flow-stage.md](decisions/0006-home-lead-flow-stage.md) — 2026-10-19 — 홈 상단을 변형 무대(HomeLead)로 재설계: 히어로가 사진 띠로 내려앉아 표어·담임으로 잇는다(시안 P 승격)
- [0007-department-page-template.md](decisions/0007-department-page-template.md) — 2026-11-04 — 다음세대 부서 페이지 템플릿 확정: 도입부(정보 한 덩어리) + 사진 쇼케이스(데스크톱 «놓기»·모바일 «부채»), 영아부 승격·8부서는 데이터만 교체
- [0008-admin-backend-vercel-supabase.md](decisions/0008-admin-backend-vercel-supabase.md) — 2026-11-05 — 관리자·백엔드를 Vercel + Supabase(DB·Auth·RLS·Storage) 두 서비스로, 교회 명의 계정·Cloudflare 없음. 관리 범위(A/B/C)·권한(사무 담당 ⊇ 부서 담당자)·기존 사이트 이전 포함. 관리자 코드는 같은 앱 `/admin`(모노레포·별도 저장소 탈락)
- [0009-design-system-tokens-responsive.md](decisions/0009-design-system-tokens-responsive.md) — 2026-11-05 — 디자인 시스템: B1 원시→shadcn 의미 토큰 2계층, 글자 크기 10단계(한글 최소 13px), 폰트 직접 제공(외부 요청 0), 반응형 기준(375/768/1280·lg 헤더·터치 44px), design:lint 확장 + design:audit
- [0010-next16-node26-perf-baseline.md](decisions/0010-next16-node26-perf-baseline.md) — 2026-11-09 — Next 16·Node 26 업그레이드 + 성능 기준선: 유튜브는 서버 fetch 하나로(gapi·googleapis·axios 제거), 사진은 WebP 사전 변환(17.8MB→3.1MB), 폰트는 같은 출처, 무거운 임베드는 화면 근처에서, Vercel 서울 리전. (0008·0009 는 develop 쪽 ADR 이 쓰고 있어 건너뜀)
- [0011-github-org-and-env-source.md](decisions/0011-github-org-and-env-source.md) — 2026-11-10 — 레포를 GitHub Organization 으로 이전, 환경변수 정본 = GitHub Secrets, Actions 는 Secrets→Vercel 덮어쓰기 동기화만(변수 1개씩), 배포는 Vercel Git 자동 유지, 레포 공개 유지. Pro·공용 계정·.env 커밋·Actions 전면 배포 탈락. 상태: 셋업 검증 대기
- [0012-date-temporal-and-admin-libraries.md](decisions/0012-date-temporal-and-admin-libraries.md) — 2026-11-12 — 날짜는 UTC 로 주고받고 표시할 때만 Asia/Seoul. 서버는 Temporal(Node 26), 홈페이지 화면은 Intl(Safari·iOS 에 Temporal 없음) — ESLint 로 강제, 관리자 영역만 예외. date-fns·dayjs 탈락. zod 채택·유튜브 응답 검증 적용, react-hook-form·TanStack Table 채택(관리자 착수 때 설치), motion·react-youtube 보류, react-intersection-observer 탈락. Radix 통합·lodash 제거 **폼 라이브러리 부분은 ADR 0017 이 대체**(TanStack Form)
- [0013-photo-size-variants-prebuilt.md](decisions/0013-photo-size-variants-prebuilt.md) — 2026-11-14 — 접속 시점 `/_next/image` 변환을 쓰지 않는다 — 레포 사진은 화면 폭별 크기 파일까지 미리 만들어 `<Photo>` 로 쓴다(빠뜨리면 빌드 실패). 유튜브 썸네일은 유튜브의 크기별 주소로 직접(WebP 우선). 붓글씨체는 쓰는 글자만 담은 파일 하나. ADR 0010 의 «폭별 변환 유지»·«화질 허용 목록»을 바꿈
- [0014-content-repository-and-video-id-link.md](decisions/0014-content-repository-and-video-id-link.md) — 2026-11-16 — 자료실·교회소식의 공개 화면은 저장소 계층으로만 읽는다(지금은 시드, 관리자·DB 가 생기면 load 만 교체). 자료와 설교 영상은 유튜브 영상 id 로만 잇고(다대다) 연결은 자료 쪽에 한 번만. 주일광고·성복의 뜰은 예배의 영상 화면을 쓰되 출처는 등록한 게시글. 제목·재생목록으로 잇기, 시드 직접 import, 가짜 관리자 화면 탈락
- [0015-location-map-to-location-page.md](decisions/0015-location-map-to-location-page.md) — 2026-11-16 — 지도·주소·주차·대중교통은 홈에서 빼고 찾아오시는 길(`/location`)에만 둔다. 홈에는 «처음 오신 분께» 의 주소 한 줄과 링크만. 히어로 «오시는 길» 은 `/location` 으로. ADR 0002 의 7섹션 IA 중 7번(LocationMap)을 바꿈. 양쪽에 같은 섹션, 홈에 얇은 띠 탈락
- [0016-admin-ui-follows-shadcn.md](decisions/0016-admin-ui-follows-shadcn.md) — 2026-11-18 — 관리자(`/admin`)는 shadcn admin 의 부품·배치·글자 크기·터치 영역·좁은 화면 기준(`md`)·모션을 원본 그대로 쓰고 색만 B1 팔레트로 바꾼다. 공개 사이트의 디자인 바(한글 13px·터치 44px·폭 애니메이션 금지)는 관리자에 적용하지 않는다(색 토큰·포커스·대비·reduced-motion·문구 톤은 적용)
- [0017-admin-reference-next-starter-and-tanstack-form.md](decisions/0017-admin-reference-next-starter-and-tanstack-form.md) — 2026-11-18 — 관리자의 참고 대상은 `next-shadcn-dashboard-starter`(구조·화면 패턴만, 통째로 들이지 않음). 폼은 TanStack Form(ADR 0012 의 react-hook-form 대체), UI 기반은 Radix 유지(→ 0018 이 대체), 명령 팔레트·칸반·차트는 필요해질 때, 다크 모드는 나중에 켤 수 있게 관리자 화면은 의미 토큰만 쓴다
- [0018-ui-primitives-base-ui.md](decisions/0018-ui-primitives-base-ui.md) — 2026-11-18 — UI 기반을 Radix 에서 Base UI 로(`radix-ui` 제거). shadcn 부품 25개는 base-nova 원본 그대로(다른 점은 파일 머리 주석), `design:lint` 는 원본을 검사하지 않음, `dark:` 는 `.dark` 일 때만. 공개 화면의 «크게 보기»·주보 고르기 시트도 Base UI Dialog 로
- [0019-db-schema-ssot-uuid-v7.md](decisions/0019-db-schema-ssot-uuid-v7.md) — 2026-11-19 — DB 구조의 정본은 `supabase/schemas/schema.sql`(구조) · `supabase/reference.sql`(초기 행) 두 파일, 변경 파일은 `pnpm db:sync` 가 만든다(선언형 스키마). id 는 uuid v7(`private.uuid_v7()` — Postgres 18 이 열리면 내장 함수로). 공개 주소는 id 와 따로, 인덱스는 조회마다, RLS 판정 함수 하나, GRANT 는 거두고 필요한 것만, `pnpm db:test`(pgTAP) · `pnpm db:advisors` 로 잠금
- [0020-codes-uppercase-and-categories-split.md](decisions/0020-codes-uppercase-and-categories-split.md) — 2026-11-20 — 분류(콘텐츠 › 분류 관리, `categories`)와 공통코드(시스템 › 코드 관리, `codes`)를 나눈다. enum · 코드 값은 영문 대문자, 프로그램이 쓰는 값의 코드 묶음은 잠금(이름 · 순서만), 공개 사이트의 주소 · 화면 key 는 소문자 그대로
- [0021-code-cache-strategy.md](decisions/0021-code-cache-strategy.md) — 2026-11-20 — 공통코드 · 분류는 서버 데이터 캐시(`unstable_cache`, 하루, 태그 `codes` · `categories`)에 두고, 고치는 Server Action 이 `updateTag` 로 바로 지운다. 클라이언트에는 선택지를 props 로. Next 16 + Vercel 의 캐시 층 정리. **ADR 0023 이 대체**
- [0022-api-response-and-error-codes.md](decisions/0022-api-response-and-error-codes.md) — 2026-11-20 — 요청 · 응답 모양 하나(성공 `{ ok: true, data?, message? }` / 실패 `{ ok: false, error: { code, message, metadata?, fields? } }`), 오류 코드는 이름 방식(영문 대문자) 목록 하나를 서버 · 화면이 함께 쓰고 서버가 문장을 완성해 보낸다. 예상된 실패는 돌려주고 던지는 것은 버그뿐
- [0023-codes-read-without-cache.md](decisions/0023-codes-read-without-cache.md) — 2026-11-20 — 공통코드 · 분류는 캐시하지 않고 그릴 때마다 DB 에서 읽는다(`React.cache` 로 한 요청 안에서만 중복 제거). 관리자 화면은 요청 때 그리는데 그냥 `'use cache'` 는 Vercel 에서 요청 때 거의 맞지 않고, 공유 캐시(`use cache: remote`)는 DB 읽기와 같은 왕복이라 아낄 것이 없어 뺐다(Vercel 은 Hobby 로 운영해 청구가 없고, Pro 였어도 월 1센트 미만이라 비용은 이유가 아님 — 2026-11-21 근거 정정). `updateTag` · 캐시 태그 제거. ADR 0021 대체
- [0024-cache-components.md](decisions/0024-cache-components.md) — 2026-11-20 — 캐시를 Cache Components(`cacheComponents` · `partialPrefetching`, `'use cache'` + `cacheLife`) 한 방식으로. 페이지 `revalidate` 를 없애고 데이터 쪽에서(영상 10분 · 홈 60초, 만료 없음). 서버가 받아 props 로 넘겨 HTML 에 그린다(react-query 는 브라우저에 붙은 뒤에만). 캐시 안의 실패는 값으로(`settle` · `unwrap`, 1분) — 던지면 빌드가 멈춘다. 실패 규칙은 `loadForPage`. 상세는 빌드 때 한 주소만(`oneBuildParam`). 관리자는 요청마다 그려 nonce CSP 유지. 없는 영상은 `VideoNotFound` 한 부품(첫 방문 200 + noindex)
- [0025-admin-drag-reorder-dnd-kit.md](decisions/0025-admin-drag-reorder-dnd-kit.md) — 2026-11-23 — 메뉴 · 분류 · 코드의 순서는 ↑/↓ 대신 끌어서 놓기(`@dnd-kit/core` · `sortable` · `utilities`, 판 고정 — 손잡이 · 키보드 · 한글 낭독 · 터치), 놓은 순서는 DB 함수 `reorder_rows` 한 번(security invoker, 한 무리 전부인지 확인 · 잠금 · 한 트랜잭션). `@dnd-kit/react`(1.0 전) · motion Reorder · HTML5 끌기 탈락. ADR 0012 의 «끌어서 순서 바꾸기는 다시 본다» 를 정함
- [0026-site-menu-db-overrides.md](decisions/0026-site-menu-db-overrides.md) — 2026-11-25 — 홈페이지 메뉴: 코드 `siteNav` 는 «어떤 페이지», DB `menus(area = SITE)` 는 «덮어쓸 값»(이름 · 순서 · 사용 여부) — `mergeSiteNav` · `loadSiteNav`(태그 `site-menus`) · `SiteNavProvider`. 끈 메뉴는 폴더 레이아웃(`siteMenuRoute`)이 404 · 제목, 상위 주소는 켜진 첫 하위로 접속 때 넘김(ADR 0004 의 빌드 때 넘김을 바꿈). 홈 고정 링크는 잠김

## 컨벤션

### 신규 문서 추가

1. **카테고리 결정**: "현재 상태"인가 "과거 기록"인가? 살아있는 문서면 `design/` `architecture/` `domains/` 중 적합한 폴더, 의사결정이면 `decisions/`, 회의 기록이면 `meetings/`, 작업 패키지 설계면 `specs/`.
2. **빈 폴더 금지**: 첫 문서 생성 시점에 폴더도 함께 생성. 미리 만들지 않음.
3. **파일명**: `kebab-case.md`. ADR은 `NNNN-short-slug.md` (4자리 번호 + 짧은 설명).
4. **인덱스 갱신**: 이 README의 "현재 문서 목록" 섹션을 함께 업데이트.

### 살아있는 문서 수정

- 기존 파일을 직접 업데이트 (새 파일 생성 ❌).
- 변경 이력 섹션을 본문에 누적하지 말 것 — 의미 있는 결정은 새 ADR로 분리.
- 코드와 문서가 짝(아래 "코드 ↔ 문서 동기화" 표)인 경우, 코드 변경 PR에 문서 변경도 포함.

### ADR (Architecture Decision Record) 양식

- **위치**: `decisions/`
- **파일명**: `NNNN-short-slug.md` (예: `0001-sky-palette.md`)
- **번호**: 마지막 ADR 번호 + 1. **재사용 금지** (폐기된 ADR도 번호는 유지).
- **양식**:

```markdown
# ADR NNNN: 제목

**상태**: 채택 | 대체됨 (→ ADR XXXX) | 폐기
**날짜**: YYYY-MM-DD

## 배경
어떤 문제·맥락이 있어서 결정이 필요했는지.

## 결정
무엇을 채택했는지 한 문장 + 핵심 디테일.

## 대안 비교
검토한 옵션들과 채택/탈락 이유.

## 결과 / 영향
이 결정으로 무엇이 바뀌는가. 후속 작업·제약·리스크.
```

- **결정 폐기**: 기존 ADR을 수정하지 말고, 새 ADR로 대체. 기존 ADR의 상태를 "대체됨 (→ ADR XXXX)"으로만 변경.

## 코드 ↔ 문서 동기화

다음 변경은 반드시 짝이 되는 문서를 함께 업데이트:

| 코드 변경 | 함께 업데이트할 문서 |
|-----------|----------------------|
| [src/app/globals.css](../src/app/globals.css) 의 팔레트 토큰 | [design/color-palette.md](design/color-palette.md) |
| [src/app/globals.css](../src/app/globals.css) 의 글자 크기·그림자·모션 토큰, [src/shared/components/ui/](../src/shared/components/ui/) 부품 | [design/design-system.md](design/design-system.md) + `/design` 견본 |
| 디자인 바(토큰 규율·모션·a11y·카피 톤) 규칙 변경 | [../DESIGN.md](../DESIGN.md) |
| [src/app/(site)/page.tsx](../src/app/(site)/page.tsx) 또는 [src/domains/home/](../src/domains/home/) 변경 | [domains/home.md](domains/home.md) |
| [src/domains/location/](../src/domains/location/) · `src/app/(site)/location/` 변경 | [domains/location.md](domains/location.md) |
| [src/domains/resources/](../src/domains/resources/) · `src/app/(site)/resources/` 변경 | [domains/resources.md](domains/resources.md) |
| [src/domains/news/](../src/domains/news/) · `src/app/(site)/news/` 변경 | [domains/news.md](domains/news.md) |
| [src/domains/worship-video/](../src/domains/worship-video/) 변경(영상 페이지 추가 포함) | [domains/worship-video.md](domains/worship-video.md) |
| [src/domains/admin/](../src/domains/admin/) · `src/app/admin/` · `src/proxy.ts` · `src/shared/api/supabase/` · `supabase/` 변경 | [domains/admin.md](domains/admin.md) |
| 도메인 추가/구조 변경 | `domains/<domain>.md` |
| 라우팅·상태 관리·렌더링 전략 변경 | `architecture/*.md` *(향후)* |

이 표는 새 카테고리/문서가 추가될 때마다 함께 갱신.
