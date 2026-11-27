import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signalNavigationStart } from '@/domains/admin/lib/navigationProgress';

import { PendingScreen } from './index';

const nav = vi.hoisted(() => ({ pathname: '/admin/users' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const page = (text: string) => (
  <PendingScreen>
    <p>{text}</p>
  </PendingScreen>
);
const skeleton = () => screen.queryByRole('status', { name: '불러오는 중' });

beforeEach(() => {
  nav.pathname = '/admin/users';
  window.history.replaceState(null, '', '/admin/users');
});
afterEach(() => {
  vi.useRealTimers();
});

describe('PendingScreen — 다른 화면으로 가는 동안 본문 자리에 뼈대', () => {
  it('평소에는 화면을 그대로 보인다', () => {
    render(page('사용자 목록'));
    expect(screen.getByText('사용자 목록')).toBeVisible();
    expect(skeleton()).toBeNull();
  });

  it('다른 화면으로 가는 신호를 받으면 곧바로 뼈대를 보이고, 지금 화면은 숨긴다(지우지 않는다)', () => {
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    expect(skeleton()).toBeInTheDocument();
    expect(screen.getByText('사용자 목록')).not.toBeVisible();
  });

  it('갈 화면을 닮은 뼈대 — 코드 · 분류 관리는 묶음 모양, 그 밖은 목록 모양', () => {
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/codes'));
    expect(skeleton()).toHaveAttribute('data-shape', 'groups');
    act(() => signalNavigationStart('/admin/groups'));
    expect(skeleton()).toHaveAttribute('data-shape', 'list');
  });

  it('같은 화면의 조건만 바꾸는 이동(검색 · 쪽)은 뼈대 없이 지금 화면을 둔다', () => {
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/users?q=%ED%99%8D'));
    expect(skeleton()).toBeNull();
    expect(screen.getByText('사용자 목록')).toBeVisible();
  });

  it('가는 도중에 지금 화면을 다시 고르면(앞 이동을 대신한다) 뼈대를 거둔다 — 10초 남지 않는다', () => {
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    act(() => signalNavigationStart('/admin/users'));
    expect(skeleton()).toBeNull();
    expect(screen.getByText('사용자 목록')).toBeVisible();
  });

  it('새 화면이 그려지면(경로가 바뀌면) 뼈대를 거둔다', () => {
    const { rerender } = render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    nav.pathname = '/admin/groups';
    rerender(page('그룹 목록'));
    expect(skeleton()).toBeNull();
    expect(screen.getByText('그룹 목록')).toBeVisible();
  });

  it('뒤로 가기를 하면 거둔다', () => {
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(skeleton()).toBeNull();
  });

  it('끝을 알 수 없는 이동이면 잠시 뒤 거두고 화면을 되돌린다', () => {
    vi.useFakeTimers();
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(skeleton()).toBeNull();
    expect(screen.getByText('사용자 목록')).toBeVisible();
  });

  it('뼈대를 띄운 채 다른 화면을 또 누르면 그때부터 다시 센다', () => {
    vi.useFakeTimers();
    render(page('사용자 목록'));
    act(() => signalNavigationStart('/admin/groups'));
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    act(() => signalNavigationStart('/admin/codes'));
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(skeleton()).toHaveAttribute('data-shape', 'groups');
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(skeleton()).toBeNull();
  });
});
