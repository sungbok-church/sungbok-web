import { describe, expect, it } from 'vitest';

import { toIssues } from './bulletinLoad.server';

const BASE = 'https://x.supabase.co';
const file = (sort: number, kind = 'IMAGE') => ({
  bucket: 'media',
  path: `bulletin/l/${sort}.webp`,
  kind,
  width: kind === 'IMAGE' ? 1200 : null,
  height: kind === 'IMAGE' ? 854 : null,
  sort,
});

describe('toIssues', () => {
  it('DB 의 주보를 공개 화면 모양으로 — 주소 id 는 날짜, 쪽은 순서대로 Storage 주소', () => {
    expect(
      toIssues([{ date: '2026-11-29', file_lists: { files: [file(2), file(1)] } }], BASE)
    ).toEqual([
      {
        id: '2026-11-29',
        status: 'published',
        date: '2026-11-29',
        pages: [
          {
            src: `${BASE}/storage/v1/object/public/media/bulletin/l/1.webp`,
            width: 1200,
            height: 854,
          },
          {
            src: `${BASE}/storage/v1/object/public/media/bulletin/l/2.webp`,
            width: 1200,
            height: 854,
          },
        ],
      },
    ]);
  });

  it('그림이 아닌 파일은 쪽이 아니고, 쪽이 없는 호는 싣지 않는다', () => {
    expect(
      toIssues(
        [
          { date: '2026-11-29', file_lists: { files: [file(1, 'PDF')] } },
          { date: '2026-11-22', file_lists: null },
        ],
        BASE
      )
    ).toEqual([]);
  });
});
