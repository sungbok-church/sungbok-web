import { describe, expect, it } from 'vitest';

import { adminAuthDecision, safeNextPath } from './authRedirect';

describe('safeNextPath', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/bulletin?year=2026', '/admin/bulletin?year=2026'],
    [null, '/admin'],
    [undefined, '/admin'],
    ['', '/admin'],
    ['https://evil.example/admin', '/admin'],
    ['//evil.example/admin', '/admin'],
    ['/\\evil.example', '/admin'],
    ['/admin\\evil', '/admin'],
    ['/administrator', '/admin'],
    ['/admin/../news', '/admin'],
    ['/admin/%2e%2e/news', '/admin'],
    ['/admin/login', '/admin'], // 로그인 화면으로 되돌리지 않는다
    ['/admin/login?next=/admin', '/admin'],
    ['/', '/admin'],
    ['javascript:alert(1)', '/admin'],
    ['/admin\n/x', '/admin'],
    ['/admin/bulletin#frag', '/admin/bulletin'],
  ])('%s → %s', (input, expected) => expect(safeNextPath(input)).toBe(expected));
});

describe('adminAuthDecision', () => {
  it('로그인 안 했으면 로그인 화면으로 — 오던 곳을 next 에 싣는다', () => {
    expect(adminAuthDecision('/admin/bulletin', '?year=2026', false)).toEqual({
      kind: 'redirect',
      to: '/admin/login?next=%2Fadmin%2Fbulletin%3Fyear%3D2026',
    });
  });

  it('/admin 으로 오다 막히면 next 를 붙이지 않는다', () => {
    expect(adminAuthDecision('/admin', '', false)).toEqual({
      kind: 'redirect',
      to: '/admin/login',
    });
  });

  it('로그인 화면은 로그인 안 한 사람에게 그대로 보인다', () => {
    expect(adminAuthDecision('/admin/login', '?next=%2Fadmin', false)).toEqual({ kind: 'pass' });
  });

  it('로그인한 사람이 로그인 화면에 오면 갈 곳으로 보낸다', () => {
    expect(adminAuthDecision('/admin/login', '?next=%2Fadmin%2Fbulletin', true)).toEqual({
      kind: 'redirect',
      to: '/admin/bulletin',
    });
    expect(adminAuthDecision('/admin/login', '?next=https%3A%2F%2Fevil.example', true)).toEqual({
      kind: 'redirect',
      to: '/admin',
    });
    expect(adminAuthDecision('/admin/login', '', true)).toEqual({ kind: 'redirect', to: '/admin' });
  });

  it('로그인한 사람은 지나간다', () => {
    expect(adminAuthDecision('/admin/bulletin', '', true)).toEqual({ kind: 'pass' });
    expect(adminAuthDecision('/admin', '', true)).toEqual({ kind: 'pass' });
  });
});
