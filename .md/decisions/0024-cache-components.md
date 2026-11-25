# ADR 0024: 캐시를 Cache Components(`'use cache'`) 한 방식으로 — 서버가 받아 HTML 에 그리고, 관리자는 요청마다

**상태**: 채택
**날짜**: 2026-11-20

## 배경

캐시가 세 방식으로 나뉘어 있었다: 페이지마다 `export const revalidate`(ISR, 목록 600초 · 홈 60초), 유튜브 fetch 의 `next: { revalidate }`(Data Cache 1시간), 그리고 `unstable_cache`. Next 16 이 권하는 방식은 `cacheComponents` + `'use cache'` + `cacheLife` 하나다. 사용자 요청(2026-11-20): 권장 방식으로 통일하되, 방문자가 보는 동작(속도 · 새 영상 반영 시점 · 유튜브 장애 때 옛 목록 유지 · 검색엔진에 설교 목록이 보일 것)은 그대로.

실험본(로컬 운영 모드 + 가짜 유튜브)으로 지금 방식과 나란히 재고, 설계는 별도 리뷰어가 반대 입장에서 검토했다. 드러난 것:

1. react-query 의 `useQuery` 는 그리는 중에 지금 시각(`Date.now()`)을 읽는다 — Cache Components 의 미리 그리기에서 금지. `<Suspense>` 로 감싸 넘기면 그 부분이 HTML 에서 빠진다(설교 제목 5 → 0, 검색엔진에 안 보임).
2. 관리자 CSP 는 요청마다 새 nonce 를 쓰는데, 미리 그린 틀의 스크립트에는 nonce 가 없어 관리자 전체가 작동하지 않았다(Next CSP 안내: nonce 는 요청마다 그려야 하고 PPR 과 함께 못 쓴다). Supabase 인증도 지금 시각을 읽는다.
3. 그냥 `'use cache'` 는 서버 한 대의 메모리라 Vercel 에서는 서버마다 따로다 — 공통코드처럼 «고치면 바로» 가 필요한 데이터에는 맞지 않는다(ADR 0023 에서 공통코드 캐시를 뺐다).
4. `'use cache'` 함수 안에서 던진 실패는 바깥에서 잡아도 Next 가 페이지 그리기 오류로 기록해 **빌드가 멈춘다**(유튜브 키 없이 빌드해 확인).
5. `generateStaticParams` 빈 목록은 Cache Components 에서 빌드 오류다.
6. `partialPrefetching: true`(새 프로젝트 권장 · 다음 큰 버전부터 기본)에서는 빌드 때 만들지 않은 상세 주소를 처음 열 때 틀을 먼저 보내므로, 없는 데이터면 상태 코드가 404 가 아니라 200 + `noindex` 다(두 번째부터 404). Next 문서의 정해진 동작.

## 결정

1. **설정**: `cacheComponents: true`, `partialPrefetching: true`. 페이지의 `revalidate` 는 모두 없애고 데이터 쪽 `cacheLife` 로 옮긴다.
2. **영상 데이터 캐시**(`worshipVideo.server` 의 페이지별 목록 · 설명): `'use cache'` + `cacheLife({ stale: 300, revalidate: 600 })` — 10분마다 확인, **만료 없음**. 태그 `video-page-<page>`. 유튜브 fetch 의 Data Cache(1시간, 200 만 저장)는 그대로 둔다 — 배포 · 서버가 바뀌어도 남아 쿼터를 더 쓰지 않고, 유튜브가 막혀도 옛 응답을 준다. 옛 목록을 지키는 것은 이 Data Cache 와 아래 6번(페이지 유지 규칙)이다. 새 영상은 지금처럼 늦어도 약 1시간 10분.
3. **홈 영상 피드**(`homeVideoCache.server`): `'use cache'` + `cacheLife({ stale: 30, revalidate: 60 })`(stale 30초 미만이면 미리 그리기에서 빠진다). 미리 그린 홈에 넣는 피드에는 **시각 값을 넣지 않는다**(`toShellFeed` — `staleMs` 는 0, 만든 시각 없음, 영상 정보가 10분 넘었으면 라이브를 빼고 넣는다). 영상이 같으면 60초마다 다시 만든 홈도 글자 하나 다르지 않아야 Vercel 이 ISR 쓰기를 세지 않는다(내용이 같으면 쓰기 무료 — 2026-11-21 정정: 처음에는 만든 시각 `servedAt` 을 실어 매번 «바뀐 홈» 이 되어, 다시 만들 때마다 약 51단위(HTML 358KB + RSC 50KB)의 쓰기가 생겼다. 배포본을 세 번 다시 만들어 비교해 다른 곳은 이 두 값뿐임을 확인). 화면은 미리 그린 피드의 나이를 모르므로 붙자마자 `/api/home-video` 로 한 번 다시 받는다. `/api/home-video` 는 미리 만들지 않고 요청 때 답하되, 성공 응답에 `Vercel-CDN-Cache-Control: max-age=30` 을 실어 Vercel CDN 이 30초 들고 있게 한다(2026-11-21) — Vercel 은 Hobby(청구 없음, 한도를 넘으면 그 기능이 최대 30일 멈춤)로 운영하므로, 방문자가 많거나 누가 매크로로 두드려도 함수 호출 · CPU 가 방문자 수만큼 늘지 않게 지역마다 30초에 한 번으로 묶는다. 대가는 라이브 시작 · 종료가 최대 30초 늦게 보이는 것. 실패 응답은 담지 않는다. CDN 요청 자체(Hobby 월 100만 건)는 방문마다 세어지므로, 방화벽은 Vercel 공식 권장(`/api/` · `/admin/` 요청 제한 · 공격 때 Attack Challenge Mode)만 둔다([deploy-and-env.md](../workflow/deploy-and-env.md) 7절).
4. **캐시 안의 실패는 값으로**(`settled.server` 의 `settle` · `unwrap`): 캐시 함수는 던지지 않고 성공 · 실패를 평범한 객체로 돌려준다. 실패는 짧게 붙든다(`failureCacheLife` — 잠깐의 실패 5초, 쿼터 소진 · 그 밖 1분). **만료(expire)는 어디에도 두지 않는다** — 페이지의 만료는 안쪽 캐시 중 가장 짧은 것을 따르고, 만료가 지난 페이지는 직전 페이지 없이 요청이 기다리다 실패하면 오류 화면이 된다(리뷰에서 확인). 바깥에서 `unwrap` 이 원래 종류의 오류(`YoutubeApiError` 등)로 다시 던진다 — Route Handler 의 상태 코드 판단은 그대로.
5. **서버가 받아 props 로**: 영상 목록 · 한 편 · 홈은 서버 컴포넌트가 받아 화면 부품에 props 로 넘긴다 — 미리 그린 HTML 에 목록이 들어간다. react-query 는 브라우저에 붙은 뒤(`useIsClient`)에만 쓴다: 서버가 못 받았을 때의 대신 받기, 홈의 60초 확인. `HydrationBoundary` · 서버 `prefetchQuery` 는 없앤다.
6. **실패 규칙**(`loadForPage`, 옛 `prefetchForIsr` 와 같다): 빌드 · 개발 서버는 넘기고 화면이 받는다(배포는 된다). 운영에서 다시 그리다 실패하면 던져 직전 페이지를 유지한다. 영상 한 편은 첫 방문에 직전 페이지가 없으므로 던지지 않는다(`keepPrevious: false`).
7. **상세 페이지의 빌드 주소**(`oneBuildParam`): 최신 영상 · 최신 자료 한 주소만 미리 만든다(빌드가 페이지 전체를 검사한다). 못 받으면 자리표시(`__placeholder`, 404). 나머지는 처음 열릴 때 만든다(지금과 같다).
8. **관리자**: `src/app/admin/layout.tsx` 에 `instant = false` + `await connection()` — 미리 그린 틀 없이 요청마다 그린다. nonce CSP 는 그대로.
9. **없는 데이터 화면**: 영상은 어느 경로로 오든 `VideoNotFound` 한 부품으로 그린다(404 페이지 · 화면이 받은 목록에 없을 때). 첫 방문 200 + noindex 는 받아들인다.

