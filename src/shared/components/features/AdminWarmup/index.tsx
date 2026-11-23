'use client';

import {
  ADMIN_WARM_PATH,
  ADMIN_WARM_STORAGE_KEY,
  hasAdminSessionCookie,
  shouldWarmAdmin,
} from '@/shared/lib/adminWarmup';
import { useEffect } from 'react';

/**
 * 관리자로 로그인했던 브라우저면 관리자 서버를 미리 깨운다(lib/adminWarmup) — 그리는 것은 없다.
 * 관리자 로그인 쿠키가 없는 방문자(대부분)는 아무 요청도 하지 않는다. 깨운 지 몇 분 안이면 다시 부르지 않는다.
 * 실패해도 조용히 넘어간다 — 깨우지 못하면 원래대로 첫 요청이 조금 느릴 뿐이다.
 */
export const AdminWarmup = () => {
  useEffect(() => {
    if (!hasAdminSessionCookie(document.cookie)) return;
    const now = Date.now();
    let lastAt: number | null = null;
    try {
      const saved = window.localStorage.getItem(ADMIN_WARM_STORAGE_KEY);
      lastAt = saved === null ? null : Number(saved);
    } catch {
      // 저장소를 못 쓰는 브라우저(사생활 보호 창 등) — 매번 부른다
    }
    if (!shouldWarmAdmin(lastAt, now)) return;
    try {
      window.localStorage.setItem(ADMIN_WARM_STORAGE_KEY, String(now));
    } catch {
      // 위와 같다
    }
    // 쿠키를 싣지 않는다 — 이유는 lib/adminWarmup 머리 주석
    // 깨우기만 하면 되니 받은 화면은 읽지 않고 버린다
    fetch(ADMIN_WARM_PATH, { cache: 'no-store', credentials: 'omit' })
      .then(res => res.body?.cancel())
      .catch(() => {});
  }, []);
  return null;
};
