import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useCapsLock } from './useCapsLock';

// 키 이벤트 흉내 — 훅은 getModifierState('CapsLock') 만 본다
const key = (capsLock: boolean) =>
  ({ getModifierState: (k: string) => k === 'CapsLock' && capsLock }) as unknown as KeyboardEvent;

describe('useCapsLock', () => {
  it('처음에는 꺼져 있다고 본다(키를 누르기 전에는 알 수 없다)', () => {
    const { result } = renderHook(() => useCapsLock());
    expect(result.current.capsLock).toBe(false);
  });

  it('키를 누를 때 Caps Lock 상태를 읽는다 — 켜면 true, 끄면 false', () => {
    const { result } = renderHook(() => useCapsLock());
    act(() => result.current.onKey(key(true)));
    expect(result.current.capsLock).toBe(true);
    act(() => result.current.onKey(key(false)));
    expect(result.current.capsLock).toBe(false);
  });

  it('칸을 떠나면 안내를 거둔다(다른 칸에서 다시 읽는다)', () => {
    const { result } = renderHook(() => useCapsLock());
    act(() => result.current.onKey(key(true)));
    act(() => result.current.reset());
    expect(result.current.capsLock).toBe(false);
  });

  it('getModifierState 가 없는 이벤트(자동 완성 등)는 무시한다', () => {
    const { result } = renderHook(() => useCapsLock());
    act(() => result.current.onKey(key(true)));
    act(() => result.current.onKey({} as unknown as KeyboardEvent));
    expect(result.current.capsLock).toBe(true);
  });
});
