'use client';

import { useEffect, useState } from 'react';

/**
 * 서버가 약속(Promise)으로 넘긴 값 — 오기 전에는 null, 오면 그 값(ADR 0027). 등록 화면은 폼을 미리 만든 틀에 그려 누르는 즉시
 * 쓰게 하고, 사용자 · 선택지처럼 서버에서 받을 것은 이것으로 오는 대로 같은 폼에 채운다.
 * <Suspense> 로 폼을 통째로 바꿔 끼우지 않으려고 쓴다 — React 는 자리 표시를 한 번 보이면 0.3초는 두고 바꿔 그동안 쓸 수 없었다.
 * 화면을 다시 읽으면(router.refresh) 새 약속이 온다 — 그것이 올 때까지는 받아 둔 값을 쓰고, 늦게 온 옛 약속은 버린다.
 * 받지 못하면 그 오류를 던진다 — 폼이 영원히 기다리지 않게. 권한이 없으면(받는 쪽이 requirePermission 으로 «없음») 관리자의
 * «없음» 화면이, DB 오류면 Next 의 오류 화면이 보인다(관리자에 error.tsx 는 아직 없다 — 예전에 서버에서 기다리던 때와 같다).
 */
export const useArrived = <T>(promise: Promise<T>): T | null => {
  const [value, setValue] = useState<T | null>(null);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  useEffect(() => {
    let live = true;
    promise.then(
      v => {
        if (live) setValue(v);
      },
      error => {
        if (live) setFailure({ error });
      }
    );
    return () => {
      live = false;
    };
  }, [promise]);
  if (failure) throw failure.error;
  return value;
};
