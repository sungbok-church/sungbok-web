'use client';

import {
  ADMIN_SCREENS_READY,
  ADMIN_WARM_LIMIT,
  ADMIN_WARM_ORDER,
} from '@/shared/config/adminScreens';
import {
  ADMIN_WARM_HEADER,
  ADMIN_WARM_PATH,
  ADMIN_WARM_STORAGE_KEY,
  adminWarmPaths,
  hasAdminSessionCookie,
  shouldWarmAdmin,
} from '@/shared/lib/adminWarmup';
import { useEffect } from 'react';

/**
 * 관리자로 로그인했던 브라우저면 관리자 서버를 미리 깨운다(lib/adminWarmup) — 그리는 것은 없다.
 * 첫 화면을 그려 두고, 이어서 자주 쓰는 화면들(config/adminScreens 의 순서 · 개수)을 하나씩 불러 둔다 — 화면마다 서버 코드를
 * 처음 부르는 시간을 미리 치른다. 하나씩 차례로 부른다(한꺼번에 부르면 서버가 새로 켜질 수 있다 — 같은 서버를 데워야 한다).
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
    // 깨우기 표시를 달고, 넘겨 보내기는 따라가지 않는다 — 이유는 lib/adminWarmup 머리 주석.
    // keepalive: 응답에 실려 오는 새 로그인 토큰(쉬던 사이 만료돼 proxy 가 갱신한 것)을 페이지를 떠나도 받게 —
    // 놓치면 옛 토큰을 다시 쓰다가 Supabase 가 재사용으로 보고 세션을 끊는다. 받은 화면은 끝까지 받아 버린다.
    const warm = (path: string, extra: Record<string, string> = {}) =>
      fetch(path, {
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        keepalive: true,
        headers: { [ADMIN_WARM_HEADER]: '1', ...extra },
      }).then(async res => {
        await res.arrayBuffer();
        return res.ok;
      });
    void (async () => {
      try {
        // 첫 화면은 주소줄로 열 때처럼 문서로, 나머지는 메뉴를 눌러 옮길 때처럼 화면 데이터(RSC)로.
        // 첫 화면이 그려지지 않으면(로그인이 끊김 · 8시간 지남 · 꺼진 계정 · 비밀번호를 바꿔야 함 — 넘겨 보내기는 status 0)
        // 나머지도 그려지지 않으니 부르지 않는다
        if (!(await warm(ADMIN_WARM_PATH))) return;
        for (const path of adminWarmPaths(ADMIN_SCREENS_READY, ADMIN_WARM_ORDER, ADMIN_WARM_LIMIT))
          await warm(path, { RSC: '1' });
      } catch {
        // 깨우지 못하면 원래대로 첫 요청이 조금 느릴 뿐이다
      }
    })();
  }, []);
  return null;
};
