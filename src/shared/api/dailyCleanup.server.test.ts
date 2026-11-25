import { describe, expect, it, vi } from 'vitest';

import { runDailyCleanup } from './dailyCleanup.server';

vi.mock('server-only', () => ({}));

const fakeDb = ({
  purge = { data: { bulletins: 1, file_lists: 2 }, error: null as null | { message: string } },
  orphans = [] as string[],
  removeError = null as null | { message: string },
} = {}) => {
  const removed: string[][] = [];
  const rpc = vi.fn(async (name: string) =>
    name === 'purge_expired' ? purge : { data: orphans, error: null }
  );
  const db = {
    rpc,
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          expect(bucket).toBe('media');
          removed.push(paths);
          return { data: [], error: removeError };
        },
      }),
    },
  };
  return { db, rpc, removed };
};

describe('runDailyCleanup', () => {
  it('지난 행을 지우고(purge_expired) → 주인 없는 Storage 파일을 100개씩 지운다', async () => {
    const orphans = Array.from({ length: 230 }, (_, i) => `x/${i}.webp`);
    const { db, rpc, removed } = fakeDb({ orphans });
    const result = await runDailyCleanup(db as never);
    expect(rpc.mock.calls.map(c => c[0])).toEqual(['purge_expired', 'orphan_storage_objects']);
    expect(rpc).toHaveBeenCalledWith('orphan_storage_objects', { p_limit: 1000 });
    expect(removed.map(r => r.length)).toEqual([100, 100, 30]);
    expect(result).toEqual({ ok: true, rows: { bulletins: 1, file_lists: 2 }, files: 230 });
  });

  it('행 지우기가 실패하면 파일은 건드리지 않는다(어느 줄이 남았는지 모르는 채 지우지 않게)', async () => {
    const { db, rpc, removed } = fakeDb({
      purge: { data: null as never, error: { message: 'down' } },
    });
    expect(await runDailyCleanup(db as never)).toEqual({ ok: false, error: 'down' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([]);
  });

  it('파일 지우기가 실패하면 실패로 알린다(지운 행은 그대로 — 남은 파일은 다음 날 다시)', async () => {
    const { db } = fakeDb({ orphans: ['a.webp'], removeError: { message: 'storage down' } });
    expect(await runDailyCleanup(db as never)).toEqual({ ok: false, error: 'storage down' });
  });
});
