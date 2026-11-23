import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NAVIGATION_START } from '../lib/navigationProgress';
import { useAdminNavigate } from './useAdminNavigate';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

afterEach(() => vi.clearAllMocks());

describe('useAdminNavigate — router.push 로 옮길 때 진행 표시줄도 켠다', () => {
  it('다른 화면이면 표시줄 신호를 보내고 옮긴다', () => {
    const heard = vi.fn();
    window.addEventListener(NAVIGATION_START, heard);
    const { result } = renderHook(() => useAdminNavigate());
    result.current('/admin/groups');
    expect(heard).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/admin/groups');
    window.removeEventListener(NAVIGATION_START, heard);
  });

  it('지금 화면 그대로면 신호 없이 옮기기만 한다 — 표시줄이 끝나지 않고 남지 않게', () => {
    const heard = vi.fn();
    window.addEventListener(NAVIGATION_START, heard);
    const { result } = renderHook(() => useAdminNavigate());
    result.current(window.location.pathname + window.location.search);
    expect(heard).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    window.removeEventListener(NAVIGATION_START, heard);
  });
});
