// 임시저장(formDraft)에 담을 «내가 바꾼 것» — 화면 전체를 담으면, «다른 사람이 먼저 고쳤습니다» 로 새로고침한 뒤
// 불러올 때 그 사이 다른 사람이 바꾼 칸 · 목록까지 옛 값으로 덮는다. 바꾼 칸과 넣은 것 · 뺀 것만 담아 새 화면 위에 얹는다.

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** 열었을 때(initial)와 다른 칸만 */
export const changedFields = <T extends Record<string, unknown>>(
  initial: T,
  values: T
): Partial<T> =>
  Object.fromEntries(Object.entries(values).filter(([k, v]) => !same(initial[k], v))) as Partial<T>;

export type SetChanges = { added: string[]; removed: string[] };

/** 열었을 때의 목록(seen)과 지금 목록(current)을 비교해 넣은 것 · 뺀 것 */
export const setChanges = (seen: Iterable<string>, current: Iterable<string>): SetChanges => {
  const before = new Set(seen);
  const after = new Set(current);
  return {
    added: [...after].filter(x => !before.has(x)),
    removed: [...before].filter(x => !after.has(x)),
  };
};

/**
 * 새로 받은 목록(base)에 내 변경만 얹는다 — 그 사이 다른 사람이 넣은 · 뺀 것은 그대로.
 * only 가 주어지면 그 안의 것만 바꾼다 — 옛 임시저장이 지금은 바꿀 수 없는 것(잠긴 · 없어진 항목)을 건드려 저장마다 막히지 않게.
 */
export const applySetChanges = (
  base: Iterable<string>,
  changes: SetChanges,
  only?: Iterable<string>
): Set<string> => {
  const allowed = only ? new Set(only) : null;
  const can = (x: string) => !allowed || allowed.has(x);
  const next = new Set(base);
  for (const x of changes.removed) if (can(x)) next.delete(x);
  for (const x of changes.added) if (can(x)) next.add(x);
  return next;
};
