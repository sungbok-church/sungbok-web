import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAdminAction } from './useAdminAction';

const notifyResult = vi.hoisted(() => vi.fn());
vi.mock('../lib/notify', () => ({ notifyResult }));

afterEach(() => vi.clearAllMocks());

const OK = { ok: true as const, message: '저장했습니다.' };
const NO = {
  ok: false as const,
  error: { code: 'CONFLICT' as const, message: '먼저 고쳤습니다.' },
};

describe('useAdminAction — Server Action 을 부르고 결과를 토스트로 알린다', () => {
  it('결과를 알리고, 뒤처리(after)에 결과를 넘긴다', async () => {
    const after = vi.fn();
    const { result } = renderHook(() => useAdminAction());
    await act(async () => result.current.run(async () => OK, after));
    expect(notifyResult).toHaveBeenCalledWith(OK);
    expect(after).toHaveBeenCalledWith(OK);
  });

  it('성공일 때만 토스트에 버튼(되돌리기)을 단다', async () => {
    const undo = { label: '되돌리기', onClick: vi.fn() };
    const { result } = renderHook(() => useAdminAction());
    await act(async () => result.current.run(async () => OK, undefined, undo));
    await act(async () => result.current.run(async () => NO, undefined, undo));
    expect(notifyResult).toHaveBeenNthCalledWith(1, OK, undo);
    expect(notifyResult).toHaveBeenNthCalledWith(2, NO);
  });

  it('기다리는 동안 pending', async () => {
    let finish: (v: typeof OK) => void = () => {};
    const { result } = renderHook(() => useAdminAction());
    expect(result.current.pending).toBe(false);
    act(() => result.current.run(() => new Promise<typeof OK>(resolve => (finish = resolve))));
    expect(result.current.pending).toBe(true);
    await act(async () => finish(OK));
    expect(result.current.pending).toBe(false);
  });
});
