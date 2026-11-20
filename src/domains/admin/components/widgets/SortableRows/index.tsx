'use client';

import type { ActionResult } from '@/domains/admin/api/actionResult';
import { moveCategory, updateCategory } from '@/domains/admin/api/categoryActions';
import { moveCode, updateCode } from '@/domains/admin/api/codeActions';
import { moveMenu, updateMenu } from '@/domains/admin/api/menuActions';
import { notifyResult } from '@/domains/admin/api/notify';
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
import { ArrowDownIcon, ArrowUpIcon, LockIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

export type SortableRow = {
  id: string;
  /** 지금 이름(메뉴는 바꾼 이름, 없으면 빈 값) */
  label: string;
  /** 비웠을 때 쓰는 이름(메뉴의 기본 이름) — 코드는 없다 */
  defaultLabel?: string;
  /** 이름 옆에 작게(코드 값 · 주소) */
  detail?: string;
  isActive: boolean;
  /** 끌 수 없는 줄(잠긴 메뉴 · 프로그램이 쓰는 코드) */
  locked?: boolean;
  /** locked 일 때 그 까닭(풍선 도움말) */
  lockedNote?: string;
  updatedAt: string;
};

const ACTIONS = {
  menus: { update: updateMenu, move: moveMenu },
  categories: { update: updateCategory, move: moveCategory },
  codes: { update: updateCode, move: moveCode },
} as const;

interface Props {
  kind: keyof typeof ACTIONS;
  rows: SortableRow[];
  editable: boolean;
  /** 접근성 이름에 쓰는 무리 이름(«콘텐츠 메뉴» 등) */
  caption: string;
  /** 두 번째 칸 머리(«주소» · «영문 이름» · «코드 값») */
  detailHeader: string;
}

/**
 * 메뉴 관리 · 분류 관리 · 코드 관리의 한 줄 고치기 표 — 이름(Enter · 칸을 떠날 때 저장), 사용 여부(바로 저장), 위로 · 아래로.
 * 저장은 줄마다 열었을 때의 updated_at 으로 한다(동시 수정 막기).
 */
export const SortableRows = ({ kind, rows, editable, caption, detailHeader }: Props) => (
  <div className="overflow-x-auto rounded-lg border">
    {/* 칸 너비를 고정해 카드마다 같은 자리에 오게 한다 */}
    <Table aria-label={caption} className="min-w-160 table-fixed">
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="w-2/5">이름</TableHead>
          <TableHead>{detailHeader}</TableHead>
          <TableHead className="w-28">사용</TableHead>
          <TableHead className="w-24 text-right">순서</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <RowEditor
            key={`${row.id}:${row.updatedAt}`}
            kind={kind}
            row={row}
            editable={editable}
            first={index === 0}
            last={index === rows.length - 1}
          />
        ))}
      </TableBody>
    </Table>
  </div>
);

const RowEditor = ({
  kind,
  row,
  editable,
  first,
  last,
}: {
  kind: keyof typeof ACTIONS;
  row: SortableRow;
  editable: boolean;
  first: boolean;
  last: boolean;
}) => {
  const router = useRouter();
  const [label, setLabel] = useState(row.label);
  const [pending, startTransition] = useTransition();
  // 이 줄의 «저장된 상태»(이름 · 사용 여부 · 판). 저장이 끝나도 화면이 새로 그려지기(router.refresh)까지 row 는 옛 값이다 —
  // 그 사이에 칸을 떠나거나 다시 고치면 옛 판으로 한 번 더 저장해 «다른 사람이 먼저 고쳤습니다» 가 떴다.
  // 그래서 보낼 때 이름을 먼저 적어 두고(같은 이름을 두 번 보내지 않는다), 성공하면 돌려받은 판으로 바꿔 둔다.
  const saved = useRef({ label: row.label, isActive: row.isActive, updatedAt: row.updatedAt });
  const run = (job: () => Promise<ActionResult<unknown>>, onFail?: () => void) =>
    startTransition(async () => {
      const result = await job();
      if (!result.ok) onFail?.();
      notifyResult(result);
      router.refresh();
    });
  const update = (patch: { label: string; isActive: boolean }) => {
    const before = saved.current;
    saved.current = { ...before, ...patch };
    run(
      async () => {
        const result = await ACTIONS[kind].update({
          id: row.id,
          updatedAt: before.updatedAt,
          ...patch,
        });
        if (result.ok && result.data)
          saved.current = { ...patch, updatedAt: result.data.updatedAt };
        return result;
      },
      () => {
        saved.current = before;
        setLabel(before.label);
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
    <TableRow>
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
      </TableCell>
      <TableCell className="text-muted-foreground">{row.detail}</TableCell>
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
            disabled={!editable || pending}
            aria-label={`${row.label || row.defaultLabel} 사용`}
            onCheckedChange={checked => update({ label: saved.current.label, isActive: checked })}
          />
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label="위로"
            disabled={!editable || pending || first}
            onClick={() => run(() => ACTIONS[kind].move({ id: row.id, dir: 'up' }))}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="아래로"
            disabled={!editable || pending || last}
            onClick={() => run(() => ACTIONS[kind].move({ id: row.id, dir: 'down' }))}
          >
            <ArrowDownIcon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
