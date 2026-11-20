import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCommandShortcut } from './useCommandShortcut';

afterEach(() => {
  document.body.innerHTML = '';
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
    const input = document.createElement('input');
    const area = document.createElement('div');
    area.setAttribute('contenteditable', 'true');
    document.body.append(input, area);
    fireEvent.keyDown(input, { key: 'k', metaKey: true });
    fireEvent.keyDown(area, { key: 'k', metaKey: true });
    expect(open).not.toHaveBeenCalled();
  });
});
