// 사용자 폼의 그룹 고르기 · 저장 전 확인(설계 6.4 ②). «전체 관리» 는 어느 그룹이든, 그 밖의 사용자 관리자는 자기가 속한 그룹에만
// 사람을 넣고 뺀다 — DB 의 guard_user_groups 가 같은 규칙으로 다시 막는다. 남의 그룹에 속한 사람은 관리하지 못해(can_manage_user)
// 수정 화면이 열리지 않는다. «전체 관리» 소속은 화면에서 아무도 바꾸지 않는다 — 이미 속했으면 잠긴 채 보여 주고 그대로 둔다.

/** 로그인한 사람의 그룹 소속 — loadMyGroups. groupIds 는 시스템 그룹(«전체 관리»)을 뺀 내 그룹 */
export type MyGroups = { fullAdmin: boolean; groupIds: readonly string[] };

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
};

export type GroupOption = {
  id: string;
  name: string;
  description: string | null;
  /** 화면에서 바꾸지 않는 그룹(대상이 이미 속한 «전체 관리») — 체크된 채 잠가 그대로 둔다 */
  locked: boolean;
};

/**
 * 고를 수 있는 그룹 — 켜진 그룹(꺼진 그룹은 대상이 속했을 때만). «전체 관리» 가 아니면 내 그룹만.
 * «전체 관리» 그룹은 고를 거리가 아니다 — 대상이 이미 속했으면 잠긴 채 보인다.
 */
export const groupChoices = (
  groups: readonly GroupRow[],
  mine: MyGroups,
  memberOf: readonly string[]
): GroupOption[] =>
  groups
    .filter(g => g.is_active || memberOf.includes(g.id))
    .flatMap((g): GroupOption[] => {
      const option = { id: g.id, name: g.name, description: g.description };
      if (g.is_system) return memberOf.includes(g.id) ? [{ ...option, locked: true }] : [];
      return mine.fullAdmin || mine.groupIds.includes(g.id) ? [{ ...option, locked: false }] : [];
    });

/** before → after 에서 «전체 관리» 그룹(systemIds)을 넣거나 빼는가 — 화면에서는 아무도 바꾸지 않는다 */
export const touchesSystemGroup = (
  systemIds: readonly string[],
  before: readonly string[],
  after: readonly string[]
): boolean => systemIds.some(id => before.includes(id) !== after.includes(id));

/** before → after 에서 넣거나 뺀 그룹 중 내가 바꿀 수 없는 것(«전체 관리» 면 늘 없음) */
export const outsideGroups = (
  mine: MyGroups,
  before: readonly string[],
  after: readonly string[]
): string[] => {
  if (mine.fullAdmin) return [];
  const changed = [
    ...after.filter(id => !before.includes(id)),
    ...before.filter(id => !after.includes(id)),
  ];
  return [...new Set(changed)].filter(id => !mine.groupIds.includes(id));
};
