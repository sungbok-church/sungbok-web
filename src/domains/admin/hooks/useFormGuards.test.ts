import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { draftKey, writeDraft } from '../lib/formDraft';
import { useFormDraft, useSaveShortcut, useUnsavedGuard } from './useFormGuards';

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('useUnsavedGuard', () => {
  it('바뀐 내용이 있으면 창을 닫을 때 경고한다', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedGuard(dirty), {
      initialProps: { dirty: false },
    });
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    rerender({ dirty: true });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe('useSaveShortcut', () => {
  it('Ctrl+S · ⌘+S 로 저장하고 브라우저의 «페이지 저장» 을 막는다', () => {
    const save = vi.fn();
    renderHook(() => useSaveShortcut(save));
    expect(fireEvent.keyDown(window, { key: 's', ctrlKey: true })).toBe(false);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    fireEvent.keyDown(window, { key: 's' });
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe('useFormDraft', () => {
  const key = draftKey('u1', 'groups:new');

  it('보관된 내용이 있으면 알려 주고, 불러오면 넘겨준 뒤 지운다', () => {
    writeDraft(window.localStorage, key, { name: '쓰던 이름' }, Date.now());
    const restore = vi.fn();
    const { result } = renderHook(() =>
      useFormDraft({
        userId: 'u1',
        formKey: 'groups:new',
        values: { name: '' },
        dirty: false,
        enabled: true,
      })
    );
    expect(result.current.available).toBe(true);
    act(() => result.current.restore(restore));
    expect(restore).toHaveBeenCalledWith({ name: '쓰던 이름' });
    expect(result.current.available).toBe(false);
  });

  it('바뀐 내용은 잠시 뒤 보관하고, 저장하면(clear) 지운다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ values }) =>
        useFormDraft({ userId: 'u1', formKey: 'groups:new', values, dirty: true, enabled: true }),
      { initialProps: { values: { name: 'a' } } }
    );
    rerender({ values: { name: 'ab' } });
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('"ab"');
    act(() => result.current.clear());
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('보관하지 않는 폼(enabled=false)은 읽지도 쓰지도 않는다', () => {
    vi.useFakeTimers();
    writeDraft(window.localStorage, key, { name: 'x' }, Date.now());
    const { result } = renderHook(() =>
      useFormDraft({
        userId: 'u1',
        formKey: 'groups:new',
        values: { name: 'y' },
        dirty: true,
        enabled: false,
      })
    );
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.available).toBe(false);
    expect(window.localStorage.getItem(key)).toContain('"x"');
  });
});
