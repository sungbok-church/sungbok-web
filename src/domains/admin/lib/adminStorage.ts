// 관리자 화면이 브라우저 저장소(localStorage · sessionStorage)를 쓰는 공통 조각 — 임시 보관(formDraft) · 최근 검색(recentSearches).
// 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 던지지 않는다.

export type KeyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** 저장소 일을 하다 던지면 대신 값(fallback)을 돌려준다 */
export const safely = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** 앞머리(prefix)로 시작하는 열쇠를 모두 지운다 — 로그아웃 때 그 사용자의 것만 지울 때(«admin-draft:<사용자>:»). */
export const removeKeysStartingWith = (storage: KeyStorage, prefix: string) =>
  safely(() => {
    // 지우면서 돌면 순서가 밀린다 — 먼저 모으고 지운다
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => storage.removeItem(k));
  }, undefined);
