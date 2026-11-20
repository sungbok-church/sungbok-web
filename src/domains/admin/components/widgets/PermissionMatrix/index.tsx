import type { PermissionAction } from '@/domains/admin/api/adminNav';
import { ACTION_LABELS, type MatrixRow, permissionKey } from '@/domains/admin/api/permissionMatrix';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { CheckIcon } from 'lucide-react';
import { Fragment } from 'react';

interface Props {
  rows: MatrixRow[];
  /** 체크된 칸(permissionKey). 주지 않으면 rows 의 처음 상태 */
  checked?: ReadonlySet<string>;
  /** 주면 고칠 수 있는 표(그룹 등록 · 수정), 없으면 보기 전용(그룹 상세) */
  onToggle?: (key: string, on: boolean) => void;
}

const ACTIONS = Object.keys(ACTION_LABELS) as PermissionAction[];

/**
 * 그룹 × (메뉴 · 기능) 권한 표 — 줄은 메뉴(대메뉴로 묶음), 칸은 기능 7개. 그 메뉴에 없는 기능은 «–».
 * 고칠 때는 내가 갖지 않은 권한이 막혀 있다(DB 가 «자기 권한만» 을 다시 막는다). 저장은 폼이 한다.
 */
export const PermissionMatrix = ({ rows, checked, onToggle }: Props) => {
  const isOn = (row: MatrixRow, action: PermissionAction) =>
    checked
      ? checked.has(permissionKey(row.menuKey, action))
      : row.cells.some(c => c.action === action && c.checked);
  const groups = [...new Set(rows.map(r => r.groupLabel))];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="min-w-32">메뉴</TableHead>
            {ACTIONS.map(action => (
              <TableHead key={action} className="text-center whitespace-nowrap">
                {ACTION_LABELS[action]}
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
                    {label}
                  </TableCell>
                </TableRow>
              )}
              {rows
                .filter(r => r.groupLabel === label)
                .map(row => (
                  <TableRow key={row.menuKey}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {ACTIONS.map(action => {
                      const cell = row.cells.find(c => c.action === action);
                      if (!cell) {
                        return (
                          <TableCell
                            key={action}
                            className="text-muted-foreground text-center"
                            aria-label="없는 기능"
                          >
                            –
                          </TableCell>
                        );
                      }
                      const on = isOn(row, action);
                      return (
                        <TableCell key={action}>
                          <div className="flex justify-center">
                            {onToggle ? (
                              <Checkbox
                                aria-label={`${row.label} ${cell.label}`}
                                checked={on}
                                disabled={cell.disabled}
                                onCheckedChange={next =>
                                  onToggle(permissionKey(row.menuKey, action), next)
                                }
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
