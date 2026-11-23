'use client';

// 관리자 화면(클라이언트)이 Server Action 을 부르는 한 가지 방법 — 기다리는 동안 pending, 끝나면 결과를 토스트로 알린다.
// 화면을 다시 그리는 것은 Server Action 이 한다(revalidatePath). 실패한 뒤 지금 값을 다시 읽는 등 뒤처리는 after 로.
import { useTransition } from 'react';

import type { ActionResult } from '../lib/actionResult';
import { notifyResult, type ToastButton } from '../lib/notify';

export const useAdminAction = () => {
  const [pending, startTransition] = useTransition();
  const run = <R extends ActionResult<unknown>>(
    job: () => Promise<R>,
    after?: (result: R) => void,
    /** 성공 토스트에 함께 다는 버튼(«되돌리기» 등) */
    button?: ToastButton
  ) =>
    startTransition(async () => {
      const result = await job();
      if (result.ok && button) notifyResult(result, button);
      else notifyResult(result);
      after?.(result);
    });
  return { pending, run };
};
