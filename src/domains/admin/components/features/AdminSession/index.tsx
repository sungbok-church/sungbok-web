'use client';

import {
  type AdminNavGroup,
  can,
  type Permission,
  type PermissionAction,
  screenLabel,
} from '@/domains/admin/lib/adminNav';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { createContext, type ReactNode, useContext } from 'react';

/** 관리자 틀이 이미 받은 로그인한 사람의 정보 — 사용자 · 왼쪽 메뉴(메뉴 관리에서 바꾼 이름) · 권한 */
export type AdminSession = { userId: string; nav: AdminNavGroup[]; permissions: Permission[] };

const Session = createContext<AdminSession | null>(null);

/**
 * 관리자 틀(AdminShell)이 화면들에 로그인한 사람의 정보를 건넨다 — 화면의 미리 만든 틀(제목 · 머리 단추)이 서버를 기다리지 않고
 * 그것으로 바로 그린다(ADR 0027). 틀은 화면을 옮겨도 다시 그리지 않으므로 옮겨 다니는 동안 늘 들고 있다.
 * 보이는 것을 정할 뿐이다 — 데이터 · 저장은 서버가 다시 확인한다(requirePermission · RLS).
 */
export const AdminSessionProvider = ({
  value,
  children,
}: {
  value: AdminSession;
  children: ReactNode;
}) => <Session value={value}>{children}</Session>;

export const useAdminSession = (): AdminSession => {
  const session = useContext(Session);
  if (!session) throw new Error('관리자 틀(AdminShell) 안에서만 쓴다');
  return session;
};

/** 그 메뉴 · 기능 권한이 있을 때만 보인다(머리의 «새 ○○» · «변경 이력» 등) — 보이는 것만 정한다, 막는 것은 서버 */
export const IfCan = ({
  menuKey,
  action,
  children,
}: {
  menuKey: string;
  action: PermissionAction;
  children: ReactNode;
}) => (can(useAdminSession().permissions, menuKey, action) ? children : null);

/** 화면 머리 — 제목은 메뉴 관리에서 바꾼 이름(없으면 fallback). 미리 만든 틀에 들어가 누르는 즉시 보인다 */
export const ScreenHeader = ({
  menuKey,
  fallback,
  actions,
}: {
  menuKey: string;
  fallback: string;
  actions?: ReactNode;
}) => (
  <PageHeader title={screenLabel(useAdminSession().nav, menuKey, fallback)} actions={actions} />
);

/** 화면 머리의 «변경 이력»(표 전체 — 메뉴 · 코드 · 분류 · 새가족) — 창 제목은 메뉴 관리에서 바꾼 이름(없으면 fallback). 미리 만든 틀에 들어간다 */
export const ScreenHistory = ({
  menuKey,
  fallback,
  table,
}: {
  menuKey: string;
  fallback: string;
  table: 'categories' | 'codes' | 'menus' | 'newcomers';
}) => (
  <HistorySheet table={table} subject={screenLabel(useAdminSession().nav, menuKey, fallback)} />
);
