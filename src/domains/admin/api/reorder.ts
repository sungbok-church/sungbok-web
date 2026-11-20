// 메뉴 · 코드의 «위로 / 아래로»(설계 6.5 · 6.10). 목록(지금 순서대로)에서 한 줄을 옮기고, 순서 값을 10 간격으로 다시 매겨
// 바뀐 줄만 돌려준다 — 처음 넣은 코드처럼 순서 값이 모두 같아도 옮길 수 있다.
export type Sorted = { id: string; sort: number };

export const moveItem = (items: readonly Sorted[], id: string, dir: 'up' | 'down'): Sorted[] => {
  const from = items.findIndex(i => i.id === id);
  const to = dir === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= items.length) return [];
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next
    .map((item, index) => ({ id: item.id, sort: (index + 1) * 10 }))
    .filter(item => items.find(i => i.id === item.id)?.sort !== item.sort);
};
