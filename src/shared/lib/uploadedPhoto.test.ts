import { describe, expect, it } from 'vitest';

import { toUploadedPhoto } from './uploadedPhoto';

describe('toUploadedPhoto — DB 파일 줄 → 화면의 올린 사진', () => {
  it('원본 · 폭별 파일 경로를 공개 주소로(가로 오름차순)', () => {
    expect(
      toUploadedPhoto('https://x.supabase.co', {
        path: 'departments/l/a.webp',
        width: 2000,
        height: 1333,
        variants: [
          [1280, 'departments/l/c.webp'],
          [640, 'departments/l/b.webp'],
        ],
      })
    ).toEqual({
      src: 'https://x.supabase.co/storage/v1/object/public/media/departments/l/a.webp',
      width: 2000,
      height: 1333,
      variants: [
        [640, 'https://x.supabase.co/storage/v1/object/public/media/departments/l/b.webp'],
        [1280, 'https://x.supabase.co/storage/v1/object/public/media/departments/l/c.webp'],
      ],
    });
  });
  it('폭별 파일이 없으면 빈 목록 · 크기가 없으면 null', () => {
    expect(
      toUploadedPhoto('https://x', { path: 'a/b.webp', width: 10, height: 10, variants: null })
        ?.variants
    ).toEqual([]);
    expect(
      toUploadedPhoto('https://x', { path: 'a/b.webp', width: null, height: null })
    ).toBeNull();
  });
});
