import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// 'use cache' 는 Next 서버(cacheComponents) 안에서만 동작한다 — 테스트에서는 캐시 수명 · 태그 지정(cacheLife · cacheTag)이
// 아무 일도 하지 않게 한다(그대로 부르면 «cacheComponents 설정에서만 쓸 수 있다» 고 던진다). 값을 확인하는 테스트는 vi.mocked 로 본다.
vi.mock('next/cache', async importOriginal => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

// jsdom 미구현 브라우저 API 폴리필 — 스크롤/관찰 기반 컴포넌트
// (useScrollFadeIn / useNearViewport / Reveal 등)가 테스트에서 크래시 없이 돌도록 하네스 레벨에서 제공한다.
// vi.stubGlobal 이 아니라 그냥 대입한다 — 테스트가 vi.unstubAllGlobals() 를 불러도 폴리필은 지워지지 않게
// (지워지면 다음 테스트에서 matchMedia 를 쓰는 컴포넌트가 터진다).
if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly scrollMargin = '';
    readonly thresholds = [];
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
