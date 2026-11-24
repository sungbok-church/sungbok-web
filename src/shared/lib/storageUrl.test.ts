import { describe, expect, it } from 'vitest';

import { storagePublicUrl } from './storageUrl';

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
