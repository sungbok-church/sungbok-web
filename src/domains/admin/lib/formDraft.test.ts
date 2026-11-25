import { describe, expect, it } from 'vitest';

import { clearDrafts, DRAFT_TTL_MS, draftKey, readDraft, writeDraft } from './formDraft';

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

describe('formDraft', () => {
  const now = Date.UTC(2026, 10, 19);

  it('사용자 · 폼마다 따로 둔다', () => {
    expect(draftKey('u1', 'groups:new')).toBe('admin-draft:u1:groups:new');
  });

  it('쓴 내용을 다시 읽는다', () => {
    const s = memoryStorage();
    writeDraft(s, draftKey('u1', 'f'), { name: '새 그룹' }, now);
    expect(readDraft(s, draftKey('u1', 'f'), now + 1000)).toEqual({ name: '새 그룹' });
  });

  it('7일이 지나면 버리고 지운다', () => {
    const s = memoryStorage();
    const key = draftKey('u1', 'f');
    writeDraft(s, key, { a: 1 }, now);
    expect(DRAFT_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(readDraft(s, key, now + DRAFT_TTL_MS + 1)).toBeNull();
    expect(s.map.has(key)).toBe(false);
  });

  it('7일은 처음 보관한 때부터 — 고칠 때마다 늘지 않는다(올린 파일은 8일 뒤 지워지므로, 불러온 글의 그림이 깨지지 않게)', () => {
    const s = memoryStorage();
    const key = draftKey('u1', 'f');
    const day = 24 * 60 * 60 * 1000;
    writeDraft(s, key, { a: 1 }, now);
    writeDraft(s, key, { a: 2 }, now + 3 * day);
    expect(readDraft(s, key, now + 6 * day)).toEqual({ a: 2 });
    expect(readDraft(s, key, now + DRAFT_TTL_MS + 1)).toBeNull();
  });

  it('지난(버릴) 보관 위에 다시 쓰면 그때부터 7일', () => {
    const s = memoryStorage();
    const key = draftKey('u1', 'f');
    writeDraft(s, key, { a: 1 }, now);
    const later = now + DRAFT_TTL_MS + 1000;
    writeDraft(s, key, { a: 2 }, later);
    expect(readDraft(s, key, later + 1000)).toEqual({ a: 2 });
  });

  it('깨진 값은 버리고 지운다', () => {
    const s = memoryStorage();
    s.setItem('admin-draft:u1:f', '{not json');
    expect(readDraft(s, 'admin-draft:u1:f', now)).toBeNull();
    expect(s.map.size).toBe(0);
  });

  it('로그아웃하면 그 사용자의 것만 지운다', () => {
    const s = memoryStorage();
    writeDraft(s, draftKey('u1', 'a'), {}, now);
    writeDraft(s, draftKey('u1', 'b'), {}, now);
    writeDraft(s, draftKey('u2', 'a'), {}, now);
    s.setItem('other', 'x');
    clearDrafts(s, 'u1');
    expect([...s.map.keys()].sort()).toEqual(['admin-draft:u2:a', 'other']);
  });

  it('저장소를 쓸 수 없는 브라우저에서도 던지지 않는다', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      key: () => null,
      get length(): number {
        throw new Error('blocked');
      },
    };
    expect(readDraft(broken, 'k', now)).toBeNull();
    expect(() => writeDraft(broken, 'k', {}, now)).not.toThrow();
    expect(() => clearDrafts(broken, 'u1')).not.toThrow();
  });
});
