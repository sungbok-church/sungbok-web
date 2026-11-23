'use client';

import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { resetPassword, setUsersActive } from '@/domains/admin/api/actions/userActions';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { TempPasswordDialog } from '@/domains/admin/components/features/TempPasswordDialog';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { EllipsisIcon, HistoryIcon, KeyRoundIcon, PowerIcon } from 'lucide-react';
import { useState } from 'react';

interface Props {
  userId: string;
  email: string;
  /** 변경 이력 창 제목에 쓰는 이름 */
  name: string;
  isActive: boolean;
  /** 비밀번호 초기화 · 끄기를 할 수 있는가(can_manage_user) */
  canManage: boolean;
  /** 변경 이력을 볼 수 있는가(사용자 메뉴의 «변경 이력 보기» 권한) */
  canHistory: boolean;
}

/**
 * 사용자 상세 머리의 «더 보기» 메뉴 — [비밀번호 초기화] · [끄기 / 켜기] · [변경 이력].
 * 자주 쓰지 않는 동작이라 버튼을 늘어놓지 않고 메뉴 하나로 접는다(머리에는 [목록] · 이전/다음 · [수정] 만).
 * 확인 창 · 이력 창은 메뉴 밖에 둔다 — 메뉴는 고르면 닫히며 사라진다. 초기화하면 새 임시 비밀번호를 한 번 보여 준다.
 */
export const UserDetailActions = ({
  userId,
  email,
  name,
  isActive,
  canManage,
  canHistory,
}: Props) => {
  const [dialog, setDialog] = useState<'reset' | 'deactivate' | 'history' | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const { pending, run } = useAdminAction();
  if (!canManage && !canHistory) return null;

  const openChange = (which: typeof dialog) => (open: boolean) => setDialog(open ? which : null);
  const turnOn = () => run(() => setUsersActive({ ids: [userId], active: true }));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="더 보기" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          {canManage && (
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setDialog('reset')}>
                <KeyRoundIcon aria-hidden />
                비밀번호 초기화
              </DropdownMenuItem>
              {isActive ? (
                <DropdownMenuItem onClick={() => setDialog('deactivate')}>
                  <PowerIcon aria-hidden />
                  끄기
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={pending} onClick={turnOn}>
                  <PowerIcon aria-hidden />
                  켜기
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          )}
          {canManage && canHistory && <DropdownMenuSeparator />}
          {canHistory && (
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setDialog('history')}>
                <HistoryIcon aria-hidden />
                변경 이력
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <ConfirmAction
          kind="reset"
          open={dialog === 'reset'}
          onOpenChange={openChange('reset')}
          onConfirm={async () => {
            const result = await resetPassword(userId);
            if (result.ok && result.data) setTemp(result.data.tempPassword);
            return result;
          }}
        />
      )}
      {canManage && isActive && (
        <ConfirmAction
          kind="deactivate"
          open={dialog === 'deactivate'}
          onOpenChange={openChange('deactivate')}
          // 화면은 Server Action 이 다시 그려 보낸다(revalidatePath)
          onConfirm={() => setUsersActive({ ids: [userId], active: false })}
        />
      )}
      {canHistory && (
        <HistorySheet
          table="profiles"
          rowId={userId}
          subject={name}
          open={dialog === 'history'}
          onOpenChange={openChange('history')}
        />
      )}
      <TempPasswordDialog password={temp} email={email} onClose={() => setTemp(null)} />
    </>
  );
};
