import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PREFILL_DELAY_MS, PREFILL_STORAGE_KEY } from '@/domains/admin/lib/screenPrefill';
import { ADMIN_WARM_HEADER } from '@/shared/lib/adminWarmup';

import { ScreenPrefill } from './index';

const fetchMock = vi.fn(async () => new Response('x'));
const PATHS = ['/admin', '/admin/codes', '/admin/categories'];

// 기다린 뒤 차례로 받는 것까지 끝낸다(가짜 시계 + 요청마다 마이크로태스크)
const runAll = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PREFILL_DELAY_MS);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  window.localStorage.clear();
});

describe('ScreenPrefill — 배포마다 한 번 메뉴 화면들을 받아 둔다', () => {
  it('잠시 뒤 메뉴 화면들을 차례로 화면 데이터(RSC)로, 깨우기 표시를 달아 받는다', async () => {
    render(<ScreenPrefill deployId="dpl_1" paths={PATHS} />);
    expect(fetchMock).not.toHaveBeenCalled();
    await runAll();
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(c => c[0])).toEqual(PATHS);
    expect(calls[0][1].headers).toEqual({ [ADMIN_WARM_HEADER]: '1', RSC: '1' });
    expect(window.localStorage.getItem(PREFILL_STORAGE_KEY)).toBe('dpl_1');
  });

  it('이 배포에서 이미 받았으면 받지 않고, 배포가 바뀌면 다시 받는다', async () => {
    window.localStorage.setItem(PREFILL_STORAGE_KEY, 'dpl_1');
    const { unmount } = render(<ScreenPrefill deployId="dpl_1" paths={PATHS} />);
    await runAll();
    expect(fetchMock).not.toHaveBeenCalled();
    unmount();
    render(<ScreenPrefill deployId="dpl_2" paths={PATHS} />);
    await runAll();
    expect(fetchMock).toHaveBeenCalledTimes(PATHS.length);
  });

  it('배포 표시가 없으면(로컬 개발) 받지 않는다', async () => {
    render(<ScreenPrefill deployId="" paths={PATHS} />);
    await runAll();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('하나라도 그려지지 않으면(로그인이 끊김) 나머지는 받지 않는다', async () => {
    // 넘겨 보내기를 따라가지 않으면 그려지지 않은 응답(ok 아님)이 온다
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 404 }));
    render(<ScreenPrefill deployId="dpl_1" paths={PATHS} />);
    await runAll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('다시 그려 새 목록이 와도(저장 뒤 새로 고침) 받던 것을 멈추지 않는다', async () => {
    const { rerender } = render(<ScreenPrefill deployId="dpl_1" paths={PATHS} />);
    rerender(<ScreenPrefill deployId="dpl_1" paths={[...PATHS]} />);
    await runAll();
    expect(fetchMock).toHaveBeenCalledTimes(PATHS.length);
  });

  it('시작 전에 관리자 틀이 사라지면(로그아웃) 받지 않는다', async () => {
    const { unmount } = render(<ScreenPrefill deployId="dpl_1" paths={PATHS} />);
    unmount();
    await runAll();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
