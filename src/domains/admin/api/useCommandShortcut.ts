'use client';

// 명령 팔레트 단축키(설계 6.10 «편의 기능») — ⌘K · Ctrl+K. 글을 쓰는 칸 안에서는 그 칸의 단축키를 빼앗지 않는다.
import { useEffect, useRef } from 'react';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.getAttribute('contenteditable') === 'true');

export const useCommandShortcut = (open: () => void) => {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        e.key.toLowerCase() === 'k' &&
        !isEditable(e.target)
      ) {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
