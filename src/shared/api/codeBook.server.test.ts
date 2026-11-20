import { afterEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  tables: [] as string[],
  rows: [] as unknown[],
  error: null as null | { message: string },
}));

vi.mock('server-only', () => ({}));
vi.mock('./supabase/readClient.server', () => ({
  createSupabaseReadClient: () => ({
    from: (table: string) => {
      m.tables.push(table);
      return {
        select: () => ({
          order: () => ({ order: async () => ({ data: m.rows, error: m.error }) }),
        }),
      };
    },
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  m.tables = [];
  m.rows = [];
  m.error = null;
});

const withSupabase = () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub');
};

describe('공통코드 · 분류 읽기(캐시 없음, ADR 0023)', () => {
  it('공통코드를 DB 에서 읽어 묶음별로 돌려준다', async () => {
    withSupabase();
    m.rows = [{ group_key: 'STAFF_ROLE', code: 'PASTOR', label: '목사', is_active: true }];
    const { getCodeBook } = await import('./codeBook.server');
    expect(await getCodeBook()).toEqual({ STAFF_ROLE: [m.rows[0]] });
    expect(m.tables).toEqual(['codes']);
  });

  it('분류를 DB 에서 읽어 묶음별로 돌려준다', async () => {
    withSupabase();
    m.rows = [
      { group_key: 'ALBUM_CATEGORY', id: 'a', slug: 'event', label: '행사', is_active: true },
    ];
    const { getCategoryBook } = await import('./codeBook.server');
    expect(await getCategoryBook()).toEqual({ ALBUM_CATEGORY: [m.rows[0]] });
    expect(m.tables).toEqual(['categories']);
  });

  it('DB 오류는 던진다 — 빈 선택지로 조용히 그리지 않게', async () => {
    withSupabase();
    m.error = { message: 'down' };
    const { getCodeBook } = await import('./codeBook.server');
    await expect(getCodeBook()).rejects.toThrow('공통코드를 읽지 못했습니다');
  });

  it('Supabase 설정이 없으면(로컬 · 미리보기) DB 를 부르지 않고 빈 목록', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const { getCategoryBook } = await import('./codeBook.server');
    expect(await getCategoryBook()).toEqual({});
    expect(m.tables).toEqual([]);
  });
});
