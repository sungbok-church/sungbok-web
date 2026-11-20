// 목록의 최근 검색 조건 5개(설계 6.10 «목록 편의 기능») — 검색칸을 누르면 펼쳐지고 고르면 그 조건으로 바로 조회한다.
// 사용자 · 목록마다 브라우저에 두고 로그아웃 때 지운다. 개인정보 목록(새가족)은 부르는 쪽이 아예 쓰지 않는다.
// 저장소를 못 쓰는 브라우저에서도 던지지 않는다.

type RecentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export type RecentSearch = { query: string; label: string };

export const RECENT_LIMIT = 5;
const PREFIX = 'admin-recent:';

export const recentKey = (userId: string, listPath: string) => `${PREFIX}${userId}:${listPath}`;

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const readRecentSearches = (storage: RecentStorage, key: string): RecentSearch[] =>
  safe(() => {
    const raw = storage.getItem(key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(
            (r): r is RecentSearch =>
              typeof r === 'object' &&
              r !== null &&
              typeof r.query === 'string' &&
              typeof r.label === 'string'
          )
        : [];
    } catch {
      return [];
    }
  }, []);

/** 맨 앞에 넣는다. 같은 조건(query)이 있으면 앞으로 옮기고, 5개를 넘으면 오래된 것부터 버린다. */
export const pushRecentSearch = (storage: RecentStorage, key: string, entry: RecentSearch) => {
  if (!entry.query) return;
  const next = [
    entry,
    ...readRecentSearches(storage, key).filter(r => r.query !== entry.query),
  ].slice(0, RECENT_LIMIT);
  safe(() => storage.setItem(key, JSON.stringify(next)), undefined);
};

export const clearRecentSearches = (storage: RecentStorage, userId: string) =>
  safe(() => {
    const mine = `${PREFIX}${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k?.startsWith(mine)) keys.push(k);
    }
    keys.forEach(k => storage.removeItem(k));
  }, undefined);
