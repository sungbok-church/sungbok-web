import { formatAdminTime } from '@/domains/admin/lib/adminTime';
import {
  actionLabel,
  formatChanges,
  type NameLookup,
  subjectOf,
  tableLabel,
} from '@/domains/admin/lib/auditFormat';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

export type AuditItem = {
  id: number;
  table_name: string;
  action: string;
  at: string;
  changes: unknown;
  actorName: string;
};

const ACTION_TONE: Record<string, 'success' | 'accent' | 'danger' | 'neutral'> = {
  INSERT: 'success',
  UPDATE: 'accent',
  DELETE: 'danger',
  EXPORT: 'neutral',
};

/**
 * 변경 이력 한 건 — 머리(동작 · 대상 · 누가 · 언제) 아래 표(항목 | 이전 | 이후)(설계 6.10 «화면 흐름 표준 › 변경 이력»).
 * 등록은 «이전» 이 비고, 삭제는 «이후» 가 빈다. 개인정보 칸은 «(값 숨김)».
 */
export const AuditEntry = ({
  item,
  names,
  showTable = true,
}: {
  item: AuditItem;
  /** 바뀐 칸의 id → 이름(referenceNames) */
  names?: NameLookup;
  showTable?: boolean;
}) => {
  const lines = formatChanges(item, names);
  const subject = subjectOf(item);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={ACTION_TONE[item.action] ?? 'neutral'}>{actionLabel(item.action)}</Badge>
        {showTable && (
          <span className="font-medium">
            {tableLabel(item.table_name)}
            {subject && <span className="text-muted-foreground font-normal"> · {subject}</span>}
          </span>
        )}
        <span className="text-muted-foreground ml-auto">
          {item.actorName} · <time dateTime={item.at}>{formatAdminTime(item.at)}</time>
        </span>
      </div>
      {lines.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table className="table-fixed">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-1/4">항목</TableHead>
                <TableHead>이전</TableHead>
                <TableHead>이후</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(line => (
                <TableRow key={line.field}>
                  <TableCell className="text-muted-foreground align-top whitespace-normal">
                    {line.field}
                  </TableCell>
                  <TableCell className="align-top break-words whitespace-normal">
                    {line.before || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="align-top font-medium break-words whitespace-normal">
                    {line.after || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
