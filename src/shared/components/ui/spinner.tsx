// shadcn/ui 부품(base-nova · Base UI) 원본 — 관리자 화면은 원본 그대로 쓴다(ADR 0016 · 0018). 원본과 다른 곳: 한글 문구.
import { cn } from 'cn';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="불러오는 중"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
