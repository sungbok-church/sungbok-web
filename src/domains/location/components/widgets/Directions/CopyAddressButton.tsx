'use client';

import { Copy } from 'lucide-react';

import { StatusToast } from '@/shared/components/features/StatusToast';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { useCopyText, type CopyMessages } from '@/shared/lib/hooks/useCopyText';
import { cn } from '@/shared/lib/utils';

const MESSAGES: CopyMessages = {
  copied: '주소를 복사했습니다.',
  failed: '복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.',
};

/** «주소 복사» — 휴대폰에서 주소를 자기 지도 앱·내비게이션에 붙여 넣는 가장 빠른 길(ADR 0002). */
export const CopyAddressButton = ({ address }: { address: string }) => {
  const { message, copy } = useCopyText(MESSAGES);
  return (
    <>
      <button
        type="button"
        onClick={() => copy(address)}
        className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 shrink-0 gap-1.5 px-3.5')}
      >
        <Copy size={15} strokeWidth={1.8} aria-hidden />
        주소 복사
      </button>
      <StatusToast message={message} />
    </>
  );
};
