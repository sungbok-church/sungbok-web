// 새 사용자 화면의 «이 사람이 갖게 될 권한» — 고른 그룹의 권한(group_permissions)을 합쳐 메뉴 이름 · 기능 이름표로 쉽게 적는다.
// 메뉴 순서와 기능 이름은 권한 표(permissionMatrix)와 같다.
import type { Permission, PermissionAction } from './adminNav';
import { ACTION_LABELS, buildMatrix, type MatrixMenu } from './permissionMatrix';

export type GrantedMenu = { menuKey: string; label: string; actions: PermissionAction[] };
export type SummaryLine = { menus: string[]; actions: string[] };

const ACTION_ORDER = Object.keys(ACTION_LABELS) as PermissionAction[];

/** 여러 그룹의 권한을 합친다 — 표와 같은 메뉴 순서, 기능은 정해진 순서. 권한이 없는 메뉴는 뺀다 */
export const mergeGrants = (
  menus: readonly MatrixMenu[],
  lists: readonly (readonly Permission[])[]
): GrantedMenu[] =>
  buildMatrix(menus, lists.flat()).flatMap(row => {
    const on = new Set(row.cells.filter(c => c.checked).map(c => c.action));
    const actions = ACTION_ORDER.filter(a => on.has(a));
    return actions.length ? [{ menuKey: row.menuKey, label: row.label, actions }] : [];
  });

/** 같은 기능 묶음끼리 메뉴를 묶은 줄 — «주보 · 교회앨범» / «조회 · 등록 · 수정». notes 는 메뉴 이름 뒤에 붙이는 말(메뉴 key → 말) */
export const summaryLines = (
  granted: readonly GrantedMenu[],
  notes: Readonly<Record<string, string>> = {}
): SummaryLine[] => {
  const lines = new Map<string, SummaryLine>();
  granted.forEach(({ menuKey, label, actions }) => {
    const key = actions.join(',');
    const line = lines.get(key) ?? { menus: [], actions: actions.map(a => ACTION_LABELS[a]) };
    line.menus.push(notes[menuKey] ? `${label}(${notes[menuKey]})` : label);
    lines.set(key, line);
  });
  return [...lines.values()];
};

const DIGEST_MAX = 3;

/** 그룹 카드의 한 줄 — 메뉴 이름을 셋까지, 넘으면 «외 N개». 권한이 없으면 빈 문자열 */
export const menuDigest = (granted: readonly GrantedMenu[]) => {
  const names = granted.map(g => g.label);
  const head = names.slice(0, DIGEST_MAX).join(' · ');
  return names.length > DIGEST_MAX ? `${head} 외 ${names.length - DIGEST_MAX}개` : head;
};

/** 담당 부서가 범위를 정하는 메뉴 — «다음세대 부서» 는 그 부서만 고치고, «사용자» 는 그 부서 사람만 관리한다(my_department_limit) */
const DEPARTMENT_MENUS: readonly string[] = ['departments', 'users'];

/** summaryLines 의 notes — 담당 부서를 그 메뉴 이름 뒤에 붙인다(부서가 없으면 아무것도) */
export const departmentNotes = (department: string): Record<string, string> =>
  department ? Object.fromEntries(DEPARTMENT_MENUS.map(k => [k, department])) : {};

type MenuRowWithGrants = {
  id: string;
  key: string;
  parent_id: string | null;
  label: string | null;
  default_label: string;
  sort: number;
  actions: PermissionAction[];
  group_permissions: { group_id: string; action: PermissionAction }[];
};

/** 페이지가 읽은 관리자 메뉴 행(group_permissions 를 붙여)을 표 메뉴와 그룹별 권한으로 */
export const readMenuRows = (rows: readonly MenuRowWithGrants[]) => {
  const keyOf = new Map(rows.map(m => [m.id, m.key]));
  const menus: MatrixMenu[] = rows.map(m => ({
    key: m.key,
    label: m.label ?? m.default_label,
    parentKey: m.parent_id ? (keyOf.get(m.parent_id) ?? null) : null,
    sort: m.sort,
    actions: m.actions,
  }));
  const grants: Record<string, Permission[]> = {};
  rows.forEach(m =>
    m.group_permissions.forEach(g =>
      (grants[g.group_id] ??= []).push({ menuKey: m.key, action: g.action })
    )
  );
  return { menus, grants };
};
