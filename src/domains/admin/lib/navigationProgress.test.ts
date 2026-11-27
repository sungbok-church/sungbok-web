import { describe, expect, it } from 'vitest';

import {
  isInAppClick,
  isPlainClick,
  leadsElsewhere,
  leadsToOtherScreen,
  NAVIGATION_START,
  type NavigationStartDetail,
  screenShape,
  signalNavigationStart,
} from './navigationProgress';

const HERE = 'http://localhost:3005/admin/users?page=2';
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = (href: string, extra: Partial<{ target: string; download: boolean }> = {}) => ({
  href,
  target: '',
  download: false,
  ...extra,
});

describe('leadsElsewhere — 지금 화면과 다른 곳으로 가는가', () => {
  it('다른 주소 · 같은 주소의 다른 조건이면 간다', () => {
    expect(leadsElsewhere('/admin/groups', HERE)).toBe(true);
    expect(leadsElsewhere('/admin/users?page=3', HERE)).toBe(true);
  });

  it('지금 화면 그대로(# 만 다른 것 포함)면 가지 않는다 — 표시줄이 끝나지 않고 남는다', () => {
    expect(leadsElsewhere('/admin/users?page=2', HERE)).toBe(false);
    expect(leadsElsewhere('/admin/users?page=2#top', HERE)).toBe(false);
  });

  it('다른 사이트는 이 앱의 화면 이동이 아니다', () => {
    expect(leadsElsewhere('https://example.com/admin/users', HERE)).toBe(false);
  });
});

describe('leadsToOtherScreen — 다른 화면(경로가 다름)으로 가는가', () => {
  it('경로가 다르면 그렇다', () => {
    expect(leadsToOtherScreen('/admin/groups', HERE)).toBe(true);
    expect(leadsToOtherScreen('http://localhost:3005/admin/users/1', HERE)).toBe(true);
  });

  it('같은 화면의 조건만 바꾸는 이동(검색 · 쪽 · 정렬)과 # 만 다른 주소는 아니다', () => {
    expect(leadsToOtherScreen('/admin/users?q=%ED%99%8D&page=2', HERE)).toBe(false);
    expect(leadsToOtherScreen('/admin/users#top', HERE)).toBe(false);
  });

  it('바깥 주소는 아니다', () => {
    expect(leadsToOtherScreen('https://example.com/admin/groups', HERE)).toBe(false);
  });
});

describe('signalNavigationStart — 갈 곳을 실어 알린다', () => {
  it('앱 안의 주소면 갈 곳(절대 주소)을 detail 에 싣는다 — 지금 화면으로 가는 것도(앞 이동을 대신한다), 바깥 주소는 아니다', () => {
    window.history.replaceState(null, '', '/admin/users');
    const heard: string[] = [];
    const listen = (e: Event) => heard.push((e as CustomEvent<NavigationStartDetail>).detail.href);
    window.addEventListener(NAVIGATION_START, listen);
    signalNavigationStart('/admin/groups');
    signalNavigationStart('/admin/users');
    signalNavigationStart('https://example.com/admin');
    window.removeEventListener(NAVIGATION_START, listen);
    expect(heard).toEqual([
      `${window.location.origin}/admin/groups`,
      `${window.location.origin}/admin/users`,
    ]);
  });
});

describe('isPlainClick — 화면 안에서 처리할 보통 클릭인가', () => {
  it('보조 키 없는 왼쪽 단추만 그렇다', () => {
    expect(isPlainClick(click)).toBe(true);
    expect(isPlainClick({ ...click, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...click, altKey: true })).toBe(false);
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
  });
});

describe('isInAppClick — 이 탭에서 앱 안의 주소로 옮기는 클릭인가(지금 화면 포함)', () => {
  it('지금 화면으로 가는 링크도 그렇다 — 앞서 누른 이동을 대신하므로 알려야 한다', () => {
    expect(isInAppClick(click, link(HERE), HERE)).toBe(true);
  });
  it('보통 클릭으로 다른 관리자 화면 링크를 누르면 그렇다', () => {
    expect(isInAppClick(click, link('http://localhost:3005/admin/groups'), HERE)).toBe(true);
  });
  it('새 탭 · 새 창으로 여는 클릭(⌘ · Ctrl · Shift · 가운데 단추)은 아니다', () => {
    const to = link('http://localhost:3005/admin/groups');
    expect(isInAppClick({ ...click, metaKey: true }, to, HERE)).toBe(false);
    expect(isInAppClick({ ...click, ctrlKey: true }, to, HERE)).toBe(false);
    expect(isInAppClick({ ...click, shiftKey: true }, to, HERE)).toBe(false);
    expect(isInAppClick({ ...click, button: 1 }, to, HERE)).toBe(false);
  });
  it('target 이 있는 링크 · 내려받기 링크 · 바깥 주소는 아니다', () => {
    expect(isInAppClick(click, link('/admin/groups', { target: '_blank' }), HERE)).toBe(false);
    expect(isInAppClick(click, link('/files/a.pdf', { download: true }), HERE)).toBe(false);
    expect(isInAppClick(click, link('https://example.com/'), HERE)).toBe(false);
  });
});

describe('screenShape — 갈 화면의 뼈대 모양', () => {
  it('코드 · 분류 관리는 묶음 모양(왼쪽 묶음 목록 + 오른쪽 표)', () => {
    expect(screenShape('http://localhost:3005/admin/codes')).toBe('groups');
    expect(screenShape('http://localhost:3005/admin/categories?group=album')).toBe('groups');
    expect(screenShape('/admin/codes/')).toBe('groups');
  });

  it('등록 · 수정 화면은 입력 폼 모양', () => {
    expect(screenShape('http://localhost:3005/admin/resources/new')).toBe('form');
    expect(screenShape('http://localhost:3005/admin/users/0194-abc/edit')).toBe('form');
    expect(screenShape('/admin/bulletin/new/')).toBe('form');
  });

  it('그 밖은 목록 모양', () => {
    expect(screenShape('http://localhost:3005/admin/users')).toBe('list');
    expect(screenShape('http://localhost:3005/admin')).toBe('list');
    expect(screenShape('http://localhost:3005/admin/codes-old')).toBe('list');
    expect(screenShape('http://localhost:3005/admin/groups/1/codes')).toBe('list');
    expect(screenShape('http://localhost:3005/admin/news')).toBe('list');
    expect(screenShape('http://localhost:3005/admin/users/new-guide')).toBe('list');
  });
});
