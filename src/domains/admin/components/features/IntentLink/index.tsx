'use client';

import Link from 'next/link';
import { type ComponentProps, useState } from 'react';

/**
 * 마우스를 올리거나(손가락이 닿거나 · 키보드로 옮겨 오면) 그때 미리 받는 링크 — Next 공식 «hover-triggered prefetch» 방식
 * (Partial Prefetching 이면 의도 전 false · 의도 뒤 'auto').
 * 관리자 화면의 링크는 모두 이것을 쓴다(next/link 직접 사용은 lint 가 막는다 — 로그인 전 화면만 예외. 서버에 묻지 않고 화면 안에서
 * 바로 바꾸는 링크(GroupNav, data-in-place)는 미리 받을 것이 없어 보통 링크다). 기본 방식(보이면 미리 받기)이면
 * 첫 화면 카드 · 목록 줄마다 서버 요청이 나가고(운영 실측 첫 화면 12건), 무엇을 저장할 때마다 그것들이 모두 다시 받아진다
 * («Invalidations refresh prefetches» — 메뉴 링크 6개 × 2 = 저장 한 번에 13건). 이 링크는 올려 본 것만 받고, 다시 받는다.
 * 모든 링크를 보이면 받게 하면 Vercel 방화벽의 /admin 요청 제한(한 IP 60초 100건)에 걸린다(2026-11-28 — ADR 0027 3번).
 * eager: 보이면 바로 받는다 — 등록 화면으로 가는 단추(목록 머리의 «새 ○○» · 첫 화면의 할 일)만. 등록 화면은 폼을 미리 만든 틀에
 * 그리므로(ADR 0027) 틀을 받아 두면 누르는 즉시 쓴다. 화면마다 한두 건이라 한도에 닿지 않는다.
 */
export const IntentLink = ({
  eager = false,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'> & { eager?: boolean }) => {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={eager || intent ? 'auto' : false}
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
