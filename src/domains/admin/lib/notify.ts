// Server Action 결과를 토스트로 알린다(설계 6.10 «알림 · 확인»). 관리자 화면(클라이언트)에서만 쓴다.
import { toast } from '@/shared/components/ui/toast';

import type { ActionResult } from './actionResult';

export type ToastButton = { label: string; onClick: () => void };

export const notifyResult = (result: ActionResult<unknown>, button?: ToastButton) => {
  toast.add({
    type: result.ok ? 'success' : 'error',
    title: result.ok ? (result.message ?? '저장했습니다.') : result.error.message,
    ...(button && { actionProps: { children: button.label, onClick: button.onClick } }),
  });
};
