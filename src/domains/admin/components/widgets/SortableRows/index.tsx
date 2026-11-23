'use client';

import {
  reorderCategories,
  reorderCodes,
  updateCategory,
  updateCode,
} from '@/domains/admin/api/actions/itemActions';
import { reorderMenus, updateMenu } from '@/domains/admin/api/actions/menuActions';
import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { usePrefersReducedMotion } from '@/shared/lib/hooks/usePrefersReducedMotion';
import { reorder } from '@/shared/lib/reorder';
import { cn } from '@/shared/lib/utils';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon, LockIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useOptimistic, useRef, useState } from 'react';

import { SORT_INSTRUCTIONS, sortAnnouncements } from './sortAnnouncements';

export type SortableRow = {
  id: string;
  /** 지금 이름(메뉴는 바꾼 이름, 없으면 빈 값) */
  label: string;
  /** 비웠을 때 쓰는 이름(메뉴의 기본 이름) — 코드는 없다 */
  defaultLabel?: string;
  /** 이름 옆에 작게(코드 값 · 주소) */
  detail?: string;
  isActive: boolean;
  /** 사용을 끌 수 없는 줄(잠긴 메뉴 · 프로그램이 쓰는 코드) — 순서는 옮길 수 있다 */
  locked?: boolean;
  /** locked 일 때 그 까닭(풍선 도움말) */
  lockedNote?: string;
  updatedAt: string;
};

const ACTIONS = {
  menus: { update: updateMenu, reorder: reorderMenus },
  categories: { update: updateCategory, reorder: reorderCategories },
  codes: { update: updateCode, reorder: reorderCodes },
} as const;

/** 위아래로만 끈다(옆으로 밀리지 않게) */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const nameOf = (row: SortableRow | undefined) => (row ? row.label || row.defaultLabel || '' : '');

interface Props {
  kind: keyof typeof ACTIONS;
  rows: SortableRow[];
  editable: boolean;
  /** 사용 여부를 켜고 끌 수 있는가(기본 true) — 메뉴는 «전체 관리» 만(guard_menus). 이름 · 순서는 editable 이 정한다 */
  toggleable?: boolean;
  /** 접근성 이름에 쓰는 무리 이름(«콘텐츠 메뉴» 등) */
  caption: string;
  /** 두 번째 칸 머리(«주소» · «영문 이름» · «코드 값») */
  detailHeader: string;
}

/**
 * 메뉴 관리 · 분류 관리 · 코드 관리의 한 줄 고치기 표 — 순서(손잡이를 끌어서 · 키보드로), 이름(Enter · 칸을 떠날 때 저장),
 * 사용 여부(바로 저장). 이름 · 사용 여부는 줄마다 열었을 때의 updated_at 으로 저장한다(동시 수정 막기).
 * 순서는 놓는 즉시 그 순서로 보이고 무리 전체를 한 번에 저장한다(DB 함수 reorder_rows — 한 트랜잭션). 실패하면 서버의 순서로
 * 돌아가고(useOptimistic) 지금 값을 다시 읽는다. 성공하면 Server Action 이 표를 다시 그려 보낸다.
 */
