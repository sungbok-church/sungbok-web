'use client';

import { updateGroup } from '@/domains/admin/api/actions/groupActions';
import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { EllipsisIcon, HistoryIcon, PowerIcon } from 'lucide-react';
import { useState } from 'react';

interface Props {
  group: { id: string; name: string; description: string; isActive: boolean; updatedAt: string };
  /** 끄기 / 켜기를 할 수 있는가(시스템 그룹이 아니고 «전체 관리» 일 때 — 설계 6.4) */
  canToggle: boolean;
  /** 변경 이력을 볼 수 있는가(그룹 메뉴의 «변경 이력 보기» 권한) */
  canHistory: boolean;
}

/**
 * 그룹 상세 머리의 «더 보기» 메뉴 — [끄기 / 켜기] · [변경 이력]. 그룹의 «삭제» 는 끄기다(설계 6.4).
 * 끄고 켜기는 이 화면에서만 한다(수정 화면에는 없다 — 사용자와 같다). 시스템 그룹은 끌 수 없다.
 * 확인 창 · 이력 창은 메뉴 밖에 둔다 — 메뉴는 고르면 닫히며 사라진다.
 */
export const GroupDetailActions = ({ group, canToggle, canHistory }: Props) => {
  const [dialog, setDialog] = useState<'deactivate' | 'history' | null>(null);
  const { pending, run } = useAdminAction();
  if (!canToggle && !canHistory) return null;

  const openChange = (which: typeof dialog) => (open: boolean) => setDialog(open ? which : null);
  const toggle = (isActive: boolean) =>
    updateGroup({
      id: group.id,
      updatedAt: group.updatedAt,
      name: group.name,
      description: group.description,
      isActive,
    });
  const turnOn = () => run(() => toggle(true));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="더 보기" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          {canToggle && (
            <DropdownMenuGroup>
              {group.isActive ? (
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
          {canToggle && canHistory && <DropdownMenuSeparator />}
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

      {canToggle && group.isActive && (
        <ConfirmAction
          kind="deactivateGroup"
          open={dialog === 'deactivate'}
          onOpenChange={openChange('deactivate')}
          // 화면은 Server Action 이 다시 그려 보낸다(revalidatePath)
          onConfirm={() => toggle(false)}
        />
      )}
      {canHistory && (
        <HistorySheet
          table="groups"
          rowId={group.id}
          subject={group.name}
          open={dialog === 'history'}
          onOpenChange={openChange('history')}
        />
      )}
    </>
  );
};
