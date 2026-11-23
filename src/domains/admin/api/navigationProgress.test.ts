import { describe, expect, it } from 'vitest';

import { isNavigationClick, leadsElsewhere } from './navigationProgress';

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

describe('isNavigationClick — 이 클릭이 앱 안의 화면 이동인가', () => {
  it('보통 클릭으로 다른 관리자 화면 링크를 누르면 그렇다', () => {
    expect(isNavigationClick(click, link('http://localhost:3005/admin/groups'), HERE)).toBe(true);
  });

  it('새 탭 · 새 창으로 여는 클릭(⌘ · Ctrl · Shift · 가운데 단추)은 아니다', () => {
    const to = link('http://localhost:3005/admin/groups');
    expect(isNavigationClick({ ...click, metaKey: true }, to, HERE)).toBe(false);
    expect(isNavigationClick({ ...click, ctrlKey: true }, to, HERE)).toBe(false);
    expect(isNavigationClick({ ...click, shiftKey: true }, to, HERE)).toBe(false);
    expect(isNavigationClick({ ...click, button: 1 }, to, HERE)).toBe(false);
  });

  it('target 이 있는 링크 · 내려받기 링크는 아니다', () => {
    expect(
      isNavigationClick(
        click,
        link('http://localhost:3005/admin/groups', { target: '_blank' }),
        HERE
      )
    ).toBe(false);
    expect(
      isNavigationClick(click, link('http://localhost:3005/files/a.pdf', { download: true }), HERE)
    ).toBe(false);
  });

  it('지금 화면으로 가는 링크는 아니다', () => {
    expect(isNavigationClick(click, link(HERE), HERE)).toBe(false);
  });
});
