import { describe, expect, it } from 'vitest';

import { homeHeroSaveSchema } from './homeHeroInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const photo = {
  path: `home-hero/${LIST}/0190a0b0-0000-7000-8000-000000000002.webp`,
  kind: 'IMAGE',
  width: 2000,
  height: 1333,
  bytes: 1,
  originalName: 'a.webp',
  alt: '성복교회 전경',
};
const valid = { kind: 'PHOTO', photo: [photo], video: '', updatedAt: 't1' };

describe('homeHeroSaveSchema', () => {
  it('사진 — 대표 사진 한 장(영상 칸은 비운다)', () => {
    expect(
      homeHeroSaveSchema.parse({ ...valid, video: 'https://youtu.be/K-_StsRioZE' })
    ).toMatchObject({
      kind: 'PHOTO',
      videoId: null,
    });
  });
  it('유튜브 — 주소나 id 를 영상 id 로, 없으면 칸 오류', () => {
    expect(
      homeHeroSaveSchema.parse({
        ...valid,
        kind: 'YOUTUBE',
        video: 'https://www.youtube.com/watch?v=K-_StsRioZE',
      }).videoId
    ).toBe('K-_StsRioZE');
    const r = homeHeroSaveSchema.safeParse({ ...valid, kind: 'YOUTUBE', video: '아무 글' });
    expect(r.error?.issues[0]).toMatchObject({
      path: ['video'],
      message: '유튜브 주소를 넣어 주세요.',
    });
  });
  it('대표 사진은 어느 종류에서나 꼭 · 한 장 · 그림만', () => {
    expect(homeHeroSaveSchema.safeParse({ ...valid, photo: [] }).error?.issues[0]?.message).toBe(
      '대표 사진을 올려 주세요.'
    );
    expect(homeHeroSaveSchema.safeParse({ ...valid, photo: [photo, photo] }).success).toBe(false);
    const other = { ...photo, path: photo.path.replace('home-hero/', 'album/') };
    expect(homeHeroSaveSchema.safeParse({ ...valid, photo: [other] }).success).toBe(false);
  });
});
