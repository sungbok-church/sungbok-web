'use client';

// 단계로 나눈 등록 화면의 틀(설계 6.10 «등록»). 단계 상태는 lib/formSteps.
//   · StepCard: 단계가 세로로 놓이는 카드(새 사용자) — 열린 단계만 펼치고, 끝낸 단계는 한 줄 요약으로 접는다.
//     접힌 단계는 머리 전체가 버튼이라 누르면(Enter · Space 도) 다시 열린다.
//   · Stepper: 위쪽 단계 표시(새 그룹) — 1 이름 · 설명 → 2 메뉴 권한.
// 펼치고 접을 때 움직임은 두지 않는다(줄이는 움직임 설정과 상관없이 바로 바뀐다).
import type { StepState } from '@/domains/admin/lib/formSteps';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { cn } from '@/shared/lib/utils';
import { CheckIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

/** 단계 번호 동그라미 — 끝낸 단계는 체크 */
const StepMark = ({ n, done, active }: { n: number; done: boolean; active: boolean }) => (
  <span
    aria-hidden
    className={cn(
      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
      active ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
    )}
  >
    {done ? <CheckIcon className="size-3.5" /> : n}
  </span>
);

export const StepCard = ({
  n,
  title,
  state,
  summary,
  description,
  final = false,
  onOpen,
  actions,
  children,
}: {
  n: number;
  title: string;
  state: StepState;
  /** 접혔을 때의 한 줄 요약 */
  summary?: ReactNode;
  /** 마지막 확인 단계 — 고칠 것이 없어 접혀도 체크 대신 번호, 머리에는 «보기» */
  final?: boolean;
  /** 열렸을 때 제목 아래 한 줄 */
  description?: ReactNode;
  /** 접힌 머리를 눌렀을 때 — 이 단계를 연다 */
  onOpen?: () => void;
  /** 열린 단계 아래의 버튼들(취소 · 다음 · 만들기) */
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const open = state === 'open';
  // 새로 열린 단계로 포커스를 옮긴다 — 누른 [다음] 이 접혀 사라져도 키보드 · 화면 읽기 위치를 잃지 않게. 처음 그릴 때는 그대로
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      ref.current?.focus(); // 화면 밖이면 브라우저가 보이게 굴린다
    }
    wasOpen.current = open;
  }, [open]);

  const head = (
    <>
      <CardTitle className="flex items-center gap-2">
        <StepMark n={n} done={state === 'done' && !final} active={state !== 'later'} />
        <span className={cn(state === 'later' && 'text-muted-foreground')}>{title}</span>
      </CardTitle>
      {state === 'done' && summary && (
        <CardDescription className="truncate pl-8">{summary}</CardDescription>
      )}
      {open && description && <CardDescription className="pl-8">{description}</CardDescription>}
      {state === 'done' && (
        <CardAction>
          <span className="text-muted-foreground text-sm">{final ? '보기' : '바꾸기'}</span>
        </CardAction>
      )}
    </>
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={next => {
        if (next) onOpen?.();
      }}
      render={
        <Card
          ref={ref}
          tabIndex={-1}
          size={open ? 'default' : 'sm'}
          role="group"
          aria-label={`${n}단계 ${title}`}
          className="outline-none"
        />
      }
    >
      {state === 'done' ? (
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="focus-visible:ring-ring/50 cursor-pointer outline-none focus-visible:ring-3" />
          }
        >
          {head}
        </CollapsibleTrigger>
      ) : (
        <CardHeader>{head}</CardHeader>
      )}
      <CollapsibleContent>
        <CardContent>
          {children}
          {actions && (
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{actions}</div>
          )}
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** 위쪽 단계 표시 — 지금 단계만 이름을 보이고(좁은 화면), 지난 단계는 체크 */
export const Stepper = ({ steps, current }: { steps: readonly string[]; current: number }) => (
  <ol className="m-0 flex list-none items-center gap-2 p-0" aria-label="단계">
    {steps.map((label, i) => {
      const now = i === current;
      return (
        <li
          key={label}
          className={cn('flex min-w-0 items-center gap-2', i < steps.length - 1 && 'flex-1')}
          aria-current={now ? 'step' : undefined}
        >
          <StepMark n={i + 1} done={i < current} active={i <= current} />
          <span
            className={cn(
              'truncate text-sm',
              now ? 'font-medium' : 'text-muted-foreground max-sm:sr-only'
            )}
          >
            {label}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="bg-border h-px min-w-4 flex-1" />}
        </li>
      );
    })}
  </ol>
);
