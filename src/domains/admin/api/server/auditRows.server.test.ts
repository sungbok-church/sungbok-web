import { describe, expect, it, vi } from 'vitest';

import { referenceNames, withActorNames } from './auditRows.server';

const row = (id: number, actor_id: string | null) => ({
  id,
  table_name: 'groups',
  action: 'UPDATE',
  at: 't',
  changes: {},
  actor_id,
});

describe('withActorNames', () => {
  it('이름을 한 번에 읽어 붙이고, 사람이 없으면 «시스템», 못 찾으면 «알 수 없는 사용자»', async () => {
    const rpc = vi.fn(async () => ({ data: [{ id: 'u1', name: '홍길동' }], error: null }));
    const out = await withActorNames({ rpc } as never, [
      row(1, 'u1'),
      row(2, null),
      row(3, 'u2'),
      row(4, 'u1'),
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('actor_names', { p_ids: ['u1', 'u2'] });
    expect(out.map(r => r.actorName)).toEqual(['홍길동', '시스템', '알 수 없는 사용자', '홍길동']);
  });

  it('사람이 하나도 없으면 DB 를 부르지 않는다', async () => {
    const rpc = vi.fn();
    await withActorNames({ rpc } as never, [row(1, null)]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

const M1 = '01a1f5c5-0000-7000-8000-0000000000m1'.replace('m1', 'a1');
const G1 = '01a1f5c5-0000-7000-8000-0000000000b1';
const U1 = 'd935ee10-e856-4ddd-a9c4-02ed6d730a97';

describe('referenceNames', () => {
  it('바뀐 칸에 나온 메뉴 · 그룹 · 사람 id 를 이름표로', async () => {
    const tables: Record<
      string,
      { id: string; name?: string; label?: string | null; default_label?: string }[]
    > = {
      menus: [{ id: M1, label: null, default_label: '주보' }],
      groups: [{ id: G1, name: '콘텐츠 담당' }],
    };
    const client = {
      from: (t: string) => ({
        select: () => ({ in: async () => ({ data: tables[t], error: null }) }),
      }),
      rpc: vi.fn(async () => ({ data: [{ id: U1, name: '홍길동' }], error: null })),
    };
    const names = await referenceNames(client as never, [
      { changes: { menu_id: M1, group_id: G1 } },
      { changes: { user_id: [U1, U1], name: '무시' } },
    ]);
    expect(names).toEqual({ [M1]: '주보', [G1]: '콘텐츠 담당', [U1]: '홍길동' });
  });

  it('글의 파일 묶음 칸(쪽 · 사진 · 파일)은 «파일 n개» 로 — 정리돼 없어진 묶음은 «파일 정리됨»', async () => {
    const L1 = '01a1f5c5-0000-7000-8000-0000000000c1';
    const L2 = '01a1f5c5-0000-7000-8000-0000000000c2';
    const L3 = '01a1f5c5-0000-7000-8000-0000000000c3';
    const client = {
      from: (t: string) => ({
        select: () => ({
          in: async () => ({
            data:
              t === 'file_lists'
                ? [{ id: L1 }, { id: L2 }]
                : [{ list_id: L1 }, { list_id: L1 }, { list_id: L2 }],
            error: null,
          }),
        }),
      }),
      rpc: vi.fn(),
    };
    const names = await referenceNames(client as never, [
      { changes: { pages_list_id: [L1, L2] } },
      { changes: { images_list_id: L3 } },
    ]);
    expect(names).toEqual({ [L1]: '파일 2개', [L2]: '파일 1개', [L3]: '파일 정리됨' });
  });

  it('찾을 id 가 없으면 DB 를 부르지 않는다', async () => {
    const client = { from: vi.fn(), rpc: vi.fn() };
    expect(await referenceNames(client as never, [{ changes: { name: '가' } }])).toEqual({});
    expect(client.from).not.toHaveBeenCalled();
  });
});
