import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Deferred } from './index';

// Next 가 그리는 화면의 주소 — Next 는 새 화면을 그린 뒤에야 주소줄(window.location)을 바꾼다. 테스트도 이 값만 바꾼다
const nav = vi.hoisted(() => ({ pathname: '/admin/users' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

beforeEach(() => {
  nav.pathname = '/admin/users';
});

describe('Deferred — 서버가 그린 부분을 받는 대로 보인다', () => {
  it('오기 전에는 뼈대, 오면 내용', async () => {
    const d = deferred<React.ReactNode>();
    render(<Deferred content={d.promise} fallback={<p>뼈대</p>} />);
    expect(screen.getByText('뼈대')).toBeInTheDocument();
    await act(async () => d.resolve(<p>목록</p>));
    expect(screen.getByText('목록')).toBeInTheDocument();
  });

  it('같은 주소에서 다시 읽으면(조건 · 저장 뒤) 새 내용이 올 때까지 지금 내용을 둔다', async () => {
    const first = deferred<React.ReactNode>();
    const { rerender } = render(<Deferred content={first.promise} fallback={<p>뼈대</p>} />);
    await act(async () => first.resolve(<p>옛 목록</p>));
    // 조건만 바뀐다(?page=2) — 경로는 그대로
    const second = deferred<React.ReactNode>();
    rerender(<Deferred content={second.promise} fallback={<p>뼈대</p>} />);
    expect(screen.getByText('옛 목록')).toBeInTheDocument();
    await act(async () => second.resolve(<p>새 목록</p>));
    expect(screen.getByText('새 목록')).toBeInTheDocument();
  });

  it('다른 글로 옮기면(같은 화면 · 다른 주소) 새 글이 올 때까지 뼈대 — 앞 글을 새 주소에 보이지 않는다', async () => {
    nav.pathname = '/admin/users/a';
    const first = deferred<React.ReactNode>();
    const { rerender } = render(<Deferred content={first.promise} fallback={<p>뼈대</p>} />);
    await act(async () => first.resolve(<p>사용자 A</p>));
    // Next 가 B 를 그린다(주소줄은 그린 뒤에 바뀐다 — 이 부품은 Next 의 경로만 본다)
    nav.pathname = '/admin/users/b';
    const second = deferred<React.ReactNode>();
    rerender(<Deferred content={second.promise} fallback={<p>뼈대</p>} />);
    expect(screen.queryByText('사용자 A')).toBeNull();
    expect(screen.getByText('뼈대')).toBeInTheDocument();
    await act(async () => second.resolve(<p>사용자 B</p>));
    expect(screen.getByText('사용자 B')).toBeInTheDocument();
  });

  it('B 의 내용이 도착하는 순간 A 로 돌아가도(뒤로 가기와 겹침) B 를 A 주소에 보이지 않는다 — 내용은 그것을 요청한 화면의 주소 것', async () => {
    nav.pathname = '/admin/users/a';
    const a = deferred<React.ReactNode>();
    const { rerender } = render(<Deferred content={a.promise} fallback={<p>뼈대</p>} />);
    await act(async () => a.resolve(<p>사용자 A</p>));
    nav.pathname = '/admin/users/b';
    const b = deferred<React.ReactNode>();
    rerender(<Deferred content={b.promise} fallback={<p>뼈대</p>} />);
    // B 가 도착하는 것과 A 로 돌아가는 것이 한 번에 그려진다(A 는 아직 새로 받지 않았다)
    nav.pathname = '/admin/users/a';
    await act(async () => {
      b.resolve(<p>사용자 B</p>);
      rerender(<Deferred content={b.promise} fallback={<p>뼈대</p>} />);
    });
    expect(screen.queryByText('사용자 B')).toBeNull();
  });
});
