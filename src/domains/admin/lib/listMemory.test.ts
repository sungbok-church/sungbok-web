import { describe, expect, it } from 'vitest';

import { neighbors, readListMemory, saveListMemory } from './listMemory';

const store = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};

describe('listMemory', () => {
  it('마지막으로 본 목록 주소(조건 · 쪽)와 그 쪽의 줄 순서를 기억한다', () => {
    const s = store();
    saveListMemory(s, '/admin/users', { href: '/admin/users?q=홍&page=2', ids: ['a', 'b', 'c'] });
    expect(readListMemory(s, '/admin/users')).toEqual({
      href: '/admin/users?q=홍&page=2',
      ids: ['a', 'b', 'c'],
    });
  });

  it('기억한 것이 없거나 다른 목록 주소면 기본 목록으로', () => {
    const s = store();
    expect(readListMemory(s, '/admin/users')).toEqual({ href: '/admin/users', ids: [] });
    s.setItem('admin-list:/admin/users', JSON.stringify({ href: 'https://evil.example', ids: [] }));
    expect(readListMemory(s, '/admin/users').href).toBe('/admin/users');
  });

  it('이전 · 다음 항목(그 쪽 안에서)', () => {
    expect(neighbors(['a', 'b', 'c'], 'b')).toEqual({ prev: 'a', next: 'c' });
    expect(neighbors(['a', 'b', 'c'], 'a')).toEqual({ prev: null, next: 'b' });
    expect(neighbors(['a', 'b', 'c'], 'z')).toEqual({ prev: null, next: null });
  });
});
