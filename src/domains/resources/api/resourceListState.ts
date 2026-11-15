// 자료 목록의 상태(검색어·분류 칩·정렬)를 화면 밖(모듈)에 둔다 — 문서를 보러 갔다가 돌아오면 목록 화면이
// 새로 만들어지는데(다른 페이지였으므로), 그때도 보던 목록이 그대로 이어지게. 새로고침하면 처음으로 돌아간다.
// 예배 영상의 sermonListState 와 같은 방식이다(분류마다 따로 기억한다).
'use client';

import { useCallback, useSyncExternalStore } from 'react';

import type { ResourceSection } from './resource.types';
import type { ResourceQuery } from './resourceList';

const INITIAL: ResourceQuery = { q: '', filter: '', sort: 'new' };

const states = new Map<ResourceSection, ResourceQuery>();
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};
const read = (section: ResourceSection) => states.get(section) ?? INITIAL;
const write = (section: ResourceSection, next: ResourceQuery) => {
  states.set(section, next);
  listeners.forEach(l => l());
};

/** 목록의 조건과 바꾸는 함수. 서버 HTML·하이드레이션 첫 렌더는 처음 상태(검색 없음·전체·최신순). */
export const useResourceListState = (section: ResourceSection) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(section),
    () => INITIAL
  );
  const setQuery = useCallback(
    (patch: Partial<ResourceQuery>) => write(section, { ...read(section), ...patch }),
    [section]
  );
  /** «검색 조건 초기화» */
  const reset = useCallback(() => write(section, INITIAL), [section]);
  return { state, setQuery, reset };
};

// ── 목록으로 돌아올 자리 ──
// 자료를 누를 때 목록의 스크롤 위치와 누른 자료를 적어 두고(rememberListLeave), 열람 페이지의 «자료 목록» 으로
// 돌아오면(markListReturn) 목록 화면이 꺼내 그 자리로 가고 누른 줄에 키보드 포커스를 되돌린다(takeListReturn).
// 브라우저 «뒤로» 는 브라우저·Next 가 자리를 되찾아 주므로 관여하지 않는다. 메뉴로 새로 들어온 경우에는
// «돌아옴» 표시가 없어 맨 위에서 시작한다. 적어 둔 자리는 목록이 열릴 때마다 버린다 — 남겨 두면 한참 뒤의
// «자료 목록» 이 예전 자리로 간다.

export type ListLeave = {
  /** 떠날 때의 페이지 스크롤 위치 */
  y: number;
  /** 누른 자료 — 돌아오면 그 줄에 포커스를 둔다 */
  id?: string;
};

const leaves = new Map<ResourceSection, ListLeave>();
const returning = new Set<ResourceSection>();

export const rememberListLeave = (section: ResourceSection, leave: ListLeave) => {
  leaves.set(section, leave);
};

export const markListReturn = (section: ResourceSection) => {
  returning.add(section);
};

/**
 * 목록 화면이 열릴 때 부른다. «자료 목록» 으로 돌아온 것이면 갈 자리(적어 둔 것이 없으면 맨 위), 아니면 undefined.
 * 어느 쪽이든 적어 둔 자리와 표시는 지워진다.
 */
export const takeListReturn = (section: ResourceSection): ListLeave | undefined => {
  const leave = leaves.get(section) ?? { y: 0 };
  leaves.delete(section);
  return returning.delete(section) ? leave : undefined;
};

// ── 목록에서 눌러 연 문서 ──
// 열람 페이지는 자료마다 새로 만들어진다 — 목록에서 눌러 넘어온 것인지는 화면 안의 상태로 넘겨줄 수 없어 여기 둔다.
// 눌러서 넘어왔으면 열람 페이지가 문서가 화면 위쪽에 오게 맞추고(서브페이지 머리가 커서 문서가 화면 밖에서 시작한다),
// 주소로 바로 들어온 경우(공유 링크·새로고침)나 뒤로·앞으로 가기는 건드리지 않는다. 열람 페이지가 읽은 뒤 지운다.

let opened: string | null = null;

/** 이 자료는 목록에서 눌러 연 것이다 — 자료 줄을 누를 때 부른다. */
export const requestDocumentOpen = (id: string) => {
  opened = id;
};

/** 그 자료가 목록에서 눌러 연 것인지. 읽어도 지워지지 않는다(렌더 중 여러 번 읽힌다). */
export const wasDocumentOpened = (id: string) => opened === id;

/** 그 자료의 표시를 지운다 — 열람 페이지가 쓴 뒤에 부른다. 다른 자료의 표시는 건드리지 않는다. */
export const clearDocumentOpen = (id: string) => {
  if (opened === id) opened = null;
};

/** 전부 처음으로 — 테스트용 */
export const resetResourceListState = () => {
  states.clear();
  leaves.clear();
  returning.clear();
  opened = null;
  listeners.forEach(l => l());
};
