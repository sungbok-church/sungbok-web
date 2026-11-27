'use client';

import {
  PREFILL_DELAY_MS,
  PREFILL_STORAGE_KEY,
  shouldPrefill,
} from '@/domains/admin/lib/screenPrefill';
import { fetchAdminScreen } from '@/shared/lib/adminWarmup';
import { useEffect, useRef } from 'react';

/**
 * 배포마다 이 브라우저에서 한 번, 왼쪽 메뉴의 화면들 · 등록 · 상세 · 수정 화면(상세 · 수정은 없는 글의 주소로 — «없음» 으로
 * 그려져도 정보는 채워진다, prefillPaths)을 화면 데이터(RSC)로 받아 둔다 — 그리는 것은 없다(까닭은 lib/screenPrefill).
 * 화면을 열고 잠시 뒤(PREFILL_DELAY_MS)에 하나씩 차례로 받는다. 로그인이 끊겨 proxy 가 넘겨 보내면 멈추고, 한 화면이 열리지
 * 않으면(그룹 만들기는 전체 관리만 — 아니면 없는 화면) 건너뛰고 다음을 받는다.
 * 데이터 절약 모드 · 저장소를 못 쓰는 브라우저(열 때마다 다시 받게 되므로)에서는 받지 않는다. 실패해도 조용히 넘어간다.
 */
export const ScreenPrefill = ({ deployId, paths }: { deployId: string; paths: string[] }) => {
  // 저장 뒤 다시 그리기(router.refresh)마다 새 목록이 오므로 목록은 효과의 조건에 넣지 않는다 — 넣으면 받는 도중에 멈춘다
  const latest = useRef(paths);
  useEffect(() => {
    latest.current = paths;
  });

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;
    try {
      if (!shouldPrefill(window.localStorage.getItem(PREFILL_STORAGE_KEY), deployId)) return;
      // 시작할 때 적는다 — 탭을 여럿 열어도 한 번. 2초 안에 떠나면 이 배포는 이 브라우저에서 건너뛴다(조금 느릴 뿐이다)
      window.localStorage.setItem(PREFILL_STORAGE_KEY, deployId);
    } catch {
      return;
    }
    let stopped = false;
    const timer = setTimeout(() => {
      void (async () => {
        for (const path of latest.current) {
          if (stopped) return;
          try {
            if ((await fetchAdminScreen(path, { rsc: true })) === 'redirect') return;
          } catch {
            return;
          }
        }
      })();
    }, PREFILL_DELAY_MS);
    // 관리자 틀이 사라지면(로그아웃) 멈춘다
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [deployId]);

  return null;
};
