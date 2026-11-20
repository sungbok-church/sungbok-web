'use client';

// 관리자 폼의 보조 동작(설계 6.10 «편의 기능») — 각 폼은 TanStack Form 의 useForm 을 직접 쓰고 이것들을 붙인다.
//   · useUnsavedGuard: 바뀐 내용이 있으면 창을 닫거나 새로고침할 때 브라우저가 경고한다.
//   · useSaveShortcut: Ctrl/⌘+S 로 저장(브라우저의 «페이지 저장» 대신).
//   · useFormDraft: 쓰던 내용 임시 보관(formDraft — 사용자별 · 7일 · 로그아웃 때 지움).
import { useCallback, useEffect, useRef, useState } from 'react';

import { draftKey, readDraft, removeDraft, writeDraft } from './formDraft';

const SAVE_DELAY_MS = 500;

export const useUnsavedGuard = (dirty: boolean) => {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 오래된 브라우저는 returnValue 가 있어야 묻는다
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
};

export const useSaveShortcut = (save: () => void) => {
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};

type DraftOptions<T> = {
  userId: string;
  formKey: string;
  values: T;
  dirty: boolean;
  /** false 면 읽지도 쓰지도 않는다(사용자 등록 · 새가족 폼) */
  enabled: boolean;
};

export const useFormDraft = <T>({ userId, formKey, values, dirty, enabled }: DraftOptions<T>) => {
  const key = draftKey(userId, formKey);
  const [saved, setSaved] = useState<T | null>(() =>
    enabled && typeof window !== 'undefined'
      ? readDraft<T>(window.localStorage, key, Date.now())
      : null
  );

  // 바뀐 내용을 잠시 뒤 보관한다(입력할 때마다 쓰지 않게)
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || !dirty) return;
    const timer = window.setTimeout(
      () => writeDraft(window.localStorage, key, JSON.parse(serialized), Date.now()),
      SAVE_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [enabled, dirty, key, serialized]);

  const discard = useCallback(() => {
    removeDraft(window.localStorage, key);
    setSaved(null);
  }, [key]);

  const restore = useCallback(
    (apply: (values: T) => void) => {
      if (saved !== null) apply(saved);
      discard();
    },
    [saved, discard]
  );

  return { available: saved !== null, restore, discard, clear: discard };
};
