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

  // 7일은 처음 보관한 때부터 — 올린 파일은 글을 저장하기 전까지 어느 글에도 붙지 않아 올린 지 8일이면 예약 작업이 지운다.
  // 보관이 그보다 오래 살면(불러올 때마다 다시 세면) 불러온 글이 지워진 그림을 가리킨 채 저장된다.
  const day = 24 * 60 * 60 * 1000;
  const stored = () =>
    JSON.parse(window.localStorage.getItem(key) ?? 'null') as { savedAt: number } | null;

  it('불러온 뒤 고쳐 써도 보관 시각은 처음 보관한 때 그대로', () => {
    vi.useFakeTimers();
    const first = Date.now() - 6 * day;
    writeDraft(window.localStorage, key, { name: '쓰던 이름' }, first);
    const { result, rerender } = renderHook(
      ({ values, dirty }) =>
        useFormDraft({ userId: 'u1', formKey: 'groups:new', values, dirty, enabled: true }),
      { initialProps: { values: { name: '' }, dirty: false } }
    );
    act(() => result.current.restore(() => {}));
    rerender({ values: { name: '쓰던 이름 더' }, dirty: true });
    act(() => vi.advanceTimersByTime(600));
    expect(stored()?.savedAt).toBe(first);
  });

  it('알림을 띄운 채 7일이 지나면 불러오지 않고 버린다(그사이 올린 파일이 지워졌을 수 있다)', () => {
    vi.useFakeTimers();
    writeDraft(window.localStorage, key, { name: '쓰던 이름' }, Date.now() - 6 * day);
    const apply = vi.fn();
    const { result } = renderHook(() =>
      useFormDraft({
        userId: 'u1',
        formKey: 'groups:new',
        values: { name: '' },
        dirty: false,
        enabled: true,
      })
    );
    act(() => vi.advanceTimersByTime(2 * day));
    act(() => result.current.restore(apply));
    expect(apply).not.toHaveBeenCalled();
    expect(result.current.available).toBe(false);
    expect(stored()).toBeNull();
  });

  it('알림을 두고 새로 쓰면 그때부터 7일(옛 보관의 시각을 이어받지 않는다)', () => {
    vi.useFakeTimers();
    writeDraft(window.localStorage, key, { name: '옛 글' }, Date.now() - 6.9 * day);
    const { rerender } = renderHook(
      ({ values, dirty }) =>
        useFormDraft({ userId: 'u1', formKey: 'groups:new', values, dirty, enabled: true }),
      { initialProps: { values: { name: '' }, dirty: false } }
    );
    const before = Date.now();
    rerender({ values: { name: '새 글' }, dirty: true });
    act(() => vi.advanceTimersByTime(600));
    expect(stored()?.savedAt).toBeGreaterThanOrEqual(before);
  });

  it('처음 보관한 지 7일이 지난 흐름은 더 보관하지 않는다(창을 오래 열어 둔 채 고쳐도)', () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ values }) =>
        useFormDraft({ userId: 'u1', formKey: 'groups:new', values, dirty: true, enabled: true }),
      { initialProps: { values: { name: 'a' } } }
    );
    act(() => vi.advanceTimersByTime(600));
    expect(stored()).not.toBeNull();
    act(() => vi.advanceTimersByTime(7 * day + 1000));
    rerender({ values: { name: 'ab' } });
    act(() => vi.advanceTimersByTime(600));
    expect(stored()).toBeNull();
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

  it('사용자를 나중에 받으면(새 글 폼 — ADR 0027) 그때 보관을 읽어 알려 주고, 받기 전에 쓴 글자로 덮어쓰지 않는다', () => {
    vi.useFakeTimers();
    writeDraft(window.localStorage, key, { name: '쓰던 이름' }, Date.now());
    const { result, rerender } = renderHook(
      ({ userId, enabled, values, dirty }) =>
        useFormDraft({ userId, formKey: 'groups:new', values, dirty, enabled }),
      { initialProps: { userId: '', enabled: false, values: { name: '' }, dirty: false } }
    );
    expect(result.current.available).toBe(false);
    // 받기 전에 한 글자 쳤다
    rerender({ userId: '', enabled: false, values: { name: '새' }, dirty: true });
    // 사용자가 왔다 — 바로 보관을 읽어 알린다
    rerender({ userId: 'u1', enabled: true, values: { name: '새' }, dirty: true });
    expect(result.current.available).toBe(true);
    // 알림을 두고 있는 동안은 지금 글로 옛 보관을 덮어쓰지 않는다
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('쓰던 이름');
    const restore = vi.fn();
    act(() => result.current.restore(restore));
    expect(restore).toHaveBeenCalledWith({ name: '쓰던 이름' });
  });

  it('한 번 켜진 뒤 다시 꺼져도(날짜를 비움 등) 보관을 다시 읽지 않고 계속 보관한다 — 내가 쓴 글이 «보관된 글» 로 뜨지 않게', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ enabled, values }) =>
        useFormDraft({ userId: 'u1', formKey: 'groups:new', values, dirty: true, enabled }),
      { initialProps: { enabled: true, values: { name: '하나' } } }
    );
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('하나');
    rerender({ enabled: false, values: { name: '' } });
    rerender({ enabled: true, values: { name: '둘' } });
    expect(result.current.available).toBe(false);
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('둘');
  });

  it('보류 중 고쳤다가 알림 때의 글로 되돌려도 보류를 다시 걸지 않는다(보관이 화면과 어긋나지 않게)', () => {
    vi.useFakeTimers();
    writeDraft(window.localStorage, key, { name: '옛 글' }, Date.now());
    const { rerender } = renderHook(
      ({ userId, enabled, values }) =>
        useFormDraft({ userId, formKey: 'groups:new', values, dirty: true, enabled }),
      { initialProps: { userId: '', enabled: false, values: { name: 'a' } } }
    );
    rerender({ userId: 'u1', enabled: true, values: { name: 'a' } });
    rerender({ userId: 'u1', enabled: true, values: { name: 'ab' } });
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('"ab"');
    rerender({ userId: 'u1', enabled: true, values: { name: 'a' } });
    act(() => vi.advanceTimersByTime(600));
    expect(window.localStorage.getItem(key)).toContain('"a"');
  });
});
