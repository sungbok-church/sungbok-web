import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { purgeRow, setTrashed } from './contentState.server';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';
let calls: unknown[][] = [];
const result = vi.fn();
const chain = () => {
  const c: Record<string, unknown> = {};
  for (const k of ['eq', 'is', 'not']) c[k] = (...a: unknown[]) => (calls.push([k, ...a]), c);
  c.select = () => c;
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
  return c;
};
const client = {
  from: (table: string) => ({
    update: (patch: unknown) => (calls.push(['update', table, patch]), chain()),
    delete: () => (calls.push(['delete', table]), chain()),
  }),
} as never;

beforeEach(() => {
  calls = [];
  result.mockReturnValue({ data: [{ id: ID }], error: null });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T03:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('setTrashed', () => {
  it('휴지통 — 휴지통에 없는 것만, 지금 시각으로 · 범위 조건(feed 등)을 함께 건다', async () => {
    expect(
      await setTrashed(client, 'news_videos', ID, true, { feed: 'GARDEN' }, '복구 문장')
    ).toEqual({ ok: true, message: '휴지통으로 보냈습니다.' });
    expect(calls).toEqual([
      ['update', 'news_videos', { deleted_at: '2026-11-24T03:00:00.000Z' }],
      ['eq', 'id', ID],
      ['eq', 'feed', 'GARDEN'],
      ['is', 'deleted_at', null],
    ]);
  });

  it('복구 — 휴지통에 든 것만, 같은 값이 이미 있으면(23505) 그 뜻으로', async () => {
    expect(await setTrashed(client, 'bulletins', ID, false, {}, '복구할 수 없습니다.')).toEqual({
      ok: true,
      message: '복구했습니다.',
    });
    expect(calls).toContainEqual(['not', 'deleted_at', 'is', null]);
    result.mockReturnValue({ data: null, error: { code: '23505', message: 'dup' } });
    expect(
      await setTrashed(client, 'bulletins', ID, false, {}, '복구할 수 없습니다.')
    ).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE', message: '복구할 수 없습니다.' },
    });
  });

  it('바뀐 줄이 없으면 NOT_FOUND(그사이 누가 먼저 했거나 다른 메뉴의 글)', async () => {
    result.mockReturnValue({ data: [], error: null });
    expect(await setTrashed(client, 'bulletins', ID, true, {}, '')).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});

describe('purgeRow', () => {
  it('휴지통에 든 것만 완전히 지운다', async () => {
    expect(await purgeRow(client, 'news_videos', ID, { feed: 'ANNOUNCEMENTS' })).toEqual({
      ok: true,
      message: '완전히 지웠습니다.',
    });
    expect(calls).toEqual([
      ['delete', 'news_videos'],
      ['eq', 'id', ID],
      ['eq', 'feed', 'ANNOUNCEMENTS'],
      ['not', 'deleted_at', 'is', null],
    ]);
    result.mockReturnValue({ data: [], error: null });
    expect(await purgeRow(client, 'news_videos', ID, {})).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
