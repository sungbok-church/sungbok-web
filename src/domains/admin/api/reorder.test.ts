import { describe, expect, it } from 'vitest';

import { moveItem } from './reorder';

const items = [
  { id: 'a', sort: 10 },
  { id: 'b', sort: 20 },
  { id: 'c', sort: 30 },
];

describe('moveItem', () => {
  it('위로 — 바뀐 줄만 돌려준다', () => {
    expect(moveItem(items, 'b', 'up')).toEqual([
      { id: 'b', sort: 10 },
      { id: 'a', sort: 20 },
    ]);
  });

  it('아래로', () => {
    expect(moveItem(items, 'b', 'down')).toEqual([
      { id: 'c', sort: 20 },
      { id: 'b', sort: 30 },
    ]);
  });

  it('끝에서는 바뀌는 것이 없다', () => {
    expect(moveItem(items, 'a', 'up')).toEqual([]);
    expect(moveItem(items, 'c', 'down')).toEqual([]);
    expect(moveItem(items, 'zz', 'up')).toEqual([]);
  });

  it('순서 값이 같거나 섞여 있으면 10 간격으로 다시 매긴다(들어온 순서를 유지)', () => {
    const flat = [
      { id: 'a', sort: 0 },
      { id: 'b', sort: 0 },
      { id: 'c', sort: 0 },
    ];
    expect(moveItem(flat, 'c', 'up')).toEqual([
      { id: 'a', sort: 10 },
      { id: 'c', sort: 20 },
      { id: 'b', sort: 30 },
    ]);
  });
});
