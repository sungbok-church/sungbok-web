import { describe, expect, it } from 'vitest';

import { newsVideoCreateSchema, newsVideoUpdateSchema } from './newsVideoInput';

const CAT = '0190a0b0-0000-7000-8000-000000000001';
const valid = {
  title: ' 11월 29일 주일 광고 ',
  categoryId: CAT,
  date: '2026-11-29',
  video: 'https://www.youtube.com/watch?v=Cm0wL9_z9uM&t=3',
  description: '',
  status: 'PUBLISHED',
};

describe('newsVideoCreateSchema', () => {
  it('주소를 붙여 넣으면 영상 id 로, 빈 설명은 null, 제목은 다듬는다', () => {
    expect(newsVideoCreateSchema.parse(valid)).toEqual({
      title: '11월 29일 주일 광고',
      categoryId: CAT,
      date: '2026-11-29',
      videoId: 'Cm0wL9_z9uM',
      description: null,
      status: 'PUBLISHED',
    });
  });

  it('공개하려면 영상이 있어야 한다 — 임시저장은 영상 없이도 된다', () => {
    const noVideo = { ...valid, video: '' };
    const r = newsVideoCreateSchema.safeParse(noVideo);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({
      path: ['video'],
      message: '공개하려면 영상을 넣어 주세요.',
    });
    expect(newsVideoCreateSchema.parse({ ...noVideo, status: 'DRAFT' }).videoId).toBeNull();
  });

  it('유튜브 영상이 아닌 주소는 그 칸의 오류', () => {
    const r = newsVideoCreateSchema.safeParse({ ...valid, video: 'https://example.com/x' });
    expect(r.error?.issues[0]).toMatchObject({
      path: ['video'],
      message: '유튜브 영상 주소를 확인해 주세요.',
    });
  });

  it('제목 · 분류 · 날짜 · 설명 길이', () => {
    expect(newsVideoCreateSchema.safeParse({ ...valid, title: ' ' }).success).toBe(false);
    expect(newsVideoCreateSchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(
      false
    );
    expect(newsVideoCreateSchema.safeParse({ ...valid, categoryId: '' }).success).toBe(false);
    expect(newsVideoCreateSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(
      newsVideoCreateSchema.safeParse({ ...valid, description: 'a'.repeat(5001) }).success
    ).toBe(false);
  });
});

describe('newsVideoUpdateSchema', () => {
  it('id · 열었을 때의 수정 시각이 더 있어야 한다', () => {
    expect(newsVideoUpdateSchema.safeParse(valid).success).toBe(false);
    expect(newsVideoUpdateSchema.safeParse({ ...valid, id: CAT, updatedAt: 't' }).success).toBe(
      true
    );
  });
});
