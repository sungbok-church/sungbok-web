import type { PermissionAction } from '@/domains/admin/lib/adminNav';
import {
  ACTION_LABELS,
  bulkState,
  checkedKeys,
  columnKeys,
  type MatrixRow,
  NO_ACTION,
  permissionKey,
  rowKeys,
} from '@/domains/admin/lib/permissionMatrix';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { CheckIcon } from 'lucide-react';
import { Fragment } from 'react';

interface Props {
  rows: MatrixRow[];
  /** 체크된 칸(permissionKey). 주지 않으면 rows 의 처음 상태 */
  checked?: ReadonlySet<string>;
  /** 주면 고칠 수 있는 표(그룹 등록 · 수정 — «전체 관리» 만), 없으면 보기 전용(그룹 상세). 칸 하나 · 줄 · 기능 칸을 한꺼번에 켜고 끈다 */
  onToggle?: (keys: string[], on: boolean) => void;
}

const ACTIONS = Object.keys(ACTION_LABELS) as PermissionAction[];

/**
 * 그룹 × (메뉴 · 기능) 권한 표 — 줄은 메뉴(대메뉴로 묶음), 칸은 기능 7개. 그 메뉴에 없는 기능은 «–»(올리면 까닭을 띄운다).
 * 고칠 때는 메뉴 이름 옆 체크로 그 줄을, 기능 이름 아래 체크로 그 기능 칸을 한꺼번에 켜고 끈다. 저장은 폼이 한다.
 * 좁은 화면에서는 표 안에서 옆으로 밀리고 메뉴 이름 칸은 왼쪽에 붙어 있다.
 */
export const PermissionMatrix = ({ rows, checked, onToggle }: Props) => {
  const current = checked ?? new Set(checkedKeys(rows));
  const groups = [...new Set(rows.map(r => r.groupLabel))];

  // 머리 체크(줄 · 기능 칸) — 칸이 없으면 자리만 둔다
  const bulkBox = (keys: string[], label: string) => {
    if (!onToggle) return null;
    const state = bulkState(keys, current);
    if (!state) return <span aria-hidden className="size-4 shrink-0" />;
    return (
      <Checkbox
        aria-label={`${label} 모두`}
        checked={state.checked}
        indeterminate={state.indeterminate}
        onCheckedChange={next => onToggle(keys, next)}
      />
    );
  };

  return (
    // 표가 카드 폭을 밀어내지 않게(옆으로 밀리는 것은 표 안에서만) 폭 계산에서 내용을 뺀다
    <div className="overflow-hidden rounded-lg border contain-inline-size">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="bg-muted sticky left-0 z-10 min-w-32">메뉴</TableHead>
            {ACTIONS.map(action => (
              <TableHead key={action} className="h-auto py-2 text-center">
                <div className="flex flex-col items-center gap-2">
                  {ACTION_LABELS[action]}
                  {bulkBox(columnKeys(rows, action), ACTION_LABELS[action])}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(label => (
            <Fragment key={label || 'top'}>
              {label && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={ACTIONS.length + 1}
                    className="text-muted-foreground text-xs font-medium"
                  >
                    <span className="sticky left-2">{label}</span>
                  </TableCell>
                </TableRow>
              )}
              {rows
                .filter(r => r.groupLabel === label)
                .map(row => (
                  <TableRow key={row.menuKey}>
                    <TableCell className="bg-card sticky left-0 z-10 font-medium">
                      <div className="flex items-center gap-3">
                        {bulkBox(rowKeys(row), row.label)}
                        {row.label}
                      </div>
                    </TableCell>
                    {ACTIONS.map(action => {
                      const cell = row.cells.find(c => c.action === action);
                      const key = permissionKey(row.menuKey, action);
                      if (!cell) {
                        return (
                          <TableCell key={action} className="text-muted-foreground text-center">
                            {/* 터치에서는 뜨지 않는다 — 빈 칸 «–» 이라 고를 것이 없다는 것은 보인다 */}
                            <Tooltip>
                              <TooltipTrigger render={<span className="inline-flex" />}>
                                <span aria-hidden>–</span>
                              </TooltipTrigger>
                              <TooltipContent>{NO_ACTION}</TooltipContent>
                            </Tooltip>
                            <span className="sr-only">{NO_ACTION}</span>
                          </TableCell>
                        );
                      }
                      const on = current.has(key);
                      return (
                        <TableCell key={action}>
                          <div className="flex justify-center">
                            {onToggle ? (
                              <Checkbox
                                aria-label={`${row.label} ${cell.label}`}
                                checked={on}
                                onCheckedChange={next => onToggle([key], next)}
                              />
                            ) : on ? (
                              <CheckIcon aria-label={`${cell.label} 있음`} className="size-4" />
                            ) : (
                              <span className="sr-only">{cell.label} 없음</span>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
