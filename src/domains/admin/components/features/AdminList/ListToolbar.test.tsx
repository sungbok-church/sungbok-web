import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ListQuery, type ListSpec, parseListQuery } from '@/domains/admin/lib/listQuery';
import { readRecentSearches, recentKey } from '@/domains/admin/lib/recentSearches';

import { ListToolbar } from './ListToolbar';

const m = vi.hoisted(() => ({ navigate: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users',
  useRouter: () => ({ refresh: m.refresh }),
}));
vi.mock('@/domains/admin/hooks/useAdminNavigate', () => ({ useAdminNavigate: () => m.navigate }));
// Base UI 의 Select 는 jsdom 에서 열고 고르기 어렵다 — 같은 값 · 이름을 쓰는 기본 <select> 로 바꾼다
vi.mock('@/shared/components/ui/select', async () => {
  const React = await import('react');
  type Ctx = {
    items: { value: string; label: string }[];
    value: string;
    onValueChange: (value: string) => void;
  };
  const SelectCtx = React.createContext<Ctx | null>(null);
  return {
    Select: ({ children, ...ctx }: Ctx & { children: React.ReactNode }) => (
      <SelectCtx.Provider value={ctx}>{children}</SelectCtx.Provider>
    ),
    SelectTrigger: ({ 'aria-label': label }: { 'aria-label': string }) => {
      const ctx = React.useContext(SelectCtx)!;
      return (
        <select
          aria-label={label}
          value={ctx.value}
          onChange={e => ctx.onValueChange(e.target.value)}
        >
          {ctx.items.map(i => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      );
    },
    SelectValue: () => null,
    SelectContent: () => null,
    SelectGroup: () => null,
    SelectItem: () => null,
  };
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/admin/users');
  window.localStorage.clear();
});

const SPEC: ListSpec = {
  sorts: ['name', 'created_at'],
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: { status: ['active', 'inactive'] },
  dateRange: true,
};
const FILTERS = [
  {
    name: 'status',
    label: '상태',
    options: [
      { value: 'active', label: '사용 중' },
      { value: 'inactive', label: '꺼짐' },
    ],
  },
];

const q = (sp: Record<string, string>): ListQuery => parseListQuery(sp, SPEC);
const toolbar = (query: ListQuery) => (
  <ListToolbar userId="u1" query={query} spec={SPEC} filters={FILTERS} trashable />
);
const lastHref = () => m.navigate.mock.calls.at(-1)?.[0] as string;
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const enter = (label: string) => fireEvent.keyDown(screen.getByLabelText(label), { key: 'Enter' });
const applyButton = () => screen.queryByRole('button', { name: '적용' });

describe('ListToolbar — 칸마다 제 값만 바꾼다(나머지는 적용된 값)', () => {
  it('조건을 고르면 보내지 않은 검색어 · 기간은 싣지 않는다', () => {
    render(toolbar(q({ q: '홍', from: '2026-01-01' })));
    type('검색어', '김');
    type('시작일', '2026-02-01');
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'active' } });
    expect(m.navigate).toHaveBeenCalledTimes(1);
    expect(lastHref()).toBe('/admin/users?q=%ED%99%8D&status=active&from=2026-01-01');
  });

  it('«삭제된 항목» 도 제 값만 바꾼다', () => {
    render(toolbar(q({ q: '홍' })));
    type('검색어', '김');
    fireEvent.click(screen.getByRole('switch'));
    expect(lastHref()).toBe('/admin/users?q=%ED%99%8D&trash=1');
  });

  it('방금 적용한 값(주소가 바뀌기 전)은 다음 이동에 싣는다', () => {
    render(toolbar(q({})));
    type('검색어', '홍');
    enter('검색어');
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'active' } });
    expect(m.navigate).toHaveBeenCalledTimes(2);
    expect(lastHref()).toBe('/admin/users?q=%ED%99%8D&status=active');
  });

  it('응답 전에 되돌려도 되돌린 주소로 간다', () => {
    render(toolbar(q({})));
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: '__all__' } });
    expect(m.navigate).toHaveBeenCalledTimes(2);
    expect(lastHref()).toBe('/admin/users');
  });
});

describe('ListToolbar — 검색어', () => {
  it('폼에 제출 버튼이 있다 — 입력칸이 여럿인 폼은 제출 버튼이 없으면 브라우저가 Enter 로 제출하지 않는다', () => {
    const { container } = render(toolbar(q({})));
    const submit = container.querySelector('form[role="search"] button[type="submit"]');
    expect(submit).not.toBeNull();
  });

  it('한글 입력 중의 Enter(휴대폰 «검색» 키)는 칸이 아니라 폼 제출로 받는다 — 한 번에 검색된다', () => {
    render(toolbar(q({})));
    type('검색어', '홍길동');
    fireEvent.keyDown(screen.getByLabelText('검색어'), { key: 'Enter', isComposing: true });
    expect(m.navigate).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('search'));
    expect(lastHref()).toBe('/admin/users?q=%ED%99%8D%EA%B8%B8%EB%8F%99');
  });

  it('Enter 로 적용한다', () => {
    render(toolbar(q({ status: 'active' })));
    type('검색어', ' 김 ');
    expect(m.navigate).not.toHaveBeenCalled();
    enter('검색어');
    expect(lastHref()).toBe('/admin/users?q=%EA%B9%80&status=active');
  });

  it('바꾼 것 없이 Enter 를 누르면 가지 않는다(3쪽에서 1쪽으로 튀지 않는다)', () => {
    render(toolbar(q({ q: '홍', page: '3' })));
    enter('검색어');
    expect(m.navigate).not.toHaveBeenCalled();
  });

  it('검색어를 비우고 Enter 를 눌러 응답 전에 되돌려도 간다', () => {
    render(toolbar(q({})));
    type('검색어', '홍');
    enter('검색어');
    type('검색어', '');
    enter('검색어');
    expect(m.navigate).toHaveBeenCalledTimes(2);
    expect(lastHref()).toBe('/admin/users');
  });
});

