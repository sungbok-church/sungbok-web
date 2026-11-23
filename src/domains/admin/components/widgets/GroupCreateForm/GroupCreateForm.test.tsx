import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildMatrix, type MatrixMenu } from '@/domains/admin/lib/permissionMatrix';

import { GroupCreateForm } from '.';

const m = vi.hoisted(() => ({ createGroup: vi.fn(), navigate: vi.fn() }));
vi.mock('@/domains/admin/api/actions/groupActions', () => ({ createGroup: m.createGroup }));
vi.mock('@/domains/admin/lib/notify', () => ({ notifyResult: vi.fn() }));
vi.mock('@/domains/admin/hooks/useAdminNavigate', () => ({ useAdminNavigate: () => m.navigate }));

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

const MENUS: MatrixMenu[] = [
  { key: 'content', label: '콘텐츠', parentKey: null, sort: 10, actions: [] },
  { key: 'bulletin', label: '주보', parentKey: 'content', sort: 10, actions: ['READ', 'UPDATE'] },
];
const MATRIX = buildMatrix(MENUS, []);
const GROUP_ID = '0190a0b0-0000-7000-8000-000000000009';

describe('GroupCreateForm — 두 단계 새 그룹', () => {
  it('이름이 없으면 권한 단계로 가지 않는다', async () => {
    const user = userEvent.setup();
    render(<GroupCreateForm userId="me" matrix={MATRIX} />);
    await user.click(screen.getByRole('button', { name: /다음/ }));
    expect(await screen.findByText('그룹 이름을 넣어 주세요.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: '주보 수정' })).toBeNull();
  });

  it('이름 → 권한 표 → 만들기: 고른 권한(조회 함께)과 함께 만들고 상세로 간다', async () => {
    m.createGroup.mockResolvedValue({ ok: true, data: { id: GROUP_ID } });
    const user = userEvent.setup();
    render(<GroupCreateForm userId="me" matrix={MATRIX} />);
    await user.type(screen.getByLabelText(/그룹 이름/), '주보 담당');
    await user.click(screen.getByRole('button', { name: /다음/ }));

    await user.click(screen.getByRole('checkbox', { name: '주보 수정' }));
    expect(screen.getByRole('checkbox', { name: '주보 조회' })).toBeChecked();
    // 이전으로 돌아가도 쓴 이름은 그대로
    await user.click(screen.getByRole('button', { name: /이전/ }));
    expect(screen.getByLabelText(/그룹 이름/)).toHaveValue('주보 담당');
    await user.click(screen.getByRole('button', { name: /다음/ }));
    expect(screen.getByRole('checkbox', { name: '주보 수정' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '그룹 만들기' }));

    await waitFor(() => expect(m.createGroup).toHaveBeenCalledTimes(1));
    expect(m.createGroup).toHaveBeenCalledWith({
      name: '주보 담당',
      description: '',
      permissions: expect.arrayContaining([
        { menuKey: 'bulletin', action: 'READ' },
        { menuKey: 'bulletin', action: 'UPDATE' },
      ]),
    });
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith(`/admin/groups/${GROUP_ID}`));
  });

  it('서버가 이름 오류를 주면 첫 단계를 열어 보이고, 권한 칸 오류는 다음 제출을 막지 않는다', async () => {
    m.createGroup
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'DUPLICATE', message: '', fields: { name: ['이미 있는 이름입니다.'] } },
      })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: '',
          fields: { 'permissions.0': ['다시 골라 주세요.'] },
        },
      })
      .mockResolvedValueOnce({ ok: true, data: { id: GROUP_ID } });
    const user = userEvent.setup();
    render(<GroupCreateForm userId="me" matrix={MATRIX} />);
    await user.type(screen.getByLabelText(/그룹 이름/), '주보 담당');
    await user.click(screen.getByRole('button', { name: /다음/ }));
    await user.click(screen.getByRole('button', { name: '그룹 만들기' }));

    expect(await screen.findByText('이미 있는 이름입니다.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/그룹 이름/), '2');
    await user.click(screen.getByRole('button', { name: /다음/ }));
    await user.click(screen.getByRole('button', { name: '그룹 만들기' }));
    await waitFor(() => expect(m.createGroup).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: '그룹 만들기' }));
    await waitFor(() => expect(m.createGroup).toHaveBeenCalledTimes(3));
  });
});
