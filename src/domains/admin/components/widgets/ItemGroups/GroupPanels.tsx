'use client';

import { GroupNav, type GroupNavItem } from '@/domains/admin/components/features/GroupNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * 왼쪽 묶음 목록 + 오른쪽 그 묶음의 표. 표는 서버가 묶음마다 미리 그려 넘긴다(panels) — 묶음을 누르면 서버에 묻지 않고
 * 주소(?group=)만 바꿔 바로 보인다. 주소가 정본이라 뒤로 가기 · 새로 고침 · 저장 뒤 다시 그리기에도 같은 묶음이 남는다.
 */
export const GroupPanels = ({
  title,
  label,
  groups,
  basePath,
  panels,
}: {
  title: string;
  label: string;
  groups: GroupNavItem[];
  basePath: string;
  panels: Record<string, ReactNode>;
}) => {
  // Suspense 없이 읽어도 된다 — 이 부품은 서버에서 오는 몸통(Deferred) 안에서 브라우저에 붙은 뒤에만 그려진다(ADR 0027)
  const asked = useSearchParams().get('group');
  const current = groups.find(g => g.key === asked)?.key ?? groups[0]?.key ?? '';
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupNav
            label={label}
            groups={groups}
            current={current}
            basePath={basePath}
            // Next 는 history.pushState 를 알아듣는다 — useSearchParams 가 새 주소로 다시 그린다(서버 요청 없음)
            onSelect={href => window.history.pushState(null, '', href)}
          />
        </CardContent>
      </Card>
      {panels[current]}
    </div>
  );
};
