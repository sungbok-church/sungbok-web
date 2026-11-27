import { act, renderHook } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useArrived } from './useArrived';

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useArrived — 서버가 약속으로 넘긴 값이 오면 그 값, 오기 전에는 null', () => {
  it('오기 전에는 null, 오면 그 값', async () => {
    const d = deferred<number>();
    const { result } = renderHook(() => useArrived(d.promise));
    expect(result.current).toBeNull();
    await act(async () => d.resolve(7));
    expect(result.current).toBe(7);
  });

  it('새 약속이 와도(화면을 다시 읽음) 그것이 올 때까지는 받아 둔 값을 쓴다', async () => {
    const first = deferred<string>();
    const { result, rerender } = renderHook(({ p }) => useArrived(p), {
      initialProps: { p: first.promise },
    });
    await act(async () => first.resolve('옛 값'));
    const second = deferred<string>();
    rerender({ p: second.promise });
    expect(result.current).toBe('옛 값');
    await act(async () => second.resolve('새 값'));
    expect(result.current).toBe('새 값');
  });

  it('늦게 온 옛 약속은 버린다', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const { result, rerender } = renderHook(({ p }) => useArrived(p), {
      initialProps: { p: first.promise },
    });
    rerender({ p: second.promise });
    await act(async () => second.resolve('새 값'));
    await act(async () => first.resolve('옛 값'));
    expect(result.current).toBe('새 값');
  });

  it('받지 못하면(DB 오류 등) 그 오류를 던진다 — 폼이 영원히 기다리지 않고 화면 오류로 보인다', async () => {
    const d = deferred<number>();
    let caught: unknown = null;
    class Catch extends Component<{ children: ReactNode }> {
      static getDerivedStateFromError() {
        return {};
      }
      componentDidCatch(e: unknown) {
        caught = e;
      }
      render() {
        return caught ? null : this.props.children;
      }
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useArrived(d.promise), { wrapper: Catch });
    const boom = new Error('읽지 못함');
    await act(async () => d.reject(boom));
    expect(caught).toBe(boom);
    spy.mockRestore();
  });
});
