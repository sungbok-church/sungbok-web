import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const m = vi.hoisted(() => ({
  allowed: true,
  rows: [] as unknown[],
  audit: vi.fn(),
  filters: [] as unknown[][],
}));
vi.mock('server-only', () => ({}));
vi.mock('@/domains/admin/api/server/adminContext.server', () => ({
  actionPermission: vi.fn(async () => (m.allowed ? { user: { id: 'u' } } : null)),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => {
    const q: Record<string, unknown> = {};
    for (const k of ['select', 'order', 'eq', 'gte', 'lt'])
      q[k] = (...a: unknown[]) => (m.filters.push([k, ...a]), q);
    q.limit = async () => ({ data: m.rows, error: null });
    return {
      from: (t: string) =>
        t === 'audit_log' ? { insert: async (r: unknown) => (m.audit(r), { error: null }) } : q,
    };
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
  m.filters = [];
});

const req = (qs: string) => new Request(`https://x.kr/admin/newcomers/export?${qs}`);

describe('GET /admin/newcomers/export', () => {
  it('지금 조건 그대로 .xlsx 를 주고, 내려받은 건수를 이력에 남긴다', async () => {
    m.rows = [
      {
        created_at: '2026-11-25T01:30:00Z',
        intent: 'INQUIRY',
        name: '홍길동',
        phone: '010-1',
        visit_date: null,
        message: null,
        status: 'NEW',
        note: null,
      },
    ];
    const res = await GET(req('status=NEW'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    expect(res.headers.get('content-disposition')).toContain("filename*=UTF-8''");
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(m.filters).toContainEqual(['eq', 'status', 'NEW']);
    expect(m.audit).toHaveBeenCalledWith({
      table_name: 'newcomers',
      action: 'EXPORT',
      changes: { count: 1 },
    });
  });
  it('«내려받기» 권한이 없으면 404', async () => {
    m.allowed = false;
    expect((await GET(req(''))).status).toBe(404);
    expect(m.audit).not.toHaveBeenCalled();
    m.allowed = true;
  });
});
