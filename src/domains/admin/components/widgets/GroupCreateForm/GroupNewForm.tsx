'use client';

import { useArrived } from '@/domains/admin/hooks/useArrived';
import type { MatrixRow } from '@/domains/admin/lib/permissionMatrix';

import { GroupCreateForm } from './index';

/** 새 그룹 폼이 서버에서 받는 것 — 사용자(임시 저장 칸) · 체크 없는 권한 표 */
export type GroupNewData = { userId: string; matrix: MatrixRow[] };

/** 새 그룹 — 1단계(이름 · 설명)는 누르는 즉시 쓰고(미리 만든 틀, ADR 0027), 2단계의 권한 표는 오는 대로 채운다(useArrived) */
export const GroupNewForm = ({ data }: { data: Promise<GroupNewData> }) => {
  const loaded = useArrived(data);
  return <GroupCreateForm userId={loaded?.userId ?? ''} matrix={loaded?.matrix ?? null} />;
};
