import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/codeBook.server', () => ({
  getCategoryBook: vi.fn(async () => ({
    RESOURCE_SUNDAY: [
      {
        group_key: 'RESOURCE_SUNDAY',
        id: 'a',
        slug: 'acts',
        label: '사도행전 강해',
        is_active: true,
      },
    ],
    RESOURCE_SERIES: [
      { group_key: 'RESOURCE_SERIES', id: 'b', slug: 'x', label: '옛 시리즈', is_active: false },
    ],
  })),
}));

import { loadSeriesBySection } from './resourceSeries.server';

describe('loadSeriesBySection', () => {
  it('분류마다 그 묶음의 선택지 — 꺼진 묶음은 고른 것만', async () => {
    expect(await loadSeriesBySection()).toEqual({
      SUNDAY: [{ value: 'a', label: '사도행전 강해' }],
      SERIES: [],
      SEASONAL: [],
    });
    expect((await loadSeriesBySection('b')).SERIES).toHaveLength(1);
  });
});
