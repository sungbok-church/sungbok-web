'use client';

import { notifyResult } from '@/domains/admin/api/notify';
import { resetPassword, setUsersActive } from '@/domains/admin/api/userActions';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { TempPasswordDialog } from '@/domains/admin/components/features/TempPasswordDialog';
import { Button } from '@/shared/components/ui/button';
import { KeyRoundIcon, PowerIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Props {
  userId: string;
  email: string;
  isActive: boolean;
  /** 비밀번호 초기화 · 끄기를 할 수 있는가(can_manage_user) */
  canManage: boolean;
}

/** 사용자 상세 머리의 [비밀번호 초기화] · [끄기 / 켜기]. 초기화하면 새 임시 비밀번호를 한 번 보여 준다. */
export const UserDetailActions = ({ userId, email, isActive, canManage }: Props) => {
  const router = useRouter();
  const [temp, setTemp] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!canManage) return null;

  return (
    <>
      <ConfirmAction
        kind="reset"
        trigger={
          <Button variant="outline">
            <KeyRoundIcon data-icon="inline-start" />
            비밀번호 초기화
          </Button>
        }
        onConfirm={async () => {
          const result = await resetPassword(userId);
          if (result.ok && result.data) setTemp(result.data.tempPassword);
          return result;
        }}
      />
      {isActive ? (
        <ConfirmAction
          kind="deactivate"
          trigger={
            <Button variant="outline">
              <PowerIcon data-icon="inline-start" />
              끄기
            </Button>
          }
          onConfirm={async () => {
            const result = await setUsersActive({ ids: [userId], active: false });
            if (result.ok) router.refresh();
            return result;
          }}
        />
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setUsersActive({ ids: [userId], active: true });
              notifyResult(result);
              if (result.ok) router.refresh();
            })
          }
        >
          <PowerIcon data-icon="inline-start" />
          켜기
        </Button>
      )}
      <TempPasswordDialog password={temp} email={email} onClose={() => setTemp(null)} />
    </>
  );
};
