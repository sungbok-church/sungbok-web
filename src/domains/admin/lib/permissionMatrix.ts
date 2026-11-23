// 그룹 · 권한 화면의 «그룹 × (메뉴 · 기능)» 체크 표(설계 6.4 · 6.10). 칸은 그 메뉴에 있는 기능만 그린다(menus.actions).
// 표를 고치는 것은 «전체 관리» 만이라(DB 의 guard_group_permissions) 막힌 칸은 없다 — 그 밖의 사람에게는 보기 전용으로 그린다.
import type { Permission, PermissionAction } from './adminNav';

export const ACTION_LABELS: Record<PermissionAction, string> = {
  READ: '조회',
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  PURGE: '영구 삭제',
  EXPORT: '엑셀로 받기',
  HISTORY: '변경 이력 보기',
};

export type MatrixMenu = {
  key: string;
  label: string;
  parentKey: string | null;
  sort: number;
  actions: PermissionAction[];
};

export type MatrixCell = { action: PermissionAction; label: string; checked: boolean };
export type MatrixRow = { menuKey: string; label: string; groupLabel: string; cells: MatrixCell[] };

const has = (list: readonly Permission[], menuKey: string, action: PermissionAction) =>
  list.some(p => p.menuKey === menuKey && p.action === action);

export const buildMatrix = (
  menus: readonly MatrixMenu[],
  granted: readonly Permission[]
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

// 한꺼번에 고르기 — 줄(메뉴) · 칸(기능) 머리의 체크.
// 조회가 있어야 다른 기능을 쓴다(2026-11-23) — 다른 기능을 켜면 그 줄의 조회도 켜고, 조회를 끄면 그 줄의 다른 기능도 끈다
// (toggleCells). 화면에서만 맞춘다 — DB 는 막지 않는다.

/** 메뉴 한 줄의 칸 key */
export const rowKeys = (row: MatrixRow) => row.cells.map(c => permissionKey(row.menuKey, c.action));

/** 기능 한 칸(세로)의 칸 key — 그 기능이 없는 메뉴는 빠진다 */
export const columnKeys = (rows: readonly MatrixRow[], action: PermissionAction) =>
  rows.flatMap(r =>
    r.cells.filter(c => c.action === action).map(() => permissionKey(r.menuKey, action))
  );

export type BulkState = { checked: boolean; indeterminate: boolean };

/** 머리 체크의 모양 — 모두 켜짐 · 일부 · 없음. 칸이 하나도 없으면 null(머리 체크를 그리지 않는다) */
export const bulkState = (
  keys: readonly string[],
  checked: ReadonlySet<string>
): BulkState | null => {
  if (keys.length === 0) return null;
  const on = keys.filter(k => checked.has(k)).length;
  return { checked: on === keys.length, indeterminate: on > 0 && on < keys.length };
};

/**
 * 준 key 를 켜거나 끈 새 집합 — 칸 하나 · 줄 · 기능 칸 모두 이것으로. 표에 없는 칸 key 는 버린다.
 * 조회가 아닌 칸을 켜면 그 줄의 조회도 켜고(그 메뉴에 조회가 있을 때), 조회를 끄면 그 줄의 다른 칸도 끈다.
 */
export const toggleCells = (
  rows: readonly MatrixRow[],
  checked: ReadonlySet<string>,
  keys: readonly string[],
  on: boolean
) => {
  const cells = new Map(rows.flatMap(r => rowKeys(r).map(k => [k, r] as const)));
  const next = new Set(checked);
  keys.forEach(key => {
    const row = cells.get(key);
    if (!row) return;
    const read = permissionKey(row.menuKey, 'READ');
    if (on) {
      next.add(key);
      if (key !== read && cells.has(read)) next.add(read);
    } else if (key === read) {
      rowKeys(row).forEach(k => next.delete(k));
    } else {
      next.delete(key);
    }
  });
  return next;
};

/** 그 메뉴에 없는 기능(«–») 칸의 설명 */
export const NO_ACTION = '이 메뉴에는 없는 기능입니다';
