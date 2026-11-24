import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useContentSearch } from './useContentSearch';

const hit = (title: string) => ({
  menu: 'album',
  id: title,
  title,
  detail: '',
  href: `/admin/album/${title}`,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useContentSearch', () => {
  it('칠 때마다 250ms 기다렸다가 마지막 검색어로만 묻는다', async () => {
    const search = vi.fn(async (raw: unknown) => ({
      ok: true as const,
      data: { items: [hit((raw as { q: string }).q)] },
    }));
    const { result, rerender } = renderHook(({ q }) => useContentSearch(q, search), {
      initialProps: { q: '주' },
    });
    rerender({ q: '주일' });
    rerender({ q: '주일광' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({ q: '주일광' });
    expect(result.current.items.map(i => i.title)).toEqual(['주일광']);
  });

  it('늦게 온 옛 답은 버린다', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    const search = vi
      .fn()
      .mockImplementationOnce(() => new Promise(r => (resolveFirst = r)))
      .mockImplementationOnce(async () => ({ ok: true, data: { items: [hit('새')] } }));
    const { result, rerender } = renderHook(({ q }) => useContentSearch(q, search), {
      initialProps: { q: '옛날' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    rerender({ q: '새것' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    await act(async () => {
      resolveFirst({ ok: true, data: { items: [hit('옛')] } });
    });
    expect(result.current.items.map(i => i.title)).toEqual(['새']);
  });

  it('다른 검색어의 답은 보여 주지 않고, 새 답을 기다리는 동안은 pending', async () => {
    const search = vi
      .fn()
      .mockImplementationOnce(async () => ({ ok: true, data: { items: [hit('설교')] } }))
      .mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ q }) => useContentSearch(q, search), {
      initialProps: { q: '설교' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current.items.map(i => i.title)).toEqual(['설교']);
    rerender({ q: '' }); // 창을 닫았다
    rerender({ q: '주보' }); // 다시 열어 쳤다
    expect(result.current).toEqual({ items: [], pending: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current).toEqual({ items: [], pending: true });
  });

  it('서버 호출이 던져도 빈 결과로 끝낸다(기다림이 남지 않게)', async () => {
    const search = vi.fn(async () => {
      throw new Error('network');
    });
    const { result } = renderHook(() => useContentSearch('주일', search));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current).toEqual({ items: [], pending: false });
  });

  it('2자 미만이면 묻지 않고 비운다', async () => {
    const search = vi.fn();
    const { result } = renderHook(() => useContentSearch('a', search));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(search).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });
});
