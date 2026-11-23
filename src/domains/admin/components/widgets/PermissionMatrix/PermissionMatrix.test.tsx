import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildMatrix, type MatrixMenu } from '@/domains/admin/lib/permissionMatrix';

import { PermissionMatrix } from '.';

const MENUS: MatrixMenu[] = [
  { key: 'system', label: '시스템', parentKey: null, sort: 10, actions: [] },
  { key: 'users', label: '사용자', parentKey: 'system', sort: 10, actions: ['READ', 'UPDATE'] },
  { key: 'groups', label: '그룹', parentKey: 'system', sort: 20, actions: ['READ', 'PURGE'] },
];
const ROWS = buildMatrix(MENUS, [{ menuKey: 'users', action: 'READ' }]);

describe('PermissionMatrix', () => {
  it('줄 체크는 일부만 켜져 있으면 «일부», 누르면 그 줄의 칸을 모두 켠다', () => {
    const onToggle = vi.fn();
    render(<PermissionMatrix rows={ROWS} checked={new Set(['users:READ'])} onToggle={onToggle} />);
    const row = screen.getByRole('checkbox', { name: '사용자 모두' });
    expect(row.getAttribute('aria-checked')).toBe('mixed');
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith(['users:READ', 'users:UPDATE'], true);
  });

  it('기능 칸 체크는 그 기능이 있는 메뉴만 켜고, 어느 메뉴에도 없는 기능에는 체크를 그리지 않는다', () => {
    const onToggle = vi.fn();
    render(<PermissionMatrix rows={ROWS} checked={new Set()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: '조회 모두' }));
    expect(onToggle).toHaveBeenCalledWith(['users:READ', 'groups:READ'], true);
    fireEvent.click(screen.getByRole('checkbox', { name: '영구 삭제 모두' }));
    expect(onToggle).toHaveBeenCalledWith(['groups:PURGE'], true);
    expect(screen.queryByRole('checkbox', { name: '삭제 모두' })).toBeNull();
    expect(screen.getAllByText('이 메뉴에는 없는 기능입니다').length).toBeGreaterThan(0);
  });

  it('보기 전용에는 체크가 하나도 없다', () => {
    render(<PermissionMatrix rows={ROWS} />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByLabelText('조회 있음')).toBeTruthy();
  });
});
