import { describe, expect, it } from 'vitest';

import type { Resource } from './resource.types';
import { toSheetLinks } from './sheetLinks';

const doc = (over: Partial<Resource>): Resource => ({
  id: 'a',
  status: 'published',
  section: 'sunday',
  group: '사도행전 강해',
  title: '제목',
  pages: [],
  videoIds: ['v'],
  ...over,
});

describe('toSheetLinks', () => {
  it('자료를 예배 화면의 시트지 카드 정보로 — 자료실 자료 주소와 제목·분류', () => {
    expect(
      toSheetLinks([
        doc({ id: '0404-40', episode: 66, title: '도장 깨기' }),
        doc({ id: '0406-19', section: 'seasonal', group: '가정예배', title: '가정예배 순서지' }),
      ])
    ).toEqual([
      {
        id: '0404-40',
        href: '/resources/sunday-sermon/0404-40',
        title: '도장 깨기',
        label: '주일 설교 시트지',
      },
      {
        id: '0406-19',
        href: '/resources/seasonal-sermon/0406-19',
        title: '가정예배 순서지',
        label: '가정·명절·절기 설교 시트지',
      },
    ]);
  });

  it('연결된 자료가 없으면 빈 배열 — 카드를 그리지 않는다', () => {
    expect(toSheetLinks([])).toEqual([]);
  });
});
