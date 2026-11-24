'use client';

import { type AdminNavGroup, buildBreadcrumbs } from '@/domains/admin/lib/adminNav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

/**
 * 위쪽 막대의 경로 표시 — 대메뉴 › 메뉴 › 새로 만들기 · 수정(스타터의 Breadcrumbs 자리).
 * 좁은 화면에서는 마지막 칸만 보인다. 화면 제목(h1)은 각 페이지의 머리(PageHeader)가 그린다.
 */
export const HeaderBreadcrumbs = ({ nav }: { nav: AdminNavGroup[] }) => {
  const crumbs = buildBreadcrumbs(usePathname(), nav);
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className={last ? 'min-w-0' : 'hidden md:inline-flex'}>
                {last ? (
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator className="hidden md:block" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
