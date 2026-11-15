'use client';

import { FOCUS } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import { stepZoom, ZOOM_FIT, ZOOM_MAX, zoomLabel } from '@/shared/lib/zoomSteps';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

// 열람기의 조작 부품 — 자료실 문서 열람기와 주보·앨범의 «크게 보기» 가 같이 쓴다.

// 도구 버튼 — 보이는 크기는 40×40, 누르는 영역은 1024 미만에서 가상 영역으로 44×44(DESIGN.md §7).
// 가상 영역은 테두리 안쪽에서 잰다(테두리 1px 을 더해 사방 3px).
const TOOL_HIT =
  "relative max-lg:before:absolute max-lg:before:-inset-[3px] max-lg:before:content-['']";
export const TOOL_BTN = cn(
  'border-b1-border bg-b1-surface text-b1-text hover:bg-b1-accent-soft duration-fast grid h-10 shrink-0 place-items-center rounded-md border transition-colors',
  'aria-disabled:hover:bg-b1-surface aria-disabled:cursor-default aria-disabled:opacity-40',
  TOOL_HIT
);

/**
 * 아이콘 도구 버튼. 끝(첫 쪽·100% 등)에서는 disabled 대신 aria-disabled 로 막는다 —
 * disabled 로 바꾸면 방금 누른 버튼에서 키보드 포커스가 빠져 문서 맨 위로 튄다.
 */
export const ToolButton = ({
  label,
  off = false,
  onClick,
  children,
}: {
  label: string;
  off?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    aria-disabled={off}
    onClick={() => !off && onClick()}
    className={cn(TOOL_BTN, FOCUS, 'w-10')}
  >
    {children}
  </button>
);

/** 넘김 — «‹ 1 / 4장 ›». index 는 0 부터. noun 은 넘기는 단위(«쪽»·«장»), unit 은 숫자 뒤에 붙이는 글자. */
export const PageStepper = ({
  index,
  count,
  onChange,
  noun,
  unit = '',
  className,
}: {
  index: number;
  count: number;
  onChange: (index: number) => void;
  noun: string;
  unit?: string;
  className?: string;
}) => (
  <div
    role="group"
    aria-label={`${noun} 넘김`}
    className={cn('flex items-center gap-1.5', className)}
  >
    <ToolButton label={`이전 ${noun}`} off={index <= 0} onClick={() => onChange(index - 1)}>
      <ChevronLeft aria-hidden className="size-[17px]" />
    </ToolButton>
    <span
      aria-live="polite"
      className="text-b1-text text-caption min-w-12 text-center whitespace-nowrap tabular-nums"
    >
      <span className="sr-only">{noun} </span>
      {index + 1} / {count}
      {unit}
    </span>
    <ToolButton label={`다음 ${noun}`} off={index >= count - 1} onClick={() => onChange(index + 1)}>
      <ChevronRight aria-hidden className="size-[17px]" />
    </ToolButton>
  </div>
);

/** 확대 — «−  100%  +  맞춤»(100~300%, 50% 단위). 배율은 부르는 쪽이 들고 있다. */
export const ZoomControls = ({
  zoom,
  onZoom,
  className,
}: {
  zoom: number;
  onZoom: (zoom: number) => void;
  className?: string;
}) => (
  <div role="group" aria-label="확대" className={cn('flex items-center gap-1.5', className)}>
    <ToolButton label="축소" off={zoom <= ZOOM_FIT} onClick={() => onZoom(stepZoom(zoom, -1))}>
      <Minus aria-hidden className="size-4" />
    </ToolButton>
    <span
      aria-live="polite"
      className="text-b1-text text-caption min-w-11 text-center whitespace-nowrap tabular-nums"
    >
      <span className="sr-only">배율 </span>
      {zoomLabel(zoom)}
    </span>
    <ToolButton label="확대" off={zoom >= ZOOM_MAX} onClick={() => onZoom(stepZoom(zoom, 1))}>
      <Plus aria-hidden className="size-4" />
    </ToolButton>
    <button
      type="button"
      aria-label="창에 맞춤"
      onClick={() => onZoom(ZOOM_FIT)}
      className={cn(TOOL_BTN, FOCUS, 'text-caption px-3 whitespace-nowrap')}
    >
      맞춤
    </button>
  </div>
);

/**
 * 고정된 선택 버튼(세그먼트) — «한 면 | 양면», «왼쪽 | 오른쪽». 셀렉트박스 대신 늘 보이는 버튼 한 줄이다.
 * 버튼 높이가 그대로 44px 다(터치 영역 — 가상 영역으로 넓히지 않는다: 두 묶음이 위아래로 붙으면 서로 겹친다).
 * 고른 쪽만 흰 바탕으로 떠 보인다.
 */
export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** 묶음의 이름(화면낭독기) */
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) => (
  <div
    role="group"
    aria-label={label}
    className={cn('bg-b1-border/70 inline-flex shrink-0 gap-0.5 rounded-lg p-[3px]', className)}
  >
    {options.map(o => (
      <button
        key={o.value}
        type="button"
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
        className={cn(
          'text-caption duration-fast min-h-11 min-w-[52px] rounded-md px-3 whitespace-nowrap transition-colors',
          FOCUS,
          o.value === value
            ? 'bg-b1-surface text-b1-accent font-bold shadow-sm'
            : 'text-b1-sub hover:text-b1-text'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
