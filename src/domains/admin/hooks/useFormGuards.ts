'use client';

// 관리자 폼의 보조 동작(설계 6.10 «편의 기능») — 각 폼은 TanStack Form 의 useForm 을 직접 쓰고 이것들을 붙인다.
//   · useUnsavedGuard: 바뀐 내용이 있으면 창을 닫거나 새로고침할 때 브라우저가 경고한다.
//   · useSaveShortcut: Ctrl/⌘+S 로 저장(브라우저의 «페이지 저장» 대신 — 단축키는 useKeyShortcut).
//   · useFormDraft: 쓰던 내용 임시 보관(formDraft — 사용자별 · 7일 · 로그아웃 때 지움).
import { useCallback, useEffect, useRef, useState } from 'react';

import { DRAFT_TTL_MS, draftKey, readDraftEntry, removeDraft, writeDraft } from '../lib/formDraft';
import { useKeyShortcut, withModifier } from './useKeyShortcut';

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

/** 글을 쓰는 중에도 — 폼의 칸 안에서 누르는 단축키다 */
export const useSaveShortcut = (save: () => void) =>
  useKeyShortcut(withModifier('s'), save, { whileTyping: true });

type DraftOptions<T> = {
  userId: string;
  formKey: string;
  values: T;
  dirty: boolean;
  /** 한 번도 켜지지 않으면 읽지도 쓰지도 않는다(사용자 등록 · 새가족 폼). 한 번 켜지면 그 칸은 계속 보관한다 */
  enabled: boolean;
};

export const useFormDraft = <T>({ userId, formKey, values, dirty, enabled }: DraftOptions<T>) => {
  const key = draftKey(userId, formKey);
  const read = () =>
    enabled && typeof window !== 'undefined'
      ? readDraftEntry<T>(window.localStorage, key, Date.now())
      : null;
  const [saved, setSaved] = useState<{ values: T; savedAt: number } | null>(read);
  const serialized = JSON.stringify(values);
  // 사용자를 나중에 받는 폼(새 글 — 폼을 미리 만든 틀에 그리고 사용자는 오는 대로, ADR 0027): 보관 칸이 정해지면 그때 읽는다.
  // 서버 값(날짜 · 하나뿐인 분류)을 프로그램이 채우는 폼은 다 채운 뒤에 enabled 를 켠다 — 채우는 값이 «고친 것» 이 되지 않게.
  // enabled 는 «준비됨» 신호로 한 번만 받는다 — 한 번 켜진 칸(readFor)은 enabled 가 다시 꺼져도(날짜를 비움 등) 그대로 보관한다
  // (다시 읽으면 방금 쓴 글이 «보관된 글» 로 뜬다). 그리는 중에 맞춘다 — 보관 쓰기(아래 효과)보다 먼저.
  // 읽을 때 이미 쓰고 있던 글은 알림을 보기 전에 쓴 것이라, 그 뒤에 고치기 전까지는 옛 보관을 덮어쓰지 않는다(알림을 보고 고르게)
  const [readFor, setReadFor] = useState(enabled ? key : null);
  const [heldAt, setHeldAt] = useState<string | null>(null);
  if (enabled && key !== readFor) {
    setReadFor(key);
    const found = read();
    setSaved(found);
    setHeldAt(found ? serialized : null);
  }
  // 한 번 고쳐 벗어나면 보류를 푼다(알림 때의 글로 되돌려도 다시 걸지 않는다) — 위에서 방금 읽은 렌더는 건너뛴다
  else if (heldAt !== null && heldAt !== serialized) setHeldAt(null);
  const holding = heldAt !== null;
  // 이 글을 처음 보관한 때 — 7일은 여기서부터 센다(formDraft.writeDraft). 불러오면 그 보관의 시각을 이어받고,
  // 버리거나 저장하면 끊는다. 알림을 두고 새로 쓰면 새 흐름이다
  const origin = useRef<number | null>(null);

  // 바뀐 내용을 잠시 뒤 보관한다(입력할 때마다 쓰지 않게). 처음 보관한 지 7일이 지난 흐름은 더 보관하지 않는다
  useEffect(() => {
    if (readFor !== key || !dirty || holding) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      origin.current ??= now;
      // 지난 흐름 — 남은 보관도 어차피 버릴 것이라 지운다
      if (now - origin.current > DRAFT_TTL_MS) return removeDraft(window.localStorage, key);
      writeDraft(window.localStorage, key, JSON.parse(serialized), origin.current);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [readFor, dirty, holding, key, serialized]);

  const drop = useCallback(() => {
    removeDraft(window.localStorage, key);
    setSaved(null);
    setHeldAt(null);
  }, [key]);

  const discard = useCallback(() => {
    origin.current = null;
    drop();
  }, [drop]);

  const restore = useCallback(
    (apply: (values: T) => void) => {
      // 알림을 띄운 채 7일이 지났으면 버린다 — 그사이 올린 파일이 지워졌을 수 있다
      if (saved !== null && Date.now() - saved.savedAt <= DRAFT_TTL_MS) {
        origin.current = saved.savedAt;
        apply(saved.values);
      }
      drop();
    },
    [saved, drop]
  );

  return { available: saved !== null, restore, discard, clear: discard };
};