describe('ListToolbar — 기간', () => {
  it('[적용] 은 바뀐 값이 비었거나 다 고른 날짜일 때만 보이고, 고르는 것만으로는 가지 않는다', () => {
    render(toolbar(q({ from: '2026-01-05' })));
    expect(applyButton()).toBeNull();
    type('시작일', '0002-01-05');
    expect(applyButton()).toBeNull();
    type('시작일', '2026-02-05');
    expect(applyButton()).toBeInTheDocument();
    type('시작일', '2026-01-05');
    expect(applyButton()).toBeNull();
    fireEvent.blur(screen.getByLabelText('시작일'));
    expect(m.navigate).not.toHaveBeenCalled();
  });

  it('[적용] 은 두 날짜를 함께 보낸다', () => {
    render(toolbar(q({ q: '홍' })));
    type('검색어', '김');
    type('시작일', '2026-01-05');
    type('끝일', '2026-01-31');
    fireEvent.click(applyButton()!);
    expect(m.navigate).toHaveBeenCalledTimes(1);
    expect(lastHref()).toBe('/admin/users?q=%ED%99%8D&from=2026-01-05&to=2026-01-31');
  });

  it('날짜 칸에서 Enter 로도 적용한다(비운 값도)', () => {
    render(toolbar(q({ from: '2026-01-05' })));
    type('시작일', '');
    expect(m.navigate).not.toHaveBeenCalled();
    enter('시작일');
    expect(lastHref()).toBe('/admin/users');
  });

  it('치는 중인 날짜에서 Enter 는 가지 않는다', () => {
    render(toolbar(q({})));
    type('시작일', '0002-01-05');
    enter('시작일');
    expect(m.navigate).not.toHaveBeenCalled();
  });
});

describe('ListToolbar — 주소가 바뀌면', () => {
  it('손대지 않은 칸은 새 주소 값으로 맞춘다(뒤로 가기 등)', () => {
    const { rerender } = render(toolbar(q({ q: '홍', from: '2026-01-01' })));
    rerender(toolbar(q({ q: '김', to: '2026-02-01' })));
    expect(screen.getByLabelText('검색어')).toHaveValue('김');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
    expect(screen.getByLabelText('끝일')).toHaveValue('2026-02-01');
  });

  it('고치던 칸(보내지 않은 값)은 다른 칸이 주소를 바꿔도 지우지 않는다', () => {
    const { rerender } = render(toolbar(q({ q: '홍' })));
    type('검색어', '홍길');
    type('시작일', '2026-03-01');
    rerender(toolbar(q({ q: '홍', status: 'active' })));
    expect(screen.getByLabelText('검색어')).toHaveValue('홍길');
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-03-01');
  });

  it('적용한 칸은 다시 주소를 따른다', () => {
    const { rerender } = render(toolbar(q({})));
    type('검색어', '홍');
    enter('검색어');
    rerender(toolbar(q({ q: '홍' })));
    rerender(toolbar(q({})));
    expect(screen.getByLabelText('검색어')).toHaveValue('');
  });
});

describe('ListToolbar — [초기화]', () => {
  it('기본 상태에는 없고, 정렬 · 쪽당 개수만 바꿔도 보인다', () => {
    const { rerender } = render(toolbar(q({})));
    expect(screen.queryByRole('button', { name: '초기화' })).toBeNull();
    rerender(toolbar(q({ sort: 'name' })));
    expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument();
    rerender(toolbar(q({ size: '50' })));
    expect(screen.getByRole('button', { name: '초기화' })).toBeInTheDocument();
  });

  it('조건이 있으면 칸을 비우고 맨 주소로 간다', () => {
    window.history.replaceState(null, '', '/admin/users?q=%ED%99%8D');
    render(toolbar(q({ q: '홍' })));
    type('시작일', '2026-03-01');
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(lastHref()).toBe('/admin/users');
    expect(m.refresh).not.toHaveBeenCalled();
    expect(screen.getByLabelText('검색어')).toHaveValue('');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
  });

  it('기억한 쪽당 개수(쿠키)만 다르면 주소가 같으니 다시 그리게 한다', () => {
    render(toolbar(parseListQuery({}, SPEC, { size: 50 })));
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(m.refresh).toHaveBeenCalledTimes(1);
    expect(m.navigate).not.toHaveBeenCalled();
  });
});

describe('ListToolbar — 최근 검색 조건', () => {
  const saved = () => readRecentSearches(window.localStorage, recentKey('u1', '/admin/users'));

  it('조건이 있는 검색만 남긴다(정렬만 남은 주소는 남기지 않는다)', () => {
    render(toolbar(q({ q: '홍', sort: 'name' })));
    type('검색어', '');
    enter('검색어');
    expect(lastHref()).toBe('/admin/users?sort=name');
    expect(saved()).toEqual([]);
  });

  it('남길 때는 조건을 이름으로 쓴다', () => {
    render(toolbar(q({ status: 'active' })));
    type('검색어', '김');
    enter('검색어');
    expect(saved()).toEqual([
      { query: 'q=%EA%B9%80&status=active', label: '검색어: 김 · 상태: 사용 중' },
    ]);
  });
});
