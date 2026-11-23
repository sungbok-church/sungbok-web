'use client';

// 비밀번호 칸의 Caps Lock 안내 — 키를 누를 때마다 getModifierState 로 읽고, 칸을 떠나면 거둔다.
// 칸마다 하나씩 쓴다(두 칸이 한 상태를 나누면 쓰지 않는 칸에도 안내가 뜬다).
import { type KeyboardEvent, useCallback, useState } from 'react';

export const useCapsLock = () => {
  const [capsLock, setCapsLock] = useState(false);
  /** 칸의 onKeyDown · onKeyUp 에 단다 */
  const onKey = useCallback((e: KeyboardEvent) => {
    if (typeof e.getModifierState !== 'function') return;
    setCapsLock(e.getModifierState('CapsLock'));
  }, []);
  /** 칸의 onBlur 에 단다 */
  const reset = useCallback(() => setCapsLock(false), []);
  return { capsLock, onKey, reset };
};
