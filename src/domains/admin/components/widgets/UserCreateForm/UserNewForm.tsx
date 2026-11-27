'use client';

import { useArrived } from '@/domains/admin/hooks/useArrived';
import type { Permission } from '@/domains/admin/lib/adminNav';
import type { GroupOption } from '@/domains/admin/lib/groupScope';
import type { MatrixMenu } from '@/domains/admin/lib/permissionMatrix';

import { UserCreateForm } from './index';

/** 새 사용자 폼이 서버에서 받는 것 — 고를 그룹 · 내 그룹만인가 · 부서 범위 · 메뉴 · 그룹마다 주는 권한(읽을 수 없으면 null) */
export type UserNewData = {
  groups: GroupOption[];
  ownGroupsOnly: boolean;
  departmentLimit: string | null;
  menus: MatrixMenu[];
  grants: Record<string, Permission[]> | null;
};

/** 새 사용자 — 1단계(기본 정보)는 누르는 즉시 쓰고(미리 만든 틀, ADR 0027), 2단계의 그룹 · 부서는 오는 대로 채운다(useArrived) */
export const UserNewForm = ({ data }: { data: Promise<UserNewData> }) => {
  const loaded = useArrived(data);
  return (
    <UserCreateForm
      pending={!loaded}
      groups={loaded?.groups ?? []}
      ownGroupsOnly={loaded?.ownGroupsOnly ?? false}
      departmentLimit={loaded?.departmentLimit ?? null}
      menus={loaded?.menus ?? []}
      grants={loaded?.grants ?? null}
    />
  );
};