## 대안 비교

- **지금 방식 유지**: 동작은 같지만 캐시가 세 방식으로 남고, Next 다음 큰 버전에서 옮겨야 한다. 탈락.
- **목록을 `<Suspense>` 로 감싸 브라우저에서만 그리기**: 가장 적게 바뀌지만 HTML 에서 목록이 빠진다(SEO 필수 조건 위반). 탈락.
- **홈 영상을 요청마다 그려 스트리밍(`connection()`)**: 방문마다 회색 자리표시가 보였다가 채워진다. 탈락.
- **관리자 CSP 를 해시(SRI, 실험 기능)나 `unsafe-inline` 으로**: 실험 기능에 기대거나 보안이 약해진다. 관리자는 어차피 사람마다 다른 화면이라 미리 그릴 이득이 없다. 탈락.
- **`partialPrefetching: false`**: 없는 상세 주소도 늘 404 지만, 예전 앱용이라 다음 큰 버전에서 없어진다. 탈락.
- **앞단(proxy)에서 «목록에 있는 영상인지» 확인해 404**: 상세 요청마다 확인 비용 · 복잡도. 탈락.

## 결과 / 영향

- 실험본에서 확인(2026-11-20): 목록 · 한 편 · 홈 HTML 의 설교 · 영상 수가 지금 방식과 같다. 유튜브를 끊고 서버를 다시 켜고 유튜브 응답 저장분까지 지워도 목록 · 홈 · 처음 여는 설교가 옛 내용을 200 으로 보인다. 복구되면 새 영상이 보인다. 관리자 스크립트 25/25 에 nonce, 로그인 · 저장 정상. 유튜브 키 없이(403) 빌드해도 빌드가 된다.
- `vitest.setup.ts` 가 `next/cache` 의 `cacheLife` · `cacheTag` 를 테스트에서 아무 일도 하지 않게 한다(Next 서버 밖에서 부르면 던진다).
- 관리자에서 영상 글(교회소식)을 등록하게 되면, 저장하는 Server Action 에서 `updateTag('video-page-announcements')` 등을 불러 바로 보이게 한다.
- Vercel 에서 그냥 `'use cache'` 는 서버마다 메모리가 따로다 — 미리 그린 페이지와 유튜브 fetch 캐시는 공유 · 영속이라 이번 설계는 영향이 없지만, 실제 배포(Preview)에서 한 번 더 확인한다.

## 보충(2026-11-25, 묶음 E)

예배 설교 영상은 더 이상 공개 화면이 유튜브를 부르지 않는다 — 재생목록을 DB(`youtube_videos`)에 받아 두고 DB 를 읽는다([계획](../specs/2026-11-25-videos-from-youtube-plan.md)). 받기는 Data Cache 없이(새 영상이 늦지 않게) 페이지마다 10분에 한 번까지라, 위 «유튜브 fetch Data Cache 는 그대로 둔다» 는 홈 영상 피드(라이브 · 1분)에만 남는다. 영상 페이지의 서버 캐시 규칙(10분 확인 · 실패는 값으로 1분)은 그대로다.
