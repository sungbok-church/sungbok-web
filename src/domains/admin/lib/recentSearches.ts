// 목록의 최근 검색 조건 5개(설계 6.10 «목록 편의 기능») — 검색칸을 누르면 펼쳐지고 고르면 그 조건으로 바로 조회한다.
// 사용자 · 목록마다 브라우저에 두고 로그아웃 때 지운다. 개인정보 목록(새가족)은 부르는 쪽이 아예 쓰지 않는다.
// 저장소를 못 쓰는 브라우저에서도 던지지 않는다.

import { type KeyStorage, removeKeysStartingWith, safely } from './adminStorage';

export type RecentSearch = { query: string; label: string };

export const RECENT_LIMIT = 5;
const PREFIX = 'admin-recent:';

export const recentKey = (userId: string, listPath: string) => `${PREFIX}${userId}:${listPath}`;

export const readRecentSearches = (storage: KeyStorage, key: string): RecentSearch[] =>
  safely(() => {
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
export const pushRecentSearch = (storage: KeyStorage, key: string, entry: RecentSearch) => {
  if (!entry.query) return;
  const next = [
    entry,
    ...readRecentSearches(storage, key).filter(r => r.query !== entry.query),
  ].slice(0, RECENT_LIMIT);
  safely(() => storage.setItem(key, JSON.stringify(next)), undefined);
};

/** 로그아웃 때 그 사용자의 최근 검색을 모두 지운다. */
export const clearRecentSearches = (storage: KeyStorage, userId: string) =>
  removeKeysStartingWith(storage, `${PREFIX}${userId}:`);
