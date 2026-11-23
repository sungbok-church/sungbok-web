import { describe, expect, it } from 'vitest';

import { loadGroupMatrix } from './groupMatrix.server';

const MENUS = [
  {
    id: 'm-sys',
    key: 'system',
    parent_id: null,
    label: null,
    default_label: '시스템',
    sort: 40,
    actions: [],
  },
  {
    id: 'm-users',
    key: 'users',
    parent_id: 'm-sys',
    label: '계정',
    default_label: '사용자',
    sort: 10,
    actions: ['READ', 'UPDATE'],
  },
];

const client = (granted: { action: string; menus: { key: string } | null }[]) => ({
  from: (table: string) => {
    if (table === 'menus')
      return { select: () => ({ eq: () => ({ order: async () => ({ data: MENUS }) }) }) };
    return { select: () => ({ eq: async () => ({ data: granted }) }) };
  },
});

describe('loadGroupMatrix', () => {
  it('관리자 메뉴 · 그룹이 가진 권한으로 표를 만든다(라벨은 고친 이름 우선)', async () => {
    const rows = await loadGroupMatrix(
      client([{ action: 'READ', menus: { key: 'users' } }]) as never,
      'g1'
    );
    expect(rows).toEqual([
      {
        menuKey: 'users',
        label: '계정',
        groupLabel: '시스템',
        cells: [
          { action: 'READ', label: '조회', checked: true },
          { action: 'UPDATE', label: '수정', checked: false },
        ],
      },
    ]);
  });

  it('새 그룹(id 없음)은 빈 표', async () => {
    const rows = await loadGroupMatrix(
      client([{ action: 'READ', menus: { key: 'users' } }]) as never
    );
    expect(rows[0].cells.map(c => c.checked)).toEqual([false, false]);
  });
});