export const SortableRows = ({
  kind,
  rows,
  editable,
  toggleable = true,
  caption,
  detailHeader,
}: Props) => {
  const router = useRouter();
  const dndId = useId();
  const [ids, setOptimisticIds] = useOptimistic(rows.map(r => r.id));
  const { pending: saving, run } = useAdminAction();
  const reducedMotion = usePrefersReducedMotion();
  const sensors = useSensors(
    // 손잡이만 끈다 — 몇 px 움직여야 끌기로 본다(손가락으로 누르기만 해도 끌리지 않게)
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // 키보드로 화면 끝 너머로 옮기면 페이지가 따라 스크롤된다 — 움직임 줄이기 설정이면 부드럽게 말고 바로(기본값 smooth)
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      scrollBehavior: reducedMotion ? 'auto' : 'smooth',
    })
  );
  const byId = new Map(rows.map(r => [r.id, r]));
  const ordered = ids.flatMap(id => byId.get(id) ?? []);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = reorder(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    run(
      async () => {
        setOptimisticIds(next);
        return ACTIONS[kind].reorder({ ids: next });
      },
      result => {
        if (!result.ok) router.refresh();
      }
    );
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{
        announcements: sortAnnouncements(ids, id => nameOf(byId.get(id))),
        screenReaderInstructions: SORT_INSTRUCTIONS,
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
        disabled={!editable || saving}
      >
        <div className="overflow-x-auto rounded-lg border">
          {/* 칸 너비를 고정해 카드마다 같은 자리에 오게 한다. 좁은 화면은 둘째 칸을 이름 밑으로 */}
          <Table aria-label={caption} className="table-fixed">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12">
                  <span className="sr-only">순서</span>
                </TableHead>
                <TableHead className="sm:w-2/5">이름</TableHead>
                <TableHead className="hidden sm:table-cell">{detailHeader}</TableHead>
                <TableHead className="w-28">사용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map(row => (
                // 줄(끌기 · 손잡이)은 id 로, 고치는 칸은 판(updatedAt)으로 새로 그린다 — 순서를 저장하면 판이 바뀌는데,
                // 줄까지 새로 그리면 키보드로 옮긴 뒤 손잡이에 있던 포커스가 사라진다
                <DraggableRow key={row.id} row={row} editable={editable}>
                  <RowFields
                    key={`${row.id}:${row.updatedAt}`}
                    kind={kind}
                    row={row}
                    // 순서를 저장하는 동안에는 이름 · 사용 칸도 막는다 — 순서 저장이 옮긴 줄의 판(updatedAt)을 바꿔서,
                    // 그 사이 보낸 이름 저장은 옛 판이라 «다른 사람이 먼저 고쳤습니다» 로 거절되고 고친 이름이 사라진다
                    editable={editable && !saving}
                    toggleable={toggleable}
                  />
                </DraggableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
};

const DraggableRow = ({
  row,
  editable,
  children,
}: {
  row: SortableRow;
  editable: boolean;
  children: React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, attributes: { roleDescription: '순서를 옮길 수 있는 줄' } });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // 줄이 자리를 비켜 가는 움직임(dnd-kit 이 style 로 넣는 transition)을 움직임 줄이기 설정이면 끈다 — 인라인 style 이라 ! 로 덮는다
      className={cn(
        'motion-reduce:transition-none!',
        isDragging && 'bg-background relative z-10 shadow-md'
      )}
    >
      <TableCell>
        {/* 순서 저장 중에는 SortableContext 가 끌기를 멈춘다 — 손잡이를 끄면(disabled) 키보드 포커스가 빠지므로 끄지 않는다 */}
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon"
          aria-label={`${nameOf(row)} 순서 옮기기`}
          disabled={!editable}
          className="cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
};

const RowFields = ({
  kind,
  row,
  editable,
  toggleable,
}: {
  kind: keyof typeof ACTIONS;
  row: SortableRow;
  editable: boolean;
  toggleable: boolean;
}) => {
  const router = useRouter();
  const [label, setLabel] = useState(row.label);
  const { pending, run } = useAdminAction();
  // 이 줄의 «저장된 상태»(이름 · 사용 여부 · 판). 저장이 끝나도 화면이 새로 그려지기(Server Action 의 응답)까지 row 는 옛 값이다 —
  // 그 사이에 칸을 떠나거나 다시 고치면 옛 판으로 한 번 더 저장해 «다른 사람이 먼저 고쳤습니다» 가 떴다.
  // 그래서 보낼 때 이름을 먼저 적어 두고(같은 이름을 두 번 보내지 않는다), 성공하면 돌려받은 판으로 바꿔 둔다.
  const saved = useRef({ label: row.label, isActive: row.isActive, updatedAt: row.updatedAt });
  const update = (patch: { label: string; isActive: boolean }) => {
    const before = saved.current;
    saved.current = { ...before, ...patch };
    run(
      () =>
        ACTIONS[kind].update({
          id: row.id,
          updatedAt: before.updatedAt,
          ...patch,
        }),
      result => {
        if (result.ok) {
          if (result.data) saved.current = { ...patch, updatedAt: result.data.updatedAt };
          return;
        }
        // 성공하면 Server Action 이 표를 다시 그려 보낸다. 실패(다른 사람이 먼저 고침 등)는 되돌리고 지금 값을 다시 읽는다
        saved.current = before;
        setLabel(before.label);
        router.refresh();
      }
    );
  };

  const saveLabel = () => {
    const next = label.trim();
    if (next === saved.current.label.trim()) return;
    if (kind !== 'menus' && !next) {
      setLabel(saved.current.label);
      return;
    }
    update({ label: next, isActive: saved.current.isActive });
  };

  const inputId = `row-${row.id}`;
  return (
    <>
      <TableCell>
        <label htmlFor={inputId} className="sr-only">
          {row.defaultLabel ?? row.label} 이름
        </label>
        <Input
          id={inputId}
          value={label}
          placeholder={row.defaultLabel}
          maxLength={50}
          disabled={!editable || pending}
          onChange={e => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveLabel();
            }
          }}
          className="max-w-xs"
        />
        {row.detail && (
          <p className="text-muted-foreground mt-1 truncate text-xs sm:hidden">{row.detail}</p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground hidden truncate sm:table-cell">
        {row.detail}
      </TableCell>
      <TableCell>
        {row.locked ? (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="neutral" />}>
              <LockIcon aria-hidden />
              항상 켜짐
            </TooltipTrigger>
            <TooltipContent>
              {row.lockedNote ?? '꺼지면 다시 켤 수 없는 메뉴라 끌 수 없습니다.'}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Switch
            checked={row.isActive}
            disabled={!editable || !toggleable || pending}
            aria-label={`${nameOf(row)} 사용`}
            onCheckedChange={checked => update({ label: saved.current.label, isActive: checked })}
          />
        )}
      </TableCell>
    </>
  );
};
