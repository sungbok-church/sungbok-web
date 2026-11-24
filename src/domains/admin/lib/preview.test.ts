import { describe, expect, it } from 'vitest';

import {
  PREVIEW_READY,
  PREVIEW_VALUES,
  PREVIEW_WIDTHS,
  readPreviewMessage,
  toPreviewIssue,
} from './preview';

const ORIGIN = 'http://127.0.0.1:3011';

describe('readPreviewMessage', () => {
  it('같은 출처 · 정한 모양의 메시지만 받는다', () => {
    const values = { date: '2026-11-29', pages: [] };
    expect(
      readPreviewMessage(
        { origin: ORIGIN, data: { type: PREVIEW_VALUES, menu: 'bulletin', values } },
        ORIGIN
      )
    ).toEqual({ type: PREVIEW_VALUES, menu: 'bulletin', values });
    expect(readPreviewMessage({ origin: ORIGIN, data: { type: PREVIEW_READY } }, ORIGIN)).toEqual({
      type: PREVIEW_READY,
    });
    expect(
      readPreviewMessage({ origin: 'https://evil.test', data: { type: PREVIEW_READY } }, ORIGIN)
    ).toBeNull();
    expect(readPreviewMessage({ origin: ORIGIN, data: 'hello' }, ORIGIN)).toBeNull();
    expect(readPreviewMessage({ origin: ORIGIN, data: { type: 'other' } }, ORIGIN)).toBeNull();
  });
});

describe('toPreviewIssue', () => {
  it('폼의 값(저장 전) → 공개 화면의 호 — 그림만, Storage 주소로', () => {
    expect(
      toPreviewIssue(
        {
          date: '2026-11-29',
          pages: [
            {
              path: 'bulletin/l/1.webp',
              kind: 'IMAGE',
              width: 1200,
              height: 854,
              bytes: 1,
              originalName: '1.webp',
              alt: null,
            },
          ],
        },
        'https://x.supabase.co'
      )
    ).toEqual({
      id: '2026-11-29',
      status: 'published',
      date: '2026-11-29',
      pages: [
        {
          src: 'https://x.supabase.co/storage/v1/object/public/media/bulletin/l/1.webp',
          width: 1200,
          height: 854,
        },
      ],
    });
  });
});

describe('PREVIEW_WIDTHS', () => {
  it('PC · 태블릿 · 휴대폰', () => {
    expect(PREVIEW_WIDTHS.map(w => [w.label, w.width])).toEqual([
      ['PC', 1280],
      ['태블릿', 768],
      ['휴대폰', 375],
    ]);
  });
});
