// 쓰던 내용 임시 보관(설계 6.10 «편의 기능») — 창이 닫히거나 로그인이 끊겨도 다시 열면 복구할지 묻는다.
// 보안 조건: 사용자별로 두고, 로그아웃 · 저장 성공 때 지우고, 처음 보관한 지 7일이 지나면 버린다.
// 사용자 등록(임시 비밀번호가 오간다) · 새가족 폼은 보관하지 않는다(폼 쪽에서 enabled: false). 사용자 수정 · 그룹은 «내가 바꾼 것» 만
// 보관한다(draftChanges). 저장소를 못 쓰는 브라우저에서도 던지지 않는다.

import { type KeyStorage, removeKeysStartingWith, safely } from './adminStorage';

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = 'admin-draft:';

export const draftKey = (userId: string, formKey: string) => `${PREFIX}${userId}:${formKey}`;

/** 아직 버릴 때가 안 된 보관의 처음 시각 — 없거나 지났거나 깨졌으면 null */
const firstSavedAt = (raw: string | null, now: number): number | null => {
  if (raw === null) return null;
  try {
    const { savedAt } = JSON.parse(raw) as { savedAt?: unknown };
    return typeof savedAt === 'number' && now - savedAt <= DRAFT_TTL_MS ? savedAt : null;
  } catch {
    return null;
  }
};

/**
 * 7일은 처음 보관한 때부터 센다(savedAt 을 이어받는다) — 고칠 때마다 늘면 안 된다. 올린 파일은 글을 저장하기 전까지
 * 어느 글에도 붙지 않아 올린 지 8일이 지나면 예약 작업이 지운다(설계 6.9). 보관이 그보다 오래 살면 «불러오기» 한 글이
 * 지워진 그림을 가리킨 채 저장된다.
 */
export const writeDraft = (storage: KeyStorage, key: string, values: unknown, now: number) =>
  safely(() => {
    const savedAt = firstSavedAt(storage.getItem(key), now) ?? now;
    storage.setItem(key, JSON.stringify({ savedAt, values }));
  }, undefined);

export const readDraft = <T>(storage: KeyStorage, key: string, now: number): T | null =>
  safely(() => {
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

export const removeDraft = (storage: KeyStorage, key: string) =>
  safely(() => storage.removeItem(key), undefined);

/** 로그아웃 때 그 사용자의 임시 보관을 모두 지운다(공용 PC 에 남지 않게). */
export const clearDrafts = (storage: KeyStorage, userId: string) =>
  removeKeysStartingWith(storage, `${PREFIX}${userId}:`);
