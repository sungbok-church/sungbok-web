import { describe, expect, it } from 'vitest';

import type { Resource } from '@/domains/resources/api/resource.types';

import { planResourceImport } from './resourceImportPlan';

const seed = (over: Partial<Resource> = {}): Resource => ({
  id: '0404-40',
  status: 'published',
  section: 'sunday',
  group: '사도행전 강해',
  episode: 66,
  title: '도장 깨기',
  date: '2026-10-25',
  passage: '사도행전 13:4-7',
  file: { url: '/files/resources/0404-40.pdf', name: '시트지.pdf', kind: 'pdf' },
  pages: [{ src: '/files/resources/pages/0404-40-1.webp', width: 1200, height: 1698 }],
  videoIds: ['YYW0D6JNrGQ'],
  ...over,
});
const SERIES = { 'RESOURCE_SUNDAY:사도행전 강해': 's1', 'RESOURCE_SEASONAL:명절': 's2' };

describe('planResourceImport', () => {
  it('DB 행 · 파일 경로 · 영상으로 — 이미 있는 번호는 건너뛴다', () => {
    const plan = planResourceImport(
      [seed(), seed({ id: '0404-39' })],
      new Set(['0404-39']),
      SERIES
    );
    expect(plan.skipped).toEqual(['0404-39']);
    expect(plan.items).toEqual([
      {
        row: {
          slug: '0404-40',
          section: 'SUNDAY',
          series_id: 's1',
          episode: 66,
          title: '도장 깨기',
          date: '2026-10-25',
          year: null,
          passage: '사도행전 13:4-7',
          status: 'PUBLISHED',
        },
        original: {
          file: 'public/files/resources/0404-40.pdf',
          originalName: '시트지.pdf',
          kind: 'PDF',
          ext: 'pdf',
        },
        pages: [
          {
            file: 'public/files/resources/pages/0404-40-1.webp',
            originalName: '0404-40-1.webp',
            width: 1200,
            height: 1698,
          },
        ],
        videoIds: ['YYW0D6JNrGQ'],
      },
    ]);
  });
  it('날짜 없는 자료는 연도, 원본 없는 자료 · 한글 원본도 옮긴다', () => {
    const plan = planResourceImport(
      [
        seed({
          id: '0405-1',
          section: 'seasonal',
          group: '명절',
          date: undefined,
          year: '2025',
          file: undefined,
          episode: undefined,
          passage: undefined,
          videoIds: [],
        }),
        seed({
          id: '0405-2',
          section: 'seasonal',
          group: '명절',
          file: { url: '/files/resources/0405-2.hwp', name: '명절.hwp', kind: 'hwp' },
          pages: [],
        }),
      ],
      new Set(),
      SERIES
    );
    expect(plan.items[0]).toMatchObject({
      row: { date: null, year: 2025, episode: null, passage: null },
      original: null,
    });
    expect(plan.items[1]).toMatchObject({ original: { kind: 'HWP', ext: 'hwp' }, pages: [] });
  });
  it('묶음을 못 찾거나 public/files 밖이면 옮기지 않고 알린다', () => {
    const plan = planResourceImport(
      [
        seed({ id: '0404-1', group: '없는 강해' }),
        seed({ id: '0404-2', file: { url: '/../x.pdf', name: 'x', kind: 'pdf' } }),
      ],
      new Set(),
      SERIES
    );
    expect(plan.items).toEqual([]);
    expect(plan.invalid).toEqual(['0404-1', '0404-2']);
  });
});
