import { describe, expect, it, vi } from 'vitest';

import { applyReorder } from './sortRows.server';

const clientWith = (error: { code: string; message: string } | null) => {
  const rpc = vi.fn(async () => ({ data: null, error }));
  return { rpc, client: { rpc } as never };
};

describe('applyReorder', () => {
  it('DB 함수 하나(reorder_rows)로 한 무리의 순서를 한 번에 저장한다', async () => {
    const { rpc, client } = clientWith(null);
    expect(await applyReorder(client, 'codes', ['b', 'a'])).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(rpc).toHaveBeenCalledWith('reorder_rows', { p_table: 'codes', p_ids: ['b', 'a'] });
  });

  it('무리가 그사이 바뀌었으면 DB 가 준 한글 문장을 그대로 알린다', async () => {
    const { client } = clientWith({
      code: '23514',
      message: '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
    });
    expect(await applyReorder(client, 'menus', ['a'])).toEqual({
      ok: false,
      error: {
        code: 'NOT_ALLOWED',
        message: '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
      },
    });
  });
});
