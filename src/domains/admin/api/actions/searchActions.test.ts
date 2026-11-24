import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchContent } from './searchActions';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  calls: [] as { table: string; ops: unknown[][] }[],
  rows: {} as Record<string, unknown[]>,
}));

vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'u' } } : null
  ),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: (table: string) => {
      const entry = { table, ops: [] as unknown[][] };
      m.calls.push(entry);
      const c: Record<string, unknown> = {};
      for (const k of ['select', 'eq', 'is', 'ilike', 'or', 'gte', 'lt', 'order', 'limit'])
        c[k] = (...a: unknown[]) => (entry.ops.push([k, ...a]), c);
      c.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({
          data:
            m.rows[
              `${table}:${entry.ops.find(o => o[0] === 'eq' && o[1] === 'feed')?.[2] ?? ''}`
            ] ?? [],
          error: null,
        }).then(res);
      return c;
    },
  })),
}));

const ID = '0190a0b0-0000-7000-8000-0000000000b1';

beforeEach(() => {
  m.allowed = new Set(
    ['bulletin', 'announcements', 'garden', 'album', 'resources'].map(k => `${k}:READ`)
  );
  m.calls = [];
  m.rows = {};
});
afterEach(() => vi.clearAllMocks());

describe('searchContent', () => {
  it('조회 권한이 있는 메뉴만, 휴지통 아닌 글을 메뉴마다 5개까지 — 고르면 그 글의 상세로', async () => {
    m.allowed = new Set(['announcements:READ', 'album:READ']);
    m.rows['news_videos:ANNOUNCEMENTS'] = [
      { id: ID, title: '11월 29일 주일 광고', date: '2026-11-29', status: 'DRAFT' },
    ];
    m.rows['albums:'] = [{ id: ID, title: '주일학교 앨범', status: 'PUBLISHED' }];
    const res = await searchContent({ q: ' 주일 ' });
    expect(m.calls.map(c => c.table).sort()).toEqual(['albums', 'news_videos']);
    const news = m.calls.find(c => c.table === 'news_videos')!;
    expect(news.ops).toContainEqual(['ilike', 'title', '%주일%']);
    expect(news.ops).toContainEqual(['is', 'deleted_at', null]);
    expect(news.ops).toContainEqual(['limit', 5]);
    expect(res).toEqual({
      ok: true,
      data: {
        items: [
          {
            menu: 'announcements',
            id: ID,
            title: '11월 29일 주일 광고',
            detail: '2026-11-29 · 임시저장',
            href: `/admin/announcements/${ID}`,
          },
          {
            menu: 'album',
            id: ID,
            title: '주일학교 앨범',
            detail: '공개',
            href: `/admin/album/${ID}`,
          },
        ],
      },
    });
  });

  it('검색어의 % · _ 는 글자 그대로 찾는다', async () => {
    m.allowed = new Set(['album:READ']);
    await searchContent({ q: '100%_완료' });
    expect(m.calls[0].ops).toContainEqual(['ilike', 'title', '%100\\%\\_완료%']);
  });

  it('주보는 날짜 모양일 때만 찾는다(제목이 없다)', async () => {
    m.allowed = new Set(['bulletin:READ']);
    m.rows['bulletins:'] = [{ id: ID, date: '2026-11-29', status: 'PUBLISHED' }];
    expect(await searchContent({ q: '주보' })).toEqual({ ok: true, data: { items: [] } });
    expect(m.calls).toEqual([]);
    const res = await searchContent({ q: '2026-11' });
    expect(m.calls[0].ops).toContainEqual(['gte', 'date', '2026-11-01']);
    expect(m.calls[0].ops).toContainEqual(['lt', 'date', '2026-12-01']);
    expect(res).toMatchObject({
      data: {
        items: [
          { menu: 'bulletin', title: '2026년 11월 29일 주보', href: `/admin/bulletin/${ID}` },
        ],
      },
    });
  });

  it('설교 시트지는 제목 · 본문에서', async () => {
    m.allowed = new Set(['resources:READ']);
    await searchContent({ q: '사도행전' });
    expect(m.calls[0].ops.find(o => o[0] === 'or')?.[1]).toContain('passage.ilike');
  });

  it('검색어가 2자 미만이면 묻지 않는다', async () => {
    expect(await searchContent({ q: 'a' })).toEqual({ ok: true, data: { items: [] } });
    expect(m.calls).toEqual([]);
  });
});
