import { describe, expect, it } from 'vitest';

import { storageDownloadUrl, storagePublicUrl } from './storageUrl';

describe('storagePublicUrl', () => {
  it('공개 버킷의 파일 주소 — 끝 / 는 한 번만', () => {
    expect(storagePublicUrl('https://x.supabase.co/', 'media', 'bulletin/a/b.webp')).toBe(
      'https://x.supabase.co/storage/v1/object/public/media/bulletin/a/b.webp'
    );
  });
  it('경로 조각마다 인코딩한다(/ 는 그대로)', () => {
    expect(storagePublicUrl('http://127.0.0.1:54321', 'media', 'a b/c#d.webp')).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/media/a%20b/c%23d.webp'
    );
  });
});

describe('storageDownloadUrl', () => {
  it('Storage 공개 주소에는 ?download=<이름> — 출처가 달라 a[download] 가 무시되므로 서버가 내려받기로 답하게', () => {
    expect(
      storageDownloadUrl(
        'https://x.supabase.co/storage/v1/object/public/media/resources/a/b.pdf',
        '사도행전 66.pdf'
      )
    ).toBe(
      'https://x.supabase.co/storage/v1/object/public/media/resources/a/b.pdf?download=%EC%82%AC%EB%8F%84%ED%96%89%EC%A0%84%2066.pdf'
    );
  });
  it('이미 쿼리가 있으면 & 로 잇는다', () => {
    expect(
      storageDownloadUrl(
        'https://x.supabase.co/storage/v1/object/public/media/a/b.webp?v=1',
        'a.webp'
      )
    ).toBe('https://x.supabase.co/storage/v1/object/public/media/a/b.webp?v=1&download=a.webp');
  });
  it('Storage 주소가 아니면(같은 출처 등) 그대로', () => {
    expect(storageDownloadUrl('/images/a.webp', 'a.webp')).toBe('/images/a.webp');
  });
});
