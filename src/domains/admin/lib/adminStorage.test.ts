import { describe, expect, it } from 'vitest';

import { removeKeysStartingWith, safely } from './adminStorage';

const memory = (entries: Record<string, string>) => {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
};

describe('safely — 저장소를 못 쓰는 브라우저에서도 던지지 않는다', () => {
  it('되면 그 값, 던지면 대신 값', () => {
    expect(safely(() => 1, 0)).toBe(1);
    expect(
      safely(() => {
        throw new Error('막힘');
      }, 0)
    ).toBe(0);
  });
});

describe('removeKeysStartingWith', () => {
  it('그 앞머리로 시작하는 열쇠만 모두 지운다(지우는 중에 순서가 바뀌어도 빠짐없이)', () => {
    const s = memory({ 'a:u1:x': '1', 'a:u1:y': '2', 'a:u2:x': '3', 'b:u1:x': '4' });
    removeKeysStartingWith(s, 'a:u1:');
    expect([...s.map.keys()]).toEqual(['a:u2:x', 'b:u1:x']);
  });

  it('저장소가 막혀 있어도 던지지 않는다', () => {
    const broken = {
      ...memory({}),
      key: () => {
        throw new Error('막힘');
      },
      get length() {
        return 1;
      },
    };
    expect(() => removeKeysStartingWith(broken, 'a:')).not.toThrow();
  });
});
