'use client';

import type { ActionResult } from '@/domains/admin/api/actionResult';
import { notifyResult, type ToastButton } from '@/domains/admin/api/notify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { type ReactElement, useState, useTransition } from 'react';

export type ConfirmKind = 'trash' | 'purge' | 'unpublish' | 'deactivate' | 'reset';

// 문구는 설계 6.10 «알림 · 확인» 에 고정돼 있다.
const COPY: Record<ConfirmKind, { title: string; body: string; action: string; danger: boolean }> =
  {
    trash: {
      title: '휴지통으로 보낼까요?',
      body: '30일 안에 복구할 수 있습니다.',
      action: '휴지통으로',
      danger: false,
    },
    purge: {
      title: '완전히 지울까요?',
      body: '되돌릴 수 없습니다.',
      action: '완전히 지우기',
      danger: true,
    },
    unpublish: {
      title: '임시저장으로 바꿀까요?',
      body: '사이트에서 사라집니다.',
      action: '임시저장으로',
      danger: false,
    },
    reset: {
      title: '비밀번호를 초기화할까요?',
      body: '지금 비밀번호로는 더 로그인할 수 없고, 새 임시 비밀번호를 전달해야 합니다.',
      action: '초기화',
      danger: false,
    },
    deactivate: {
      title: '끌까요?',
      body: '끄면 로그인 · 선택 목록에서 빠집니다. 다시 켤 수 있습니다.',
      action: '끄기',
      danger: false,
    },
  };

interface Props {
  kind: ConfirmKind;
  /** 창을 여는 버튼 — Base UI `render` 로 그린다 */
  trigger: ReactElement;
  onConfirm: () => Promise<ActionResult<unknown>>;
  /** 성공 토스트에 함께 다는 버튼(휴지통 → «되돌리기») */
  undo?: ToastButton;
}

/** 지우기 · 끄기처럼 되돌리기 어려운 동작 앞의 확인 창. 결과는 토스트로 알린다. */
export const ConfirmAction = ({ kind, trigger, onConfirm, undo }: Props) => {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const copy = COPY[kind];

  const confirm = () =>
    startTransition(async () => {
      const result = await onConfirm();
      notifyResult(result, result.ok ? undo : undefined);
      if (result.ok) setOpen(false);
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant={copy.danger ? 'destructive' : 'default'}
            disabled={pending}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
