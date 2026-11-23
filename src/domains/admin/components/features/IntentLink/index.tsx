'use client';

import Link from 'next/link';
import { type ComponentProps, useState } from 'react';

/**
 * 마우스를 올리거나(손가락이 닿거나 · 키보드로 옮겨 오면) 그때 미리 받는 링크 — Next 공식 «hover-triggered prefetch» 방식
 * (Partial Prefetching 이면 의도 전 false · 의도 뒤 'auto').
 * 왼쪽 메뉴처럼 늘 보이는 링크가 기본 방식(보이면 미리 받기)이면, 무엇을 저장할 때마다 미리 받은 화면이 모두 다시 받아진다
 * («Invalidations refresh prefetches» — 메뉴 링크 6개 × 2 = 저장 한 번에 13건). 이 링크는 올려 본 것만 받고, 다시 받는다.
 */
export const IntentLink = ({
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) => {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? 'auto' : false}
      onMouseEnter={e => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={e => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      onFocus={e => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
};
