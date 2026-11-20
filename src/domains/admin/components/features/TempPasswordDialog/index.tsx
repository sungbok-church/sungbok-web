'use client';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

interface Props {
  /** 보여 줄 임시 비밀번호(없으면 닫혀 있다) */
  password: string | null;
  email: string;
  /** [확인했습니다] — 상세로 가는 등 */
  onClose: () => void;
  /** 있으면 [계속 등록] 도 보인다(등록 화면) */
  onContinue?: () => void;
}

/**
 * 임시 비밀번호를 한 번만 보여 준다(설계 11-1 — 권한 있는 사람이 직접 전달한다). 어디에도 저장하지 않으므로
 * 이 창을 닫으면 다시 볼 수 없다. 받은 사람은 첫 로그인 때 새 비밀번호를 정한다.
 */
export const TempPasswordDialog = ({ password, email, onClose, onContinue }: Props) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={password !== null}
      onOpenChange={open => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>임시 비밀번호</DialogTitle>
          <DialogDescription>
            {email} 에게 직접 전달해 주세요. 이 창을 닫으면 다시 볼 수 없습니다. 받은 사람은 처음
            로그인할 때 새 비밀번호를 정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={password ?? ''} aria-label="임시 비밀번호" className="font-mono" />
          <Button variant="outline" onClick={copy} aria-label="복사">
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            {copied ? '복사했습니다' : '복사'}
          </Button>
        </div>
        <DialogFooter>
          {onContinue && (
            <Button variant="outline" onClick={onContinue}>
              계속 등록
            </Button>
          )}
          <Button onClick={onClose}>{onContinue ? '상세로' : '확인했습니다'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
