import { describe, expect, it } from 'vitest';

import type { BulletinIssue } from './news.types';
import { mergeWithSeed, toIssues } from './bulletinLoad.server';

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

describe('mergeWithSeed — 옮기기 전까지(시드를 지우면 함께 없앤다)', () => {
  const issue = (date: string, src: string): BulletinIssue => ({
    id: date,
    status: 'published',
    date,
    pages: [{ src, width: 1, height: 1 }],
  });
  it('옮기기 전(DB 에 시드 기간의 호가 없음) — DB 의 새 호 + 시드, 최신 주일부터', () => {
    const merged = mergeWithSeed(
      [issue('2026-11-29', 'db')],
      [issue('2026-11-15', 'seed'), issue('2026-11-08', 'seed')]
    );
    expect(merged.map(i => [i.date, i.pages[0].src])).toEqual([
      ['2026-11-29', 'db'],
      ['2026-11-15', 'seed'],
      ['2026-11-08', 'seed'],
    ]);
  });

  it('옮긴 뒤(DB 에 시드 기간의 호가 하나라도 있음) — DB 만. 휴지통 · 임시저장으로 내린 호가 시드로 되살아나지 않는다', () => {
    const merged = mergeWithSeed(
      [issue('2026-11-29', 'db'), issue('2026-11-08', 'db')],
      [issue('2026-11-15', 'seed'), issue('2026-11-08', 'seed')]
    );
    expect(merged.map(i => i.date)).toEqual(['2026-11-29', '2026-11-08']);
  });
});
