import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isTypingTarget, useCommandShortcut, useKeyShortcut } from './useKeyShortcut';

afterEach(() => {
  document.body.innerHTML = '';
});

const typingTargets = () => {
  const input = document.createElement('input');
  const textarea = document.createElement('textarea');
  const select = document.createElement('select');
  const area = document.createElement('div');
  area.setAttribute('contenteditable', 'true');
  document.body.append(input, textarea, select, area);
  return [input, textarea, select, area];
};

describe('isTypingTarget — 글을 쓰는 칸인가', () => {
  it('입력칸 · 여러 줄 칸 · 고르기 · 편집 영역은 글을 쓰는 칸', () => {
    for (const el of typingTargets()) expect(isTypingTarget(el)).toBe(true);
  });

  it('버튼 · 빈 곳 · 창(window)은 아니다', () => {
    const button = document.createElement('button');
    document.body.append(button);
    expect(isTypingTarget(button)).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('useKeyShortcut', () => {
  const slash = (e: KeyboardEvent) => e.key === '/';

  it('누르고 있어 반복되는 키는 부르지 않는다(기본 동작은 막는다 — 길게 눌러 두 번 저장되지 않게)', () => {
    const run = vi.fn();
    renderHook(() => useKeyShortcut(slash, run));
    const first = fireEvent.keyDown(window, { key: '/' });
    const repeated = fireEvent.keyDown(window, { key: '/', repeat: true });
    expect(run).toHaveBeenCalledTimes(1);
    expect(first).toBe(false);
    expect(repeated).toBe(false);
  });

  it('맞는 키면 부르고 브라우저 기본 동작을 막는다', () => {
    const run = vi.fn();
    renderHook(() => useKeyShortcut(slash, run));
    expect(fireEvent.keyDown(window, { key: '/' })).toBe(false);
    fireEvent.keyDown(window, { key: 'a' });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('글을 쓰는 칸 안에서는 부르지 않는다 — whileTyping 이면 그 안에서도', () => {
    const run = vi.fn();
    const always = vi.fn();
    renderHook(() => useKeyShortcut(slash, run));
    renderHook(() => useKeyShortcut(slash, always, { whileTyping: true }));
    for (const el of typingTargets()) fireEvent.keyDown(el, { key: '/' });
    expect(run).not.toHaveBeenCalled();
    expect(always).toHaveBeenCalledTimes(4);
  });

  it('늘 마지막에 넘긴 함수를 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ run }) => useKeyShortcut(slash, run), {
      initialProps: { run: first },
    });
    rerender({ run: second });
    fireEvent.keyDown(window, { key: '/' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useCommandShortcut', () => {
  it('⌘K · Ctrl+K 로 연다', () => {
    const open = vi.fn();
    renderHook(() => useCommandShortcut(open));
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.keyDown(window, { key: 'K', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'k' });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('글을 쓰는 칸 안에서는 열지 않는다(그 칸의 단축키를 빼앗지 않게)', () => {
    const open = vi.fn();
    renderHook(() => useCommandShortcut(open));
    for (const el of typingTargets()) fireEvent.keyDown(el, { key: 'k', metaKey: true });
    expect(open).not.toHaveBeenCalled();
  });
});
