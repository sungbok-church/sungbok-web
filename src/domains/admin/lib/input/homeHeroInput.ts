// 홈 히어로 저장의 입력(화면 · Server Action 이 같은 스키마, 설계 6.12). 종류는 사진 · 유튜브, 대표 사진은 어느 종류에서나
// 꼭 한 장(영상 전 · 좁은 화면 · 동작 줄이기 · 사진 띠에 내려앉는 카드). 유튜브는 주소나 id 를 받아 영상 id 로 바꾼다.
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { z } from 'zod';

import { fileItemSchema } from './fileInput';

export const homeHeroSaveSchema = z
  .object({
    kind: z.enum(['PHOTO', 'YOUTUBE']),
    photo: z
      .array(fileItemSchema('home-hero'))
      .min(1, '대표 사진을 올려 주세요.')
      .max(1, '대표 사진은 한 장입니다.')
      .refine(fs => fs.every(f => f.kind === 'IMAGE'), '대표 사진은 그림 파일입니다.'),
    /** 유튜브 주소나 영상 id — 사진이면 무시한다 */
    video: z.string().trim().max(200),
    /** 화면이 열었을 때의 수정 시각(동시 수정 막기) */
    updatedAt: z.string().min(1),
  })
  .transform((v, ctx) => {
    if (v.kind === 'PHOTO') return { ...v, videoId: null };
    const videoId = parseYoutubeVideoId(v.video);
    if (!videoId) {
      ctx.addIssue({ code: 'custom', path: ['video'], message: '유튜브 주소를 넣어 주세요.' });
      return z.NEVER;
    }
    return { ...v, videoId };
  });

export type HomeHeroSaveInput = z.input<typeof homeHeroSaveSchema>;
