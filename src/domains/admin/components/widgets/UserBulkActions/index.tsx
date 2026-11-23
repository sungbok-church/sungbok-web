'use client';

import { notifyResult } from '@/domains/admin/api/notify';
import { setUsersActive } from '@/domains/admin/api/userActions';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { useSelectedIds } from '@/domains/admin/components/features/AdminList/AdminTable';
import { Button } from '@/shared/components/ui/button';
import { useTransition } from 'react';

/** 사용자 목록의 일괄 처리 — 고른 사용자 끄기 · 켜기. */
export const UserBulkActions = () => {
  const { ids, clear } = useSelectedIds();
  const [pending, startTransition] = useTransition();
  const run = (active: boolean) =>
    setUsersActive({ ids, active }).then(result => {
      // 화면은 Server Action 이 다시 그려 보낸다(revalidatePath) — router.refresh 를 또 부르지 않는다
      if (result.ok) clear();
      return result;
    });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            notifyResult(await run(true));
          })
        }
      >
        켜기
      </Button>
      <ConfirmAction
        kind="deactivate"
        trigger={
          <Button size="sm" variant="outline">
            끄기
          </Button>
        }
        onConfirm={() => run(false)}
      />
    </>
  );
};
