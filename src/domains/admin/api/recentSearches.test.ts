import { describe, expect, it } from 'vitest';

import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  RECENT_LIMIT,
  recentKey,
} from './recentSearches';

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    map,
  };
};

describe('recentSearches', () => {
  const key = recentKey('u1', '/admin/users');

  it('사용자 · 목록마다 따로', () => {
    expect(key).toBe('admin-recent:u1:/admin/users');
  });

  it('최근 것이 앞, 같은 조건은 한 번만, 5개까지', () => {
    const s = memoryStorage();
    expect(RECENT_LIMIT).toBe(5);
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f'])
      pushRecentSearch(s, key, { query: `q=${q}`, label: q });
    pushRecentSearch(s, key, { query: 'q=c', label: 'c' });
    expect(readRecentSearches(s, key).map(r => r.label)).toEqual(['c', 'f', 'e', 'd', 'b']);
  });

  it('조건이 없는 조회(빈 query)는 남기지 않는다', () => {
    const s = memoryStorage();
    pushRecentSearch(s, key, { query: '', label: '' });
    expect(readRecentSearches(s, key)).toEqual([]);
  });

  it('깨진 값은 빈 목록', () => {
    const s = memoryStorage();
    s.setItem(key, '{bad');
    expect(readRecentSearches(s, key)).toEqual([]);
  });

  it('로그아웃하면 그 사용자의 것만 지운다', () => {
    const s = memoryStorage();
    pushRecentSearch(s, key, { query: 'q=a', label: 'a' });
    pushRecentSearch(s, recentKey('u2', '/admin/users'), { query: 'q=b', label: 'b' });
    clearRecentSearches(s, 'u1');
    expect([...s.map.keys()]).toEqual(['admin-recent:u2:/admin/users']);
  });

  it('저장소를 못 쓰는 브라우저에서도 던지지 않는다', () => {
    const broken = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
      removeItem: () => {
        throw new Error('x');
      },
      key: () => null,
      get length(): number {
        throw new Error('x');
      },
    };
    expect(readRecentSearches(broken, key)).toEqual([]);
    expect(() => pushRecentSearch(broken, key, { query: 'q=a', label: 'a' })).not.toThrow();
    expect(() => clearRecentSearches(broken, 'u1')).not.toThrow();
  });
});
