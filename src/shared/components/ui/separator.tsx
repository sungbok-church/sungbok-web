'use client';

// shadcn/ui 부품(base-nova · Base UI) 원본 — 관리자 화면은 원본 그대로 쓴다(ADR 0016 · 0018). 원본과 다른 곳: 없음.

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from 'cn';

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
