import type { SummaryLine } from '@/domains/admin/lib/permissionSummary';
import { CircleCheckIcon } from 'lucide-react';

/** «이 사람이 갖게 될 권한» — 같은 기능 묶음마다 한 줄: «주보 · 주일광고 — 조회 · 등록 · 수정» */
export const GrantSummary = ({ lines, picked }: { lines: SummaryLine[]; picked: boolean }) => {
  if (lines.length === 0)
    return (
      <p className="text-muted-foreground m-0 text-sm">
        {picked
          ? '고른 그룹에 권한이 없습니다. 로그인만 됩니다.'
          : '그룹이 없으면 로그인만 됩니다.'}
      </p>
    );
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
      {lines.map(line => (
        <li key={line.menus.join()} className="flex gap-2">
          <CircleCheckIcon aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">
            <span className="font-medium">{line.menus.join(' · ')}</span> —{' '}
            {line.actions.join(' · ')}
          </span>
        </li>
      ))}
    </ul>
  );
};
