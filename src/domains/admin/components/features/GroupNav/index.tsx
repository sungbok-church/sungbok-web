import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/badge';
import { LockIcon } from 'lucide-react';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';

export type GroupNavItem = {
  key: string;
  name: string;
  /** 그 묶음의 항목 수 */
  count: number;
  /** 프로그램이 쓰는 값이라 더하거나 끌 수 없는 묶음 */
  locked?: boolean;
};

/**
 * 분류 · 공통코드 화면의 왼쪽 «묶음» 목록 — 누르면 오른쪽에 그 묶음의 항목 표(주소 ?group= 에 남는다).
 * 넓은 화면은 세로 목록, 좁은 화면은 위에 가로로 감기는 목록.
 */
export const GroupNav = ({
  label,
  groups,
  current,
  basePath,
}: {
  label: string;
  groups: GroupNavItem[];
  current: string;
  basePath: string;
}) => (
  <nav aria-label={label}>
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0 lg:flex-col">
      {groups.map(g => {
        const active = g.key === current;
        return (
          <li key={g.key}>
            <Link
              href={`${basePath}?group=${encodeURIComponent(g.key)}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                active && 'bg-muted font-medium'
              )}
            >
              <span className="truncate">{g.name}</span>
              {g.locked && (
                <LockIcon aria-label="잠긴 묶음" className="text-muted-foreground size-3.5" />
              )}
              <Badge variant="secondary" className="ml-auto tabular-nums">
                {g.count}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);
