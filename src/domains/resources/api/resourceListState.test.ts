import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearDocumentOpen,
  markListReturn,
  rememberListLeave,
  requestDocumentOpen,
  resetResourceListState,
  takeListReturn,
  useResourceListState,
  wasDocumentOpened,
} from './resourceListState';

beforeEach(() => resetResourceListState());

describe('useResourceListState — 목록의 검색어·칩·정렬을 화면 밖에 둔다', () => {
  it('처음은 전체·최신순·검색 없음', () => {
    const { result } = renderHook(() => useResourceListState('sunday'));
    expect(result.current.state).toEqual({ q: '', filter: '', sort: 'new' });
  });

  it('바꾼 조건은 화면을 새로 만들어도(자료를 보고 돌아와도) 그대로다 — 분류마다 따로', () => {
    const first = renderHook(() => useResourceListState('sunday'));
    act(() => first.result.current.setQuery({ q: '도장', sort: 'old' }));
    first.unmount();
    expect(renderHook(() => useResourceListState('sunday')).result.current.state).toEqual({
      q: '도장',
      filter: '',
      sort: 'old',
    });
    expect(renderHook(() => useResourceListState('series')).result.current.state.q).toBe('');
  });

  it('reset — 처음 조건으로', () => {
    const { result } = renderHook(() => useResourceListState('sunday'));
    act(() => result.current.setQuery({ q: 'x', filter: '2026' }));
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ q: '', filter: '', sort: 'new' });
  });
});

describe('목록으로 돌아올 자리', () => {
  it('«자료 목록» 으로 돌아온 것이면 적어 둔 자리(스크롤 위치·누른 자료), 아니면 undefined — 한 번 꺼내면 지워진다', () => {
    rememberListLeave('sunday', { y: 840, id: '0404-40' });
    expect(takeListReturn('sunday')).toBeUndefined(); // 메뉴로 새로 들어온 경우 — 적어 둔 자리도 버린다
    rememberListLeave('sunday', { y: 840, id: '0404-40' });
    markListReturn('sunday');
    expect(takeListReturn('sunday')).toEqual({ y: 840, id: '0404-40' });
    expect(takeListReturn('sunday')).toBeUndefined();
  });

  it('적어 둔 자리 없이 돌아오면 맨 위 — 예배 영상의 시트지 카드로 들어온 자료에서 목록으로 갈 때', () => {
    markListReturn('series');
    expect(takeListReturn('series')).toEqual({ y: 0 });
  });

  it('분류마다 따로 기억한다', () => {
    rememberListLeave('sunday', { y: 300 });
    markListReturn('series');
    expect(takeListReturn('series')).toEqual({ y: 0 });
  });
});

describe('목록에서 눌러 연 문서', () => {
  it('누른 자료만 «눌러 연 것» 이고, 열람 페이지가 읽은 뒤 지운다 — 다른 자료의 표시는 건드리지 않는다', () => {
    requestDocumentOpen('a');
    expect(wasDocumentOpened('a')).toBe(true);
    expect(wasDocumentOpened('b')).toBe(false);
    clearDocumentOpen('b');
    expect(wasDocumentOpened('a')).toBe(true);
    clearDocumentOpen('a');
    expect(wasDocumentOpened('a')).toBe(false);
  });
});
