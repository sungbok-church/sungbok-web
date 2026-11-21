// 홈 영상 섹션(라이브 스테이지·광고 릴) — 유튜브 피드 타입·선별 로직(순수 함수).
// 규칙 근거: .md/specs/2026-10-11-home-video-sections-analysis.md §4·§5

/**
 * react-query 키 — 브라우저 훅(useHomeVideoFeed)이 쓴다. 순수 모듈에 두어 테스트 · 다른 모듈이 같은 키를 쓴다.
 */
export const HOME_VIDEO_QUERY_KEY = ['home-video'] as const;

export type Broadcast = 'none' | 'live' | 'upcoming';

export type HomeVideo = {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 (UTC) */
  publishedAt: string;
  /** 가장 큰 썸네일 URL (i.ytimg.com) */
  thumbnail: string;
  /** 초. 라이브/예정은 null */
  durationSec: number | null;
  broadcast: Broadcast;
  /** 라이브 아카이브의 실제 시작 시각(ISO) — 주일 판별 등에 사용 */
  liveStart: string | null;
};

export type ParsedSermon = {
  series: string | null;
  title: string;
  scripture: string;
  preacher: string;
};

export type FeedStatus = 'loading' | 'ready' | 'error';

export type HomeVideoFeed = {
  status: FeedStatus;
  /** 지금 진행 중인 라이브(설교자 무관). 없으면 null */
  live: HomeVideo | null;
  /** 이요셉 담임목사 최신 설교(VOD). 없으면 null */
  sermon: HomeVideo | null;
  /** 광고 재생목록 — 목록 순서 그대로 */
  notices: HomeVideo[];
  error: string | null;
};

/** 서버(`/api/home-video`)가 돌려주는 본문 — 상태·에러는 클라이언트 훅이 붙인다 */
export type HomeVideoFeedData = Pick<HomeVideoFeed, 'live' | 'sermon' | 'notices'> & {
  /**
   * 영상 정보(라이브 여부)를 유튜브가 만든 뒤 이 응답을 만들 때까지 지난 ms — 서버 시계로 잰다.
   * Next Data Cache 의 옛 응답이나 서버가 대신 준 마지막 성공분이면 커진다. 라이브 만료는 이 값으로만 판단한다(isLiveStale).
   */
  staleMs: number;
};

/** 라이브 정보를 믿는 최대 나이 — 넘으면 끝났을지 모르니 «ON AIR» 를 내린다. 설교·광고는 지난 것이어도 보여 준다. */
export const LIVE_MAX_AGE = 10 * 60_000;

/** 서버가 잰 나이(staleMs) + 받은 뒤 화면에서 흐른 시간이 LIVE_MAX_AGE 를 넘었나. staleMs 는 서버 시계로만 잰다. elapsedMs 는 브라우저가 직접 받은 데이터면 기기 시계로만 재지만, 서버가 미리 채운 데이터는 서버 시각과 기기 시각을 섞는다(useHomeVideoFeed 의 «알고 둔 한계» ②). */
export const isLiveStale = (staleMs: number, elapsedMs: number): boolean =>
  staleMs + elapsedMs > LIVE_MAX_AGE;

/**
 * 미리 그린 홈에 넣는 피드(ADR 0024) — 시각 값을 빼서, 영상이 같으면 언제 다시 만들어도 같은 값이 되게 한다.
 * 홈은 60초마다 다시 만들어지는데, 내용이 같으면 Vercel 이 ISR 쓰기를 세지 않는다(시각이 들어 있으면 매번 «바뀐 홈» 이 된다).
 * 화면은 미리 그린 피드의 나이를 모르므로 라이브를 믿을지는 여기서 정하고(10분 넘었으면 뺀다), 화면은 붙자마자 한 번 다시 받는다.
 */
export const toShellFeed = ({
  live,
  sermon,
  notices,
  staleMs,
}: HomeVideoFeedData): HomeVideoFeedData => ({
  live: isLiveStale(staleMs, 0) ? null : live,
  sermon,
  notices,
  staleMs: 0,
});

const SEP = ' | ';

/** `시리즈 | 제목 | 본문 | 설교자` 또는 `제목 | 본문 | 설교자`. 규칙 밖이면 null. */
export const parseSermonTitle = (title: string): ParsedSermon | null => {
  const parts = title
    .split(SEP)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length === 4)
    return { series: parts[0], title: parts[1], scripture: parts[2], preacher: parts[3] };
  if (parts.length === 3)
    return { series: null, title: parts[0], scripture: parts[1], preacher: parts[2] };
  return null;
};

const isSermonBy = (video: HomeVideo, preacher: string) =>
  video.broadcast === 'none' &&
  (parseSermonTitle(video.title)?.preacher === preacher ||
    video.description.includes(`*설교: ${preacher}`));

const byNewest = (a: HomeVideo, b: HomeVideo) =>
  a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0;

export const pickLive = (videos: HomeVideo[]): HomeVideo | null =>
  videos.find(v => v.broadcast === 'live') ?? null;

export const pickLatestSermon = (videos: HomeVideo[], preacher: string): HomeVideo | null =>
  [...videos].sort(byNewest).find(v => isSermonBy(v, preacher)) ?? null;

/** `PT1H17M59S` → 4679. 입력 null → null. */
export const isoDurationToSeconds = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, d, h, mi, s] = m.map(x => (x ? Number(x) : 0));
  return d * 86400 + h * 3600 + mi * 60 + s;
};

/** ISO → KST `YYYY.MM.DD` */
export const formatKoDate = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts.replaceAll('-', '.');
};

/** `2026년 10월 11일 성복교회 주일예배` → `주일예배`. 규칙 밖이면 '라이브'. */
export const liveServiceName = (title: string): string => {
  const m = title.match(/성복교회\s*(.+?)\s*(?:\[.*\])?\s*$/);
  return m?.[1]?.trim() || '라이브';
};

/** 유튜브 시청 페이지(새 탭에서 바로 재생) */
export const watchHref = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
