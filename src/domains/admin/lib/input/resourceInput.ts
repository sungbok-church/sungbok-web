// 설교 시트지 등록 · 수정의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(resources · resource_videos)의 check 와 같다.
// 회차 · 날짜 · 연도는 폼에서 글자로 받아 숫자 · null 로 바꾼다. 설교 영상은 유튜브 주소나 id 를 줄(또는 칸)로 나눠 받는다.
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { z } from 'zod';

import { isCalendarDate } from '../content';
import { fileItemSchema } from './fileInput';

/** 한 건의 미리보기 쪽 한도 */
export const MAX_RESOURCE_PAGES = 60;

const file = fileItemSchema('resources');

const base = z.object({
  section: z.enum(['SUNDAY', 'SERIES', 'SEASONAL'], '분류를 골라 주세요.'),
  seriesId: z.uuid('묶음을 골라 주세요.'),
  /** 회차(선택) — 글자로 받는다 */
  episode: z.string().trim().max(4),
  title: z.string().trim().min(1, '제목을 넣어 주세요.').max(200, '제목은 200자까지입니다.'),
  /** 사용 날짜(선택) — 모르면 비우고 연도만 */
  date: z.string(),
  year: z.string().trim(),
  passage: z.string().trim().max(100, '본문은 100자까지입니다.'),
  /** 원본(PDF 또는 한글 파일 하나, 없을 수 있다) */
  file: z
    .array(file)
    .max(1, '원본은 한 개입니다.')
    .refine(fs => fs.every(f => f.kind !== 'IMAGE'), '원본은 PDF 나 한글 파일입니다.'),
  /** 미리보기 쪽 그림 */
  pages: z
    .array(file)
    .max(MAX_RESOURCE_PAGES, `쪽 그림은 ${MAX_RESOURCE_PAGES}장까지입니다.`)
    .refine(fs => fs.every(f => f.kind === 'IMAGE'), '쪽 그림은 그림 파일입니다.'),
  /** 설교 영상 — 유튜브 주소나 id, 줄 · 칸으로 나눈다 */
  videos: z.string().max(5000),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

type Base = z.output<typeof base>;

const normalize = <T extends Base>(
  { episode, date, year, passage, videos, ...rest }: T,
  ctx: z.RefinementCtx
) => {
  const ep = episode ? Number(episode) : null;
  if (episode && (!Number.isInteger(ep) || (ep as number) < 1))
    ctx.addIssue({ code: 'custom', path: ['episode'], message: '회차는 숫자로 적어 주세요.' });
  if (date && !isCalendarDate(date))
    ctx.addIssue({ code: 'custom', path: ['date'], message: '날짜를 골라 주세요.' });
  const y = !date && year ? Number(year) : null;
  if (!date && year && !(Number.isInteger(y) && (y as number) >= 1950 && (y as number) <= 2100))
    ctx.addIssue({ code: 'custom', path: ['year'], message: '연도는 네 자리 숫자로 적어 주세요.' });
  const videoIds: string[] = [];
  for (const raw of videos.split(/\s+/).filter(Boolean)) {
    const id = parseYoutubeVideoId(raw);
    if (!id)
      ctx.addIssue({
        code: 'custom',
        path: ['videos'],
        message: `유튜브 영상 주소를 확인해 주세요: ${raw}`,
      });
    else if (!videoIds.includes(id)) videoIds.push(id);
  }
  if (rest.status === 'PUBLISHED' && rest.file.length === 0 && rest.pages.length === 0)
    ctx.addIssue({
      code: 'custom',
      path: ['pages'],
      message: '공개하려면 원본이나 쪽 그림을 올려 주세요.',
    });
  return {
    ...rest,
    episode: ep,
    date: date || null,
    year: y,
    passage: passage || null,
    videoIds,
  };
};

export const resourceCreateSchema = base.transform(normalize);

export const resourceUpdateSchema = base
  .extend({ id: z.uuid(), updatedAt: z.string().min(1) })
  .transform(normalize);

/** 화면 검사용 — 상태는 제출 단추가 정하므로 빼고, 공개 조건은 서버가 칸 오류로 돌려준다 */
export const resourceFormSchema = base
  .omit({ status: true })
  .extend({ status: z.literal('DRAFT').default('DRAFT') })
  .transform(normalize);
