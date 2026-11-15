'use client';

import { issueLabel, type IssueYear } from '@/domains/news/api/bulletinList';
import { FOCUS } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  /** 한 해의 월별 묶음 */
  months: IssueYear['months'];
  selectedId: string;
  /** 가장 최근 호 — «최신» 표시 */
  latestId?: string;
  onSelect: (id: string) => void;
  /** 바텀시트 안에서는 줄을 조금 크게 */
  roomy?: boolean;
}

/**
 * 한 해의 주보 목록 — 월별 묶음과 호. PC 의 연도 접이식 목록과 휴대폰 바텀시트가 같이 쓴다.
 */
export const IssueList = ({ months, selectedId, latestId, onSelect, roomy }: Props) => (
  <>
    {months.map(({ month, issues }) => (
      <div key={month} className="pb-2">
        <h3
          className={cn(
            'text-b1-sub text-caption px-2.5 pb-1 font-normal',
            roomy ? 'pt-4' : 'pt-2.5'
          )}
        >
          {month}월
        </h3>
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {issues.map(issue => {
            const on = issue.id === selectedId;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(issue.id)}
                  className={cn(
                    'duration-fast flex w-full items-center gap-1.5 rounded-lg px-2.5 text-left whitespace-nowrap transition-colors',
                    roomy ? 'text-body-sm min-h-[52px]' : 'text-label min-h-11',
                    FOCUS,
                    on
                      ? 'bg-b1-accent-soft text-b1-accent font-bold'
                      : 'text-b1-text hover:bg-b1-accent-soft/60 font-semibold'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{issueLabel(issue.date)}</span>
                  {issue.id === latestId && (
                    <span className="bg-b1-accent text-b1-surface text-caption rounded px-1.5 font-bold">
                      최신
                    </span>
                  )}
                  {on && <Check aria-hidden className="size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </>
);
