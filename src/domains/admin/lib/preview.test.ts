import { describe, expect, it } from 'vitest';

import {
  PREVIEW_READY,
  PREVIEW_VALUES,
  PREVIEW_WIDTHS,
  readPreviewMessage,
  toPreviewAlbum,
  toPreviewIssue,
  toPreviewResource,
  toPreviewSermon,
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

describe('readPreviewMessage — 영상(주일광고 · 성복의 뜰)', () => {
  it('두 메뉴의 값도 받는다, 모르는 메뉴는 버린다', () => {
    const values = {
      title: 't',
      categoryLabel: '주일광고',
      date: '2026-11-29',
      videoId: null,
      description: '',
    };
    expect(
      readPreviewMessage(
        { origin: ORIGIN, data: { type: PREVIEW_VALUES, menu: 'garden', values } },
        ORIGIN
      )
    ).toEqual({ type: PREVIEW_VALUES, menu: 'garden', values });
    expect(
      readPreviewMessage(
        { origin: ORIGIN, data: { type: PREVIEW_VALUES, menu: 'users', values } },
        ORIGIN
      )
    ).toBeNull();
  });
});

describe('toPreviewSermon', () => {
  it('폼의 값 → 공개 «영상 한 편» 화면의 영상 — 분류 이름이 묶음 자리에', () => {
    expect(
      toPreviewSermon({
        title: '11월 29일 주일 광고',
        categoryLabel: '주일광고',
        date: '2026-11-29',
        videoId: 'Cm0wL9_z9uM',
        description: '광고',
      })
    ).toEqual({
      id: 'Cm0wL9_z9uM',
      title: '11월 29일 주일 광고',
      series: '주일광고',
      date: '2026-11-29',
      dateFrom: 'sermon',
      thumbnail: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
      poster: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
    });
  });
  it('영상이 없으면 null(그릴 것이 없다)', () => {
    expect(
      toPreviewSermon({
        title: 't',
        categoryLabel: '',
        date: '2026-11-29',
        videoId: null,
        description: '',
      })
    ).toBeNull();
  });
});

describe('toPreviewAlbum', () => {
  it('폼의 값 → 공개 앨범 화면의 한 건 — 그림만, Storage 주소로', () => {
    expect(
      toPreviewAlbum(
        {
          title: '여름성경학교',
          categoryLabel: '다음세대',
          images: [
            {
              path: 'album/l/1.webp',
              kind: 'IMAGE',
              width: 700,
              height: 998,
              bytes: 1,
              originalName: '1.webp',
              alt: null,
            },
          ],
        },
        'https://x.supabase.co'
      )
    ).toEqual({
      id: 'preview',
      status: 'published',
      title: '여름성경학교',
      category: '다음세대',
      images: [
        {
          src: 'https://x.supabase.co/storage/v1/object/public/media/album/l/1.webp',
          width: 700,
          height: 998,
        },
      ],
    });
  });
  it('앨범 메뉴의 값도 받는다', () => {
    const values = { title: 't', categoryLabel: '', images: [] };
    expect(
      readPreviewMessage(
        { origin: ORIGIN, data: { type: PREVIEW_VALUES, menu: 'album', values } },
        ORIGIN
      )
    ).toEqual({ type: PREVIEW_VALUES, menu: 'album', values });
  });
});

describe('toPreviewResource', () => {
  const f = (path: string, kind: 'PDF' | 'IMAGE') => ({
    path,
    kind,
    width: kind === 'IMAGE' ? 1200 : null,
    height: kind === 'IMAGE' ? 1698 : null,
    bytes: 1,
    originalName: kind === 'PDF' ? '시트지.pdf' : '1.webp',
    alt: null,
  });
  it('폼의 값 → 공개 «문서 열람» 의 한 건 — 원본 · 쪽 그림 · 영상 링크(유튜브)', () => {
    const { resource, videoLinks } = toPreviewResource(
      {
        section: 'SUNDAY',
        seriesLabel: '사도행전 강해',
        episode: '66',
        title: '도장 깨기',
        date: '2026-10-25',
        year: '',
        passage: '사도행전 13:4-7',
        file: [f('resources/l/a.pdf', 'PDF')],
        pages: [f('resources/l/1.webp', 'IMAGE')],
        videoIds: ['YYW0D6JNrGQ'],
      },
      'https://x.supabase.co'
    );
    expect(resource).toEqual({
      id: 'preview',
      status: 'published',
      section: 'sunday',
      group: '사도행전 강해',
      episode: 66,
      title: '도장 깨기',
      date: '2026-10-25',
      passage: '사도행전 13:4-7',
      file: {
        url: 'https://x.supabase.co/storage/v1/object/public/media/resources/l/a.pdf',
        name: '시트지.pdf',
        kind: 'pdf',
      },
      pages: [
        {
          src: 'https://x.supabase.co/storage/v1/object/public/media/resources/l/1.webp',
          width: 1200,
          height: 1698,
        },
      ],
      videoIds: ['YYW0D6JNrGQ'],
    });
    expect(videoLinks).toEqual([
      {
        videoId: 'YYW0D6JNrGQ',
        href: 'https://www.youtube.com/watch?v=YYW0D6JNrGQ',
        external: true,
      },
    ]);
  });
  it('날짜가 없으면 연도, 원본이 없으면 file 없음', () => {
    const { resource } = toPreviewResource(
      {
        section: 'SEASONAL',
        seriesLabel: '명절',
        episode: '',
        title: 't',
        date: '',
        year: '2025',
        passage: '',
        file: [],
        pages: [],
        videoIds: [],
      },
      ''
    );
    expect(resource).toMatchObject({ section: 'seasonal', year: '2025' });
    expect(resource).not.toHaveProperty('file');
    expect(resource).not.toHaveProperty('date');
  });
});
