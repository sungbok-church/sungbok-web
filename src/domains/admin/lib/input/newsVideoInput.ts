// 주일광고 · 성복의 뜰 등록 · 수정의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(news_videos)의 check 와 같다.
// 영상 칸은 유튜브 주소나 id 를 받아 id 로 바꾼다. 공개하려면 영상이 있어야 한다(공개 목록은 영상이 있는 글만 — RLS 도 같다).
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { z } from 'zod';

import { isCalendarDate } from '../content';

const base = z.object({
  title: z.string().trim().min(1, '제목을 넣어 주세요.').max(200, '제목은 200자까지입니다.'),
  categoryId: z.uuid('분류를 골라 주세요.'),
  date: z.string().refine(isCalendarDate, '날짜를 골라 주세요.'),
  /** 유튜브 주소 또는 영상 id — 비우면 영상 없음(임시저장만) */
  video: z.string().max(500),
  description: z
    .string()
    .trim()
    .max(5000, '설명은 5000자까지입니다.')
    .transform(v => v || null),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

type Base = z.output<typeof base>;

const toVideo = <T extends Base>({ video, ...rest }: T, ctx: z.RefinementCtx) => {
  const raw = video.trim();
  const videoId = raw ? (parseYoutubeVideoId(raw) ?? null) : null;
  if (raw && !videoId)
    ctx.addIssue({ code: 'custom', path: ['video'], message: '유튜브 영상 주소를 확인해 주세요.' });
  else if (!videoId && rest.status === 'PUBLISHED')
    ctx.addIssue({ code: 'custom', path: ['video'], message: '공개하려면 영상을 넣어 주세요.' });
  return { ...rest, videoId };
};

export const newsVideoCreateSchema = base.transform(toVideo);

export const newsVideoUpdateSchema = base
  .extend({ id: z.uuid(), updatedAt: z.string().min(1) })
  .transform(toVideo);

/** 화면 검사용 — 상태는 제출 단추가 정하므로 뺀다(공개 때 영상 검사는 서버가 칸 오류로 돌려준다) */
export const newsVideoFormSchema = base.omit({ status: true }).superRefine((v, ctx) => {
  const raw = v.video.trim();
  if (raw && !parseYoutubeVideoId(raw))
    ctx.addIssue({ code: 'custom', path: ['video'], message: '유튜브 영상 주소를 확인해 주세요.' });
});
