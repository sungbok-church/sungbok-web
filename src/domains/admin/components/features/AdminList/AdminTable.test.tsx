import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type ListSpec, parseListQuery } from '@/domains/admin/lib/listQuery';

import { AdminTable } from './AdminTable';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users',
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock('@/domains/admin/hooks/useAdminNavigate', () => ({ useAdminNavigate: () => vi.fn() }));

const SPEC: ListSpec = {
  sorts: ['name'],
  defaultSort: 'name',
  defaultDir: 'asc',
  filters: { status: ['active'] },
};
const table = (sp: Record<string, string>, total: number) => (
  <AdminTable
    query={parseListQuery(sp, SPEC)}
    spec={SPEC}
    columns={[{ key: 'name', header: '이름' }]}
    rows={[]}
    total={total}
    empty={{ title: '사용자가 없습니다' }}
  />
);

describe('AdminTable — 빈 목록', () => {
  it('마지막 쪽을 넘긴 주소면 «등록된 항목 없음» 이 아니라 1쪽으로 가는 길을 보인다', () => {
    render(table({ page: '5' }, 45));
    expect(screen.getByText('이 쪽에는 항목이 없습니다')).toBeInTheDocument();
    expect(screen.queryByText('사용자가 없습니다')).toBeNull();
    expect(screen.getByRole('button', { name: '1쪽으로' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('navigation', { name: '쪽 넘기기' })).toBeInTheDocument();
  });

  it('조건이 있어도 쪽을 넘긴 것이면 1쪽으로(조건은 그대로)', () => {
    render(table({ status: 'active', page: '4' }, 0));
    expect(screen.getByText('이 쪽에는 항목이 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1쪽으로' })).toHaveAttribute(
      'href',
      '/admin/users?status=active'
    );
  });

  it('1쪽이 비면 목록마다의 빈 안내', () => {
    render(table({}, 0));
    expect(screen.getByText('사용자가 없습니다')).toBeInTheDocument();
  });
});
