import { fail } from '@/shared/api/result';
import 'server-only';

import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import {
  type AdminNavGroup,
  buildAdminNav,
  can,
  type MenuRow,
  type Permission,
  type PermissionAction,
  SCREENS_READY,
} from '../../lib/adminNav';
import { type AdminUser, requireAdminUser } from './session.server';

export const PASSWORD_PATH = '/admin/password';
/** 꺼진 계정 · 사용자 정보가 없는 계정을 로그아웃시키는 주소(route handler — 서버 컴포넌트는 쿠키를 지우지 못한다) */
export const INACTIVE_LOGOUT_PATH = '/admin/logout?reason=inactive';

export type AdminContext = {
  user: AdminUser;
  profile: { name: string; mustChangePassword: boolean };
  permissions: Permission[];
  nav: AdminNavGroup[];
};

/**
 * 로그인한 사람의 관리자 맥락 — 사용자 정보 · 권한 목록(`rpc('my_permissions')`) · 왼쪽 메뉴.
 * 한 요청 안에서는 한 번만 읽는다(레이아웃 · 페이지가 같이 불러도). 로그인하지 않았으면 로그인 화면으로 보낸다.
 * DB 를 읽지 못하면 권한 없음으로 그린다 — 오류 화면을 내지 않고, 막는 것은 어차피 DB(RLS)다.
 * 사용자 정보가 없거나 꺼진 계정이면 로그아웃시킨다(INACTIVE_LOGOUT_PATH).
 */
export const loadAdminContext = cache(async (): Promise<AdminContext> => {
  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  // 판단은 아래 requireActive 가 한다 — 여기서는 읽기만

  const [profileRes, permRes, menuRes, newcomersRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, must_change_password, is_active')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.rpc('my_permissions'),
    supabase
      .from('menus')
      .select('id, key, parent_id, label, default_label, path, sort, is_active')
      .eq('area', 'ADMIN')
      .order('sort'),
    // 왼쪽 메뉴의 «새가족» 숫자 — 아직 연락하지 않은 접수(조회 권한이 없으면 RLS 가 0 으로 준다)
    supabase.from('newcomers').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
  ]);

  // 사용자 정보가 없거나(계정만 남음) 꺼진 계정은 관리자가 아니다 — 레이아웃이 로그아웃시킨다
  if (!profileRes.error && (!profileRes.data || !profileRes.data.is_active))
    redirect(INACTIVE_LOGOUT_PATH);
  const profile = profileRes.data
    ? { name: profileRes.data.name, mustChangePassword: profileRes.data.must_change_password }
    : { name: '', mustChangePassword: false };
  const permissions: Permission[] =
    profileRes.data && !permRes.error
      ? (permRes.data ?? []).map(p => ({ menuKey: p.menu_key, action: p.action }))
      : [];
  const menus: MenuRow[] = menuRes.error
    ? []
    : (menuRes.data ?? []).map(m => ({
        id: m.id,
        key: m.key,
        parentId: m.parent_id,
        label: m.label,
        defaultLabel: m.default_label,
        path: m.path,
        sort: m.sort,
        isActive: m.is_active,
      }));

  const badges: Record<string, number> = { newcomers: newcomersRes.count ?? 0 };
  const nav = buildAdminNav(menus, permissions, SCREENS_READY).map(group => ({
    ...group,
    items: group.items.map(item =>
      badges[item.key] ? { ...item, badge: badges[item.key] } : item
    ),
  }));
  return { user, profile, permissions, nav };
});

/**
 * 페이지 · Server Action 이 시작할 때 부른다. 권한이 없으면 없는 페이지(404) — 메뉴가 있는지조차 드러내지 않는다(설계 6.4).
 * 첫 로그인 등으로 비밀번호를 바꿔야 하면 비밀번호 변경 화면으로 보낸다.
 */
export const requirePermission = async (
  menuKey: string,
  action: PermissionAction
): Promise<AdminContext> => {
  const ctx = await loadAdminContext();
  if (ctx.profile.mustChangePassword) redirect(PASSWORD_PATH);
  if (!can(ctx.permissions, menuKey, action)) notFound();
  return ctx;
};

/** Server Action 의 권한 거절 결과 — 화면이 토스트로 알린다. */
export const NO_PERMISSION = fail('NO_PERMISSION');

/**
 * Server Action 이 시작할 때 부른다. 페이지와 달리 404 를 던지지 않고 null 을 돌려준다 — 열려 있던 화면에서
 * 권한이 빠졌을 때 오류 화면이 아니라 «권한이 없습니다» 토스트가 뜨게(부르는 쪽이 NO_PERMISSION 을 돌려준다).
 * 비밀번호를 바꿔야 하는 계정도 권한이 없는 것으로 본다.
 */
export const actionPermission = async (
  menuKey: string,
  action: PermissionAction
): Promise<AdminContext | null> => {
  const ctx = await loadAdminContext();
  return !ctx.profile.mustChangePassword && can(ctx.permissions, menuKey, action) ? ctx : null;
};
