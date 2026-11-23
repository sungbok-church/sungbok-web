import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupDetailActions } from '.';

const m = vi.hoisted(() => ({
  updateGroup: vi.fn(async () => ({ ok: true as const, data: { updatedAt: 't2' } })),
  loadHistory: vi.fn(async () => ({
    ok: true as const,
    data: { items: [], names: {}, hasMore: false },
  })),
}));
vi.mock('@/domains/admin/api/actions/groupActions', () => ({ updateGroup: m.updateGroup }));
vi.mock('@/domains/admin/api/actions/historyActions', () => ({ loadHistory: m.loadHistory }));
vi.mock('@/domains/admin/lib/notify', () => ({ notifyResult: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const GROUP = {
  id: '0190a0b0-0000-7000-8000-000000000001',
  name: '주보 담당',
  description: '',
  isActive: true,
  updatedAt: 't1',
};

describe('GroupDetailActions', () => {
  it('«더 보기» 의 [끄기] 는 그룹 문구의 확인 창을 거쳐 끈다', async () => {
    const user = userEvent.setup();
    render(<GroupDetailActions group={GROUP} canToggle canHistory />);
    await user.click(screen.getByRole('button', { name: '더 보기' }));
    await user.click(await screen.findByRole('menuitem', { name: '끄기' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('그룹을 끌까요?');
    expect(dialog).toHaveTextContent('이 그룹으로 받은 권한');
    await user.click(screen.getByRole('button', { name: '끄기' }));
    await waitFor(() =>
      expect(m.updateGroup).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
    );
  });

  it('«더 보기» 의 [변경 이력] 은 이력 창을 열고 그때 읽는다', async () => {
    const user = userEvent.setup();
    render(<GroupDetailActions group={GROUP} canToggle={false} canHistory />);
    await user.click(screen.getByRole('button', { name: '더 보기' }));
    expect(screen.queryByRole('menuitem', { name: '끄기' })).toBeNull();
    await user.click(await screen.findByRole('menuitem', { name: '변경 이력' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('주보 담당');
    expect(m.loadHistory).toHaveBeenCalledWith({ table: 'groups', rowId: GROUP.id });
    expect(await screen.findByText('아직 기록이 없습니다')).toBeInTheDocument();
  });

  it('할 수 있는 동작이 없으면 메뉴를 그리지 않는다', () => {
    render(<GroupDetailActions group={GROUP} canToggle={false} canHistory={false} />);
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
  });
});
