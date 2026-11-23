'use client';

import { updateGroup } from '@/domains/admin/api/groupActions';
import { notifyResult } from '@/domains/admin/api/notify';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { Button } from '@/shared/components/ui/button';
import { PowerIcon } from 'lucide-react';
import { useTransition } from 'react';

interface Props {
  group: { id: string; name: string; description: string; isActive: boolean; updatedAt: string };
}

/** 그룹 상세 머리의 [끄기 / 켜기] — 그룹의 «삭제» 는 끄기다(설계 6.4). 시스템 그룹에는 그리지 않는다. */
export const GroupDetailActions = ({ group }: Props) => {
  const [pending, startTransition] = useTransition();
  const toggle = (isActive: boolean) =>
    updateGroup({
      id: group.id,
      updatedAt: group.updatedAt,
      name: group.name,
      description: group.description,
      isActive,
    });

  if (group.isActive) {
    return (
      <ConfirmAction
        kind="deactivate"
        trigger={
          <Button variant="outline">
            <PowerIcon data-icon="inline-start" />
            끄기
          </Button>
        }
        // 화면은 Server Action 이 다시 그려 보낸다(revalidatePath)
        onConfirm={() => toggle(false)}
      />
    );
  }
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          notifyResult(await toggle(true));
        })
      }
    >
      <PowerIcon data-icon="inline-start" />
      켜기
    </Button>
  );
};
