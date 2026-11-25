// 받아 둔 유튜브 영상 줄(DB youtube_videos — 묶음 E) → 설교 목록. 순수 함수 — 서버 · 시험이 같이 쓴다.
// DB 에는 유튜브 값(제목 · 설명 원문)만 있고, 시리즈 · 회차 · 본문 · 설교자 · 설교일은 여기서 뽑는다(sermonParse) —
// 읽는 규칙을 고치면 다시 받지 않아도 바로 반영된다.

import { sortSermons } from './sermonList';
import { dateInText, parseSermonDescription, parseSermonTitle } from './sermonParse';
import type { Sermon } from './worshipVideo.types';

/** DB youtube_videos 한 줄(페이지 칸 제외) — 동기화(youtubeSync.server)가 넣고 영상 페이지가 읽는다 */
export type VideoRow = {
  video_id: string;
  /** 재생목록 안의 순서(0 부터) */
  position: number;
  title: string;
  description: string;
  /** 영상을 올린(공개한) 시각 */
  published_at: string | null;
  /** 재생목록에 넣은 시각 — 올린 시각이 없을 때만 쓴다 */
  added_at: string | null;
  thumbnail: string;
  poster: string;
};

export type VideoLibrary = { sermons: Sermon[]; descriptions: Map<string, string> };

/**
 * UTC 시각 → 한국 달력 날짜(YYYY-MM-DD). 설교일은 «어느 주일»인지가 뜻이라 시각이 아닌 날짜로 다룬다 —
 * 서버(UTC)에서 그대로 자르면 토요일 밤(UTC)에 올린 주일 새벽(KST) 영상이 하루 어긋난다(ADR 0012: 시간대는 명시 —
 * 이 파일은 순수 모듈이라 Temporal 대신 Intl).
 */
const SEOUL_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const seoulDate = (iso: string | null): string | undefined => {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : SEOUL_DAY.format(t); // en-CA = YYYY-MM-DD
};

// 띄어쓰기만 다른 시리즈 이름(«마태복음 강해»·«마태복음강해»)은 한 시리즈다 — 가장 최근 편의 표기로 맞춘다.
// 맞추지 않으면 칩이 둘로 갈리고 편수·이전/다음 편이 반쪽씩 나뉜다. sorted 는 최신순.
const unifySeriesNames = (sorted: Sermon[]): Sermon[] => {
  const names = new Map<string, string>();
  return sorted.map(s => {
    const key = s.series.replace(/\s+/g, '');
    const name = names.get(key) ?? s.series;
    names.set(key, name);
    return name === s.series ? s : { ...s, series: name };
  });
};

/** 영상 줄 → 설교 목록(날짜 최신순) + 설명 본문(설교일 줄을 뺀 것). 날짜를 알 수 없는 영상은 뺀다(정렬할 수 없다). */
export const rowsToLibrary = (rows: readonly VideoRow[]): VideoLibrary => {
  const sermons: Sermon[] = [];
  const descriptions = new Map<string, string>();
  for (const r of rows) {
    const description = parseSermonDescription(r.description);
    const sermonDate = description.date ?? dateInText(r.title);
    const date = sermonDate ?? seoulDate(r.published_at) ?? seoulDate(r.added_at);
    if (!date) continue;
    const { series, no, occasion, title, passage, preacher } = parseSermonTitle(r.title);
    descriptions.set(r.video_id, description.body);
    sermons.push({
      id: r.video_id,
      title,
      series,
      ...(no !== undefined && { no }),
      ...(occasion && { occasion }),
      ...(passage && { passage }),
      ...(preacher && { preacher }),
      date,
      dateFrom: sermonDate ? 'sermon' : 'upload',
      thumbnail: r.thumbnail,
      poster: r.poster,
    });
  }
  return { sermons: unifySeriesNames(sortSermons(sermons)), descriptions };
};
