// shadcn/ui 부품(base-nova · Base UI) 원본 — 관리자 화면은 원본 그대로 쓴다(ADR 0016 · 0018). 원본과 다른 곳: 없음.
import { cn } from 'cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
