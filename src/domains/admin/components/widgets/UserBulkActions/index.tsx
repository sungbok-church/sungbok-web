'use client';

import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { setUsersActive } from '@/domains/admin/api/actions/userActions';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { useSelectedIds } from '@/domains/admin/components/features/AdminList/AdminTable';
import { Button } from '@/shared/components/ui/button';

/** 사용자 목록의 일괄 처리 — 고른 사용자 끄기 · 켜기. */
export const UserBulkActions = () => {
  const { ids, clear } = useSelectedIds();
  const action = useAdminAction();
  const setActive = (active: boolean) =>
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
        disabled={action.pending}
        onClick={() => action.run(() => setActive(true))}
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
        onConfirm={() => setActive(false)}
      />
    </>
  );
};
