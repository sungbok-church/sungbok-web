'use client';

import {
  leadsToOtherScreen,
  NAVIGATION_START,
  type NavigationStartDetail,
} from '@/domains/admin/lib/navigationProgress';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { ScreenSkeleton } from '../ScreenSkeleton';

// 끝을 알 수 없는 이동(주소가 바뀌지 않는 리다이렉트 등)이어도 뼈대가 남지 않게 — 진행 표시줄과 같은 시간
const GIVE_UP_MS = 10_000;

/**
 * 다른 화면으로 가는 동안 본문 자리에 뼈대를 그린다 — 누르는 순간 브라우저가 바로(서버를 기다리지 않고).
 * 서버에서 받는 뼈대(loading.tsx)를 쓰지 않는 까닭(운영 실측 2026-11-24):
 *   · 처음 가는 화면은 그 뼈대부터 서버에서 받아야 떠서(앱 라우터는 브라우저에 화면 구조 지도가 없다) 0.17초쯤 늦게 뜨고,
 *   · React 는 Suspense 뼈대를 한 번 보이면 깜빡임을 막으려고 0.3초는 두고 바꾼다 — 서버가 0.2초 만에 답해도 0.3~0.5초를 기다렸다.
 *   이 뼈대는 Suspense 가 아니라 그 규칙이 없다 — 새 화면이 그려지면(경로가 바뀌면) 곧바로 거둔다.
 * 같은 화면의 조건만 바꾸는 이동(검색 · 쪽 · 정렬)은 뼈대 없이 지금 목록을 둔 채 새 목록이 오면 바꾼다(위쪽 진행 표시줄이 알린다).
 * 지금 화면은 지우지 않고 숨긴다 — 이동이 끝나지 않고 거둘 때 쓰던 상태 그대로 돌아오게.
 * 신호는 진행 표시줄(NavigationProgress — 링크 클릭)과 useAdminNavigate(router.push)가 낸다.
 */
export const PendingScreen = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  // 뼈대를 띄운 화면의 경로 — 경로가 바뀌면(새 화면이 그려지면) 거둔다. 그리는 중에 바로 맞춘다
  const [from, setFrom] = useState<string | null>(null);
  if (from !== null && pathname !== from) setFrom(null);

  useEffect(() => {
    const onStart = (e: Event) => {
      const href = (e as CustomEvent<NavigationStartDetail>).detail?.href;
      // 같은 화면으로 가는 이동(조건만 바꾸거나 지금 화면을 다시 고름)은 앞서 누른 이동을 대신한다 — 띄워 둔 뼈대를 거둔다
      setFrom(
        href && leadsToOtherScreen(href, window.location.href) ? window.location.pathname : null
      );
    };
    // 뒤로 · 앞으로 가기는 신호 없이 옮겨 간다 — 띄워 둔 뼈대를 거둔다
    const onPop = () => setFrom(null);
    window.addEventListener(NAVIGATION_START, onStart);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener(NAVIGATION_START, onStart);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const pending = from !== null;
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setFrom(null), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <>
      {pending && <ScreenSkeleton />}
      {/* contents: 숨기지 않을 때는 이 칸이 없는 것처럼(본문의 간격 · 배치 그대로) */}
      <div className="contents" hidden={pending}>
        {children}
      </div>
    </>
  );
};
