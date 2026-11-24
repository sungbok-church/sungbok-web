import { describe, expect, it } from 'vitest';

import type { Resource } from './resource.types';
import { mergeResourcesWithSeed, toResources } from './resourcesLoad.server';

const BASE = 'https://x.supabase.co';
const row = (over: object = {}) => ({
  slug: '1',
  section: 'SUNDAY' as const,
  title: '도장 깨기',
  episode: 66,
  date: '2026-10-25',
  year: null,
  passage: '사도행전 13:4-7',
  categories: { label: '사도행전 강해' },
  file: {
    files: [
      {
        bucket: 'media',
        path: 'resources/l/a.pdf',
        kind: 'PDF',
        original_name: '시트지.pdf',
        sort: 1,
      },
    ],
  },
  pages: {
    files: [
      {
        bucket: 'media',
        path: 'resources/p/2.webp',
        kind: 'IMAGE',
        width: 1200,
        height: 1698,
        sort: 2,
      },
      {
        bucket: 'media',
        path: 'resources/p/1.webp',
        kind: 'IMAGE',
        width: 1200,
        height: 1698,
        sort: 1,
      },
    ],
  },
  resource_videos: [{ video_id: 'YYW0D6JNrGQ' }],
  ...over,
});

describe('toResources', () => {
  it('DB 의 행 → 공개 자료 — 주소 id 는 번호, 분류는 소문자, 원본 · 쪽(순서대로) · 영상', () => {
    expect(toResources([row()], BASE)).toEqual([
      {
        id: '1',
        status: 'published',
        section: 'sunday',
        group: '사도행전 강해',
        episode: 66,
        title: '도장 깨기',
        date: '2026-10-25',
        passage: '사도행전 13:4-7',
        file: {
          url: `${BASE}/storage/v1/object/public/media/resources/l/a.pdf`,
          name: '시트지.pdf',
          kind: 'pdf',
        },
        pages: [
          {
            src: `${BASE}/storage/v1/object/public/media/resources/p/1.webp`,
            width: 1200,
            height: 1698,
          },
          {
            src: `${BASE}/storage/v1/object/public/media/resources/p/2.webp`,
            width: 1200,
            height: 1698,
          },
        ],
        videoIds: ['YYW0D6JNrGQ'],
      },
    ]);
  });
  it('날짜가 없으면 연도, 원본이 없으면 file 없음, 한글 파일은 hwp', () => {
    const [r] = toResources(
      [
        row({
          date: null,
          year: 2025,
          episode: null,
          passage: null,
          file: null,
          resource_videos: [],
        }),
      ],
      BASE
    );
    expect(r).toMatchObject({ year: '2025', videoIds: [] });
    expect(r).not.toHaveProperty('file');
    expect(r).not.toHaveProperty('date');
    expect(r).not.toHaveProperty('episode');
    const [h] = toResources(
      [
        row({
          file: {
            files: [
              {
                bucket: 'media',
                path: 'resources/l/a.hwp',
                kind: 'HWP',
                original_name: '명절.hwp',
                sort: 1,
              },
            ],
          },
        }),
      ],
      BASE
    );
    expect(h.file?.kind).toBe('hwp');
  });
});

const res = (id: string, title: string): Resource => ({
  id,
  status: 'published',
  section: 'sunday',
  group: '',
  title,
  pages: [],
  videoIds: [],
});

describe('mergeResourcesWithSeed — 옮기기 전까지', () => {
  const seed = [res('0404-40', 'seed40'), res('0404-39', 'seed39')];
  it('옮긴 자료(«0404-40» 모양 번호)가 DB 에 없으면 DB 의 새 자료 + 시드', () => {
    expect(mergeResourcesWithSeed([res('1', 'db')], seed).map(r => r.title)).toEqual([
      'db',
      'seed40',
      'seed39',
    ]);
  });
  it('옮긴 자료가 하나라도 있으면 DB 만', () => {
    expect(
      mergeResourcesWithSeed([res('1', 'db'), res('0404-40', 'db40')], seed).map(r => r.title)
    ).toEqual(['db', 'db40']);
  });
});
