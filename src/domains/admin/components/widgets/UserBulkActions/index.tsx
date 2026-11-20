'use client';

import { notifyResult } from '@/domains/admin/api/notify';
import { setUsersActive } from '@/domains/admin/api/userActions';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { useSelectedIds } from '@/domains/admin/components/features/AdminList/AdminTable';
import { Button } from '@/shared/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** 사용자 목록의 일괄 처리 — 고른 사용자 끄기 · 켜기. */
export const UserBulkActions = () => {
  const { ids, clear } = useSelectedIds();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (active: boolean) =>
    setUsersActive({ ids, active }).then(result => {
      if (result.ok) {
        clear();
        router.refresh();
      }
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
