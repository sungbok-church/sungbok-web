// 관리자 등록 화면이 보낼 값의 검증(순수) — 관리자·DB 는 아직 없다. 등록 화면·Server Action 이 생기면 이 스키마를 그대로 쓴다.
// 흐름: 제목·분류·사용 날짜·파일 → 연결할 설교 영상을 골라 붙임(주소를 붙여 넣어도 영상 id 로 바꾼다) → 임시저장 또는 공개.
// 파일·미리보기 쪽은 업로드(Storage)가 만들어 붙인다 — 여기는 사람이 적는 값만 본다.
import { z } from 'zod';

const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = /^(www\.|m\.|music\.)?(youtube\.com|youtube-nocookie\.com)$/;

/**
 * 유튜브 영상 id — id 그대로이거나 영상 하나를 가리키는 유튜브 주소(watch·youtu.be·embed·live·shorts)에서 꺼낸다.
 * 재생목록 주소·다른 사이트·제목 같은 글은 undefined — 연결은 영상 id 로만 한다(제목·파일 이름으로 짐작하지 않는다).
 */
export const parseYoutubeVideoId = (input: string): string | undefined => {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (YOUTUBE_HOSTS.test(url.hostname)) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : /^\/(embed|live|shorts)\/([^/]+)/.exec(url.pathname)?.[2];
  }
  return id && VIDEO_ID.test(id) ? id : undefined;
};

// 달력에 있는 날짜만(2026-02-30 ❌) — Date 로 되돌려 같은 값인지 본다. 달력 날짜라 UTC 로 센다(ADR 0012)
const isCalendarDate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const text = z.string().trim().min(1);

export const resourceInputSchema = z
  .object({
    section: z.enum(['sunday', 'series', 'seasonal']),
    group: text,
    title: text,
    episode: z.number().int().positive().optional(),
    /** 사용 날짜 YYYY-MM-DD — 모르면 비운다 */
    date: z.string().refine(isCalendarDate, '달력에 있는 날짜(YYYY-MM-DD)여야 합니다.').optional(),
    passage: z.string().trim().optional(),
    /** 연결할 설교 영상 — 영상 id 또는 유튜브 주소. 영상이 없는 자료는 비운다 */
    videos: z
      .array(
        z
          .string()
          .refine(
            v => parseYoutubeVideoId(v) !== undefined,
            '유튜브 영상을 가리키지 않는 값입니다.'
          )
      )
      .default([]),
    status: z.enum(['draft', 'published']),
  })
  .transform(({ videos, ...rest }) => ({
    ...rest,
    videoIds: [...new Set(videos.map(v => parseYoutubeVideoId(v)!))],
  }));

export type ResourceInput = z.infer<typeof resourceInputSchema>;
