'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * CSS 미디어 쿼리가 맞는지. 서버 HTML·하이드레이션 첫 렌더는 false, 그 뒤 실제 값이며 창 크기를 바꾸면 따라간다.
 * 모양은 되도록 CSS(반응형 클래스)로 가르고, 이 값은 CSS 로 표현할 수 없는 것(aria 상태·동작 분기)에만 쓴다 —
 * 첫 렌더가 false 라 모양을 이 값에 맡기면 휴대폰에서 한 번 깜빡인다.
 */
export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
};
