// 쓰던 내용 임시 보관(설계 6.10 «편의 기능») — 창이 닫히거나 로그인이 끊겨도 다시 열면 복구할지 묻는다.
// 보안 조건: 사용자별로 두고, 로그아웃 · 저장 성공 때 지우고, 7일이 지나면 버린다.
// 사용자(비밀번호) · 새가족 폼은 보관하지 않는다(폼 쪽에서 draft={false}). 저장소를 못 쓰는 브라우저에서도 던지지 않는다.

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = 'admin-draft:';

export const draftKey = (userId: string, formKey: string) => `${PREFIX}${userId}:${formKey}`;

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const writeDraft = (storage: DraftStorage, key: string, values: unknown, now: number) =>
  safe(() => storage.setItem(key, JSON.stringify({ savedAt: now, values })), undefined);

export const readDraft = <T>(storage: DraftStorage, key: string, now: number): T | null =>
  safe(() => {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as { savedAt?: unknown; values?: unknown };
      if (
        typeof parsed.savedAt === 'number' &&
        now - parsed.savedAt <= DRAFT_TTL_MS &&
        'values' in parsed
      ) {
        return parsed.values as T;
      }
    } catch {
      // 깨진 값 — 아래에서 지운다
    }
    storage.removeItem(key);
    return null;
  }, null);

export const removeDraft = (storage: DraftStorage, key: string) =>
  safe(() => storage.removeItem(key), undefined);

/** 로그아웃 때 그 사용자의 임시 보관을 모두 지운다(공용 PC 에 남지 않게). */
export const clearDrafts = (storage: DraftStorage, userId: string) =>
  safe(() => {
    const mine = `${PREFIX}${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k?.startsWith(mine)) keys.push(k);
    }
    keys.forEach(k => storage.removeItem(k));
  }, undefined);
