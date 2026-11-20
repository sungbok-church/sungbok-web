// 그룹 · 권한 화면의 «그룹 × (메뉴 · 기능)» 체크 표(설계 6.4 · 6.10). 칸은 그 메뉴에 있는 기능만 그린다(menus.actions).
// 내가 갖지 않은 권한은 고칠 수 없게 막는다 — DB 가 «자기가 가진 권한만 줄 수 있다» 를 다시 막는다(guard_group_permissions).
import type { Permission, PermissionAction } from './adminNav';

export const ACTION_LABELS: Record<PermissionAction, string> = {
  READ: '조회',
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  PURGE: '완전 삭제',
  EXPORT: '엑셀 다운로드',
  HISTORY: '이력조회',
};

export type MatrixMenu = {
  key: string;
  label: string;
  parentKey: string | null;
  sort: number;
  actions: PermissionAction[];
};

export type MatrixCell = {
  action: PermissionAction;
  label: string;
  checked: boolean;
  disabled: boolean;
};
export type MatrixRow = { menuKey: string; label: string; groupLabel: string; cells: MatrixCell[] };

const has = (list: readonly Permission[], menuKey: string, action: PermissionAction) =>
  list.some(p => p.menuKey === menuKey && p.action === action);

export const buildMatrix = (
  menus: readonly MatrixMenu[],
  granted: readonly Permission[],
  mine: readonly Permission[],
  isFullAdmin: boolean
): MatrixRow[] => {
  const tops = menus.filter(m => m.parentKey === null).sort((a, b) => a.sort - b.sort);
  const order = (m: MatrixMenu) => {
    const top = tops.findIndex(t => t.key === (m.parentKey ?? m.key));
    return [top, m.parentKey === null ? -1 : m.sort] as const;
  };
  return menus
    .filter(m => m.actions.length > 0)
    .sort((a, b) => {
      const [ta, sa] = order(a);
      const [tb, sb] = order(b);
      return ta - tb || sa - sb;
    })
    .map(m => ({
      menuKey: m.key,
      label: m.label,
      groupLabel: tops.find(t => t.key === m.parentKey)?.label ?? '',
      cells: m.actions.map(action => ({
        action,
        label: ACTION_LABELS[action],
        checked: has(granted, m.key, action),
        disabled: !isFullAdmin && !has(mine, m.key, action),
      })),
    }));
};

export const diffPermissions = (before: readonly Permission[], after: readonly Permission[]) => ({
  add: after.filter(p => !has(before, p.menuKey, p.action)),
  remove: before.filter(p => !has(after, p.menuKey, p.action)),
});

/** 표의 칸 하나를 가리키는 key — «메뉴:기능» */
export const permissionKey = (menuKey: string, action: PermissionAction) => `${menuKey}:${action}`;

/** 처음 그릴 때 체크된 칸들 */
export const checkedKeys = (rows: readonly MatrixRow[]) =>
  rows.flatMap(r => r.cells.filter(c => c.checked).map(c => permissionKey(r.menuKey, c.action)));

/** 칸 key 를 권한으로(모양이 틀리거나 없는 기능이면 버린다) */
export const keysToPermissions = (keys: Iterable<string>): Permission[] =>
  [...keys].flatMap(key => {
    const [menuKey, action, extra] = key.split(':');
    if (!menuKey || extra !== undefined || !(action in ACTION_LABELS)) return [];
    return [{ menuKey, action: action as PermissionAction }];
  });
