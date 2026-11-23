'use client';

// router.push 로 화면을 옮기는 곳(목록 줄 · 검색 · 쪽당 개수 · 메뉴 찾기)이 쓴다 — 옮기기 전에 위쪽 진행 표시줄을 켠다.
// 링크(<Link>)는 표시줄이 클릭을 직접 알아채므로 이 훅이 필요 없다.
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { signalNavigationStart } from '../lib/navigationProgress';

export const useAdminNavigate = () => {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      signalNavigationStart(href);
      router.push(href);
    },
    [router]
  );
};
