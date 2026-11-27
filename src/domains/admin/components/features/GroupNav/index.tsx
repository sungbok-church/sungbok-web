'use client';

import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/badge';
import { isPlainClick } from '@/domains/admin/lib/navigationProgress';
import { LockIcon } from 'lucide-react';

export type GroupNavItem = {
  key: string;
  name: string;
  /** 그 묶음의 항목 수 */
  count: number;
  /** 프로그램이 쓰는 값이라 더하거나 끌 수 없는 묶음 */
  locked?: boolean;
};

/**
 * 분류 · 공통코드 화면의 왼쪽 «묶음» 목록 — 누르면 오른쪽이 그 묶음의 항목 표로 바뀐다(주소 ?group= 에 남는다).
 * 모든 묶음의 항목을 처음에 받아 두므로 서버에 다시 묻지 않고 바로 바꾼다(onSelect). 링크라 새 탭으로도 열린다.
 * data-in-place — 화면 이동 진행 표시줄(NavigationProgress)이 이 클릭을 이동으로 치지 않게.
 * 넓은 화면은 세로 목록, 좁은 화면은 위에 가로로 감기는 목록.
 */
export const GroupNav = ({
  label,
  groups,
  current,
  basePath,
  onSelect,
}: {
  label: string;
  groups: GroupNavItem[];
  current: string;
  basePath: string;
  onSelect: (href: string) => void;
}) => (
  <nav aria-label={label}>
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0 lg:flex-col">
      {groups.map(g => {
        const active = g.key === current;
        const href = `${basePath}?group=${encodeURIComponent(g.key)}`;
        return (
          <li key={g.key}>
            <a
              href={href}
              data-in-place=""
              aria-current={active ? 'page' : undefined}
              onClick={e => {
                if (!isPlainClick(e)) return;
                e.preventDefault();
                // 열린 묶음을 다시 누르면 아무것도 하지 않는다 — 같은 주소가 방문 기록에 또 쌓이지 않게
                if (!active) onSelect(href);
              }}
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
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
);
