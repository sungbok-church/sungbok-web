# ADR 0023: 공통코드 · 분류는 캐시하지 않고 그릴 때마다 DB 에서 읽는다

**상태**: 채택
**날짜**: 2026-11-20

## 배경

ADR 0021 은 공통코드 · 분류를 서버 데이터 캐시(`unstable_cache`, 하루)에 두고 고칠 때 `updateTag` 로 지우기로 했다. 같은 날 Cache Components(`'use cache'`) 전환을 실험 · 검토하면서 다음이 드러났다(Next 16.4.5 문서 `use-cache.md` · `migrating-to-cache-components.md`, Vercel 문서 runtime-cache):

- 그냥 `'use cache'` 는 서버 한 대의 메모리에 둔다. Vercel 은 서버가 여러 대 뜨고 사라지므로, 고친 서버의 캐시만 지워지고 다른 서버는 만료 때까지 옛 이름을 보여 준다. 하루 캐시면 최대 하루 어긋난다.
- 서버 사이에 공유되는 `'use cache: remote'`(Vercel Runtime Cache)는 이 문제가 없지만 사용량 과금 대상이다(Hobby 무료 한도 · Pro 종량, Pro 에는 «넘으면 캐시만 멈추기» 가 없다).
- 사용자 판단(2026-11-20): 그럴 바엔 공통코드 캐시를 뺀다. 두 표는 몇 KB 라 매번 읽어도 부담이 없다.

## 결정

1. `src/shared/api/codeBook.server.ts` — `getCodeBook()` · `getCategoryBook()` 는 **캐시 없이** DB 에서 읽는다. `React.cache` 로 감싸 **한 요청 안에서만** 중복을 없앤다(요청이 끝나면 버린다 — 서버끼리 어긋날 일이 없다).
2. 쿠키 없는 읽기 전용 연결(공개 키)로 읽고, DB 오류는 던진다(빈 선택지로 조용히 그리지 않게). Supabase 설정이 없으면 빈 목록.
3. 코드 · 분류를 고치는 Server Action 은 화면만 새로 그린다(`revalidatePath`). 지울 캐시가 없으므로 `updateTag` · 캐시 태그(`CACHE_TAGS`)를 없앤다.
4. 공개 페이지가 코드 · 분류를 쓰게 되면, 캐시 없는 읽기는 미리 그리기에서 «요청 때의 빈칸» 이 된다(Cache Components, ADR 0024) — 그 페이지 쪽에서 `'use cache'` 로 감싸 HTML 에 넣거나 `<Suspense>` 안에서 요청 때 읽는다.

## 대안 비교

- **`unstable_cache` 하루(ADR 0021 그대로)**: Vercel 의 공유 저장소에 두어 서버끼리 어긋나지 않지만, 만료 뒤 첫 요청은 옛 값을 받는다(사용자가 원한 «만료되면 그때 DB 읽기» 가 아님). Data Cache 가 Runtime Cache 로 합쳐지는 중이라 결국 같은 과금 대상. 탈락.
- **`'use cache'`(메모리) 하루**: 과금은 없지만 서버마다 따로라 고친 값이 최대 하루 늦게 보일 수 있다. 탈락.
- **`'use cache'`(메모리) 5분**: 어긋남이 5분 이내로 줄지만, 캐시로 아끼는 DB 읽기가 거의 없어 복잡도만 남는다. 탈락.
- **`'use cache: remote'` 하루**: 동작은 가장 정확하지만 과금 대상이고 Pro 에서 한도를 넘으면 그대로 청구된다. 탈락.

## 결과 / 영향

- ADR 0021 은 대체됨. `codeCache.server.ts` 와 그 시험은 지웠다.
- 관리자 화면에서 드롭다운 · 조건이 있는 화면은 열 때마다 작은 DB 읽기를 한 번 한다(요청당 표별 한 번).
- 나중에 코드를 읽는 화면이 아주 많아져 DB 부담이 보이면, 그때 `'use cache: remote'` 를 다시 검토한다.
