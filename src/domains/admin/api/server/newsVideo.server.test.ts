import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadNewsVideo } from './newsVideo.server';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';

const clientWith = (data: unknown) => {
  const calls: unknown[][] = [];
  const c = {
    eq: (...a: unknown[]) => (calls.push(a), c),
    maybeSingle: async () => ({ data, error: null }),
  };
  return { client: { from: () => ({ select: () => c }) } as never, calls };
};

describe('loadNewsVideo', () => {
  it('그 메뉴(feed)의 글 한 건 — 분류 이름 · 영상 · 휴지통 여부', async () => {
    const { client, calls } = clientWith({
      id: ID,
      title: '11월 29일 주일 광고',
      category_id: 'c1',
      categories: { label: '주일광고' },
      date: '2026-11-29',
      date_from: 'EVENT',
      video_id: 'Cm0wL9_z9uM',
      thumbnail: 't',
      description: null,
      status: 'PUBLISHED',
      deleted_at: '2026-11-24T00:00:00Z',
      created_at: 'c',
      created_by: null,
      updated_at: 'u',
      updated_by: 'u1',
    });
    const v = await loadNewsVideo(client, 'announcements', ID);
    expect(calls).toEqual([
      ['id', ID],
      ['feed', 'ANNOUNCEMENTS'],
    ]);
    expect(v).toEqual({
      id: ID,
      title: '11월 29일 주일 광고',
      categoryId: 'c1',
      categoryLabel: '주일광고',
      date: '2026-11-29',
      dateFrom: 'EVENT',
      videoId: 'Cm0wL9_z9uM',
      thumbnail: 't',
      description: '',
      status: 'PUBLISHED',
      trashed: true,
      deletedAt: '2026-11-24T00:00:00Z',
      createdAt: 'c',
      createdBy: null,
      updatedAt: 'u',
      updatedBy: 'u1',
    });
  });

  it('없거나 다른 메뉴의 글이면 null', async () => {
    expect(await loadNewsVideo(clientWith(null).client, 'garden', ID)).toBeNull();
  });
});
