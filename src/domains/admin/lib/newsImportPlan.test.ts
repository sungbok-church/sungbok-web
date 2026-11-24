import { describe, expect, it } from 'vitest';

import type { NewsVideo } from '@/domains/news/api/news.types';

import { planNewsVideoImport } from './newsImportPlan';

const seed = (over: Partial<NewsVideo>): NewsVideo => ({
  id: '0401-147',
  status: 'published',
  feed: 'announcements',
  title: '11월 15일 주일 광고',
  category: '주일광고',
  date: '2026-11-15',
  dateFrom: 'event',
  videoId: 'Cm0wL9_z9uM',
  thumbnail: 't',
  poster: 'p',
  description: '광고',
  ...over,
});

const CATS = { 'ANNOUNCEMENTS_CATEGORY:주일광고': 'c1', 'GARDEN_CATEGORY:부흥집회': 'c2' };

describe('planNewsVideoImport', () => {
  it('DB 행 모양으로 — 기존 글번호 · 분류 id · 대문자 값 · 공개, 이미 있는 글번호는 건너뛴다', () => {
    const plan = planNewsVideoImport(
      [
        seed({}),
        seed({
          id: '0407-3',
          feed: 'garden',
          category: '부흥집회',
          dateFrom: 'upload',
          description: undefined,
        }),
        seed({ id: '0401-146' }),
      ],
      new Set(['0401-146']),
      CATS,
      new Set()
    );
    expect(plan.skipped).toEqual(['0401-146']);
    expect(plan.rows).toEqual([
      {
        legacy_id: '0401-147',
        feed: 'ANNOUNCEMENTS',
        title: '11월 15일 주일 광고',
        category_id: 'c1',
        date: '2026-11-15',
        date_from: 'EVENT',
        video_id: 'Cm0wL9_z9uM',
        thumbnail: 't',
        poster: 'p',
        description: '광고',
        status: 'PUBLISHED',
      },
      expect.objectContaining({
        legacy_id: '0407-3',
        feed: 'GARDEN',
        category_id: 'c2',
        date_from: 'UPLOAD',
        description: null,
      }),
    ]);
  });

  it('분류를 못 찾거나 임시저장 · 글번호 모양이 틀린 글은 옮기지 않고 알린다', () => {
    const plan = planNewsVideoImport(
      [
        seed({ id: '0407-9', feed: 'garden', category: '없는 분류' }),
        seed({ id: '0401-1', status: 'draft' }),
        seed({ id: 'x' }),
      ],
      new Set(),
      CATS,
      new Set()
    );
    expect(plan.rows).toEqual([]);
    expect(plan.invalid).toEqual(['0407-9', '0401-1', 'x']);
  });
});

describe('planNewsVideoImport — 관리자가 먼저 올린 같은 영상', () => {
  it('같은 메뉴에 같은 영상이 이미 있으면 건너뛴다(관리자에 있는 것이 이긴다 — 넣기가 통째로 실패하지 않게)', () => {
    const plan = planNewsVideoImport(
      [seed({})],
      new Set(),
      CATS,
      new Set(['ANNOUNCEMENTS:Cm0wL9_z9uM'])
    );
    expect(plan.rows).toEqual([]);
    expect(plan.skipped).toEqual(['0401-147']);
  });
});
