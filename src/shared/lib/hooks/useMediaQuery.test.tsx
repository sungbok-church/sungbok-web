import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './useMediaQuery';

type Listener = () => void;

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    set(next: boolean) {
      matches = next;
      listeners.forEach(l => l());
    },
  };
}

function Probe() {
  return <span>{useMediaQuery('(max-width: 767px)') ? 'narrow' : 'wide'}</span>;
}

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery', () => {
  it('서버 HTML 에서는 false — 하이드레이션 첫 렌더와 맞춘다', () => {
    mockMatchMedia(true);
    expect(renderToString(<Probe />)).toContain('wide');
  });

  it('화면에서는 실제 값, 폭이 바뀌면 따라간다', () => {
    const media = mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    act(() => media.set(false));
    expect(result.current).toBe(false);
  });
});
