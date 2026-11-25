import { describe, expect, it } from 'vitest';

import { rowToHomeHero } from './homeHero';

const B = 'https://x.supabase.co';
const file = {
  path: 'home-hero/l/a.webp',
  kind: 'IMAGE',
  width: 2000,
  height: 1333,
  alt: '성복교회 전경',
  sort: 1,
  variants: [[640, 'home-hero/l/b.webp']],
};

describe('rowToHomeHero — DB 의 홈 히어로 → 화면 값', () => {
  it('사진 — 대표 사진(폭별 파일 포함) · 대체 텍스트', () => {
    const hero = rowToHomeHero(B, {
      kind: 'PHOTO',
      youtube_video_id: null,
      photo: { files: [file] },
    });
    expect(hero).toMatchObject({
      kind: 'photo',
      videoId: null,
      alt: '성복교회 전경',
      photo: { src: `${B}/storage/v1/object/public/media/home-hero/l/a.webp`, width: 2000 },
    });
  });
  it('유튜브 — 영상 id 와 대표 사진(영상 전 · 좁은 화면 · 동작 줄이기에 쓴다)', () => {
    const hero = rowToHomeHero(B, {
      kind: 'YOUTUBE',
      youtube_video_id: 'K-_StsRioZE',
      photo: { files: [{ ...file, alt: null }] },
    });
    expect(hero).toMatchObject({ kind: 'youtube', videoId: 'K-_StsRioZE', alt: '성복교회' });
  });
  it('대표 사진이 없으면(읽을 수 없는 행) null — 화면은 레포의 장애 대비 사진', () => {
    expect(
      rowToHomeHero(B, { kind: 'PHOTO', youtube_video_id: null, photo: { files: [] } })
    ).toBeNull();
  });
});
