'use client';

// 관리자 화면의 단축키(설계 6.10 «편의 기능») — 한 곳에서 붙인다.
//   · ⌘K · Ctrl+K: 명령 팔레트(useCommandShortcut)
//   · Ctrl/⌘+S: 폼 저장(useFormGuards 의 useSaveShortcut — 글을 쓰는 중에도)
//   · `/`: 목록의 검색칸(ListToolbar)
// 글을 쓰는 칸 안에서는 그 칸의 입력 · 단축키를 빼앗지 않는다(whileTyping 으로 켠 것만 예외).
import { useEffect, useRef } from 'react';

/** 글을 쓰는 칸(입력칸 · 여러 줄 칸 · 고르기 · 편집 영역)에서 눌렀는가 */
export const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.getAttribute('contenteditable') === 'true');

/** 맞는 키(matches)를 누르면 브라우저 기본 동작을 막고 run 을 부른다. run 은 늘 마지막에 넘긴 것. */
export const useKeyShortcut = (
  matches: (e: KeyboardEvent) => boolean,
  run: () => void,
  { whileTyping = false }: { whileTyping?: boolean } = {}
) => {
  const latest = useRef({ matches, run });
  useEffect(() => {
    latest.current = { matches, run };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!latest.current.matches(e)) return;
      if (!whileTyping && isTypingTarget(e.target)) return;
      e.preventDefault();
      latest.current.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [whileTyping]);
};

/** Ctrl 또는 ⌘ 와 한 글자(Alt 없이) */
export const withModifier = (key: string) => (e: KeyboardEvent) =>
  (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === key;

/** 명령 팔레트 — ⌘K · Ctrl+K */
export const useCommandShortcut = (open: () => void) => useKeyShortcut(withModifier('k'), open);
