import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildMatrix, type MatrixMenu } from '@/domains/admin/lib/permissionMatrix';

import { GroupForm } from '.';

const m = vi.hoisted(() => ({
  saveGroup: vi.fn(async () => ({ ok: true as const, data: undefined })),
  navigate: vi.fn(),
}));
vi.mock('@/domains/admin/api/actions/groupActions', () => ({
  saveGroup: m.saveGroup,
}));
vi.mock('@/domains/admin/lib/notify', () => ({ notifyResult: vi.fn() }));
vi.mock('@/domains/admin/hooks/useAdminNavigate', () => ({ useAdminNavigate: () => m.navigate }));

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

const MENUS: MatrixMenu[] = [
  { key: 'system', label: '시스템', parentKey: null, sort: 10, actions: [] },
  { key: 'users', label: '사용자', parentKey: 'system', sort: 10, actions: ['READ', 'UPDATE'] },
  { key: 'groups', label: '그룹', parentKey: 'system', sort: 20, actions: ['READ', 'UPDATE'] },
];
const ALL = MENUS.flatMap(menu => menu.actions.map(action => ({ menuKey: menu.key, action })));
// 이 그룹이 모든 칸을 준다(표는 «전체 관리» 만 고친다 — 막힌 칸이 없다)
const MATRIX = buildMatrix(MENUS, ALL);
const GROUP_ID = '0190a0b0-0000-7000-8000-000000000001';

const renderForm = () =>
  render(
    <GroupForm
      userId="me"
      initial={{ name: '주보 담당', description: '', isActive: true }}
      editing={{ id: GROUP_ID, updatedAt: 't1' }}
      matrix={MATRIX}
    />
  );

describe('GroupForm — 그룹 수정(«전체 관리»)', () => {
  it('이름만 고쳐 저장하면 권한 표는 그대로 함께 보낸다(바뀐 칸이 없어 DB 는 권한을 건드리지 않는다)', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/그룹 이름/), ' 2');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(m.saveGroup).toHaveBeenCalledTimes(1));
    const [sent] = m.saveGroup.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(sent).toMatchObject({ id: GROUP_ID, name: '주보 담당 2', isActive: true });
    expect(sent.permissions).toEqual(sent.seenPermissions);
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith(`/admin/groups/${GROUP_ID}`));
  });

  it('권한을 고쳐 저장하면 지금 표와 열었을 때의 표를 함께 보내고 상세로 간다(확인 창 없이)', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('checkbox', { name: '그룹 수정' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(m.saveGroup).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(m.saveGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: GROUP_ID,
        permissions: expect.not.arrayContaining([{ menuKey: 'groups', action: 'UPDATE' }]),
        seenPermissions: expect.arrayContaining([{ menuKey: 'groups', action: 'UPDATE' }]),
      })
    );
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith(`/admin/groups/${GROUP_ID}`));
  });

  it('조회를 끄면 그 메뉴의 다른 기능도 꺼지고, 다른 기능을 켜면 조회도 켜진다', async () => {
    const user = userEvent.setup();
    renderForm();
    const read = screen.getByRole('checkbox', { name: '그룹 조회' });
    const update = screen.getByRole('checkbox', { name: '그룹 수정' });
    await user.click(read);
    expect(read).not.toBeChecked();
    expect(update).not.toBeChecked();
    await user.click(update);
    expect(update).toBeChecked();
    expect(read).toBeChecked();
  });

  it('글자 수는 한도의 80% 를 넘겨 쓸 때만 보인다', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.queryByText(/\/ 50$/)).toBeNull();
    const name = screen.getByLabelText(/그룹 이름/);
    // 알림 자리(aria-live)는 처음부터 비어 있는 채로 있어야 채워질 때 스크린리더가 읽는다
    const live = name.closest('[data-slot="field"]')?.querySelector('[aria-live="polite"]');
    expect(live).toBeInTheDocument();
    expect(live).toBeEmptyDOMElement();
    await user.clear(name);
    await user.type(name, 'ㄱ'.repeat(39));
    expect(screen.queryByText(/\/ 50$/)).toBeNull();
    expect(live).toBeEmptyDOMElement();
    await user.type(name, 'ㄱ');
    expect(screen.getByText('40 / 50')).toBeInTheDocument();
    expect(live).toHaveTextContent('40 / 50');
  });
});
