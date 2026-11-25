import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteNav } from '@/shared/config/siteNav';

import { loadSiteNav } from './siteNavLoad.server';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock('@/shared/lib/isRuntimeRegeneration', () => ({ isRuntimeRegeneration: () => false }));

const m = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as null | { message: string },
  env: true,
  filters: [] as [string, unknown][],
}));
vi.mock('@/shared/api/supabase/env', () => ({
  readSupabaseEnv: () => (m.env ? { url: 'https://x.supabase.co', key: 'k' } : null),
}));
vi.mock('@/shared/api/supabase/readClient.server', () => ({
  createSupabaseReadClient: () => ({
    from: () => ({
      select: () => ({
        eq: async (col: string, v: unknown) => (
          m.filters.push([col, v]),
          { data: m.error ? null : m.rows, error: m.error }
        ),
      }),
    }),
  }),
}));

afterEach(() => {
  m.rows = [];
  m.error = null;
  m.env = true;
  m.filters = [];
  vi.spyOn(console, 'error').mockRestore();
});

describe('loadSiteNav', () => {
  it('홈페이지 메뉴 줄을 읽어 코드 메뉴에 덮어쓴다', async () => {
    m.rows = [
      { path: '/about', label: '우리 교회', sort: 10, is_active: true },
      { path: '/about/history', label: null, sort: 50, is_active: false },
    ];
    const nav = await loadSiteNav();
    expect(m.filters).toContainEqual(['area', 'SITE']);
    expect(nav[0].label).toBe('우리 교회');
    expect(nav[0].children?.map(c => c.slug)).not.toContain('history');
  });

  it('DB 를 읽지 못하면 코드 메뉴 그대로(메뉴 때문에 사이트가 깨지지 않게)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.error = { message: 'down' };
    expect(await loadSiteNav()).toEqual(siteNav);
  });

  it('DB 설정이 없으면 코드 메뉴 그대로', async () => {
    m.env = false;
    expect(await loadSiteNav()).toEqual(siteNav);
  });
});
