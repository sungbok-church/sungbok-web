import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MatrixMenu } from '@/domains/admin/lib/permissionMatrix';

import { UserCreateForm } from '.';

const m = vi.hoisted(() => ({ createUser: vi.fn(), navigate: vi.fn() }));
vi.mock('@/domains/admin/api/actions/userActions', () => ({ createUser: m.createUser }));
vi.mock('@/domains/admin/lib/notify', () => ({ notifyResult: vi.fn() }));
vi.mock('@/domains/admin/hooks/useAdminNavigate', () => ({ useAdminNavigate: () => m.navigate }));

afterEach(() => vi.clearAllMocks());

const G1 = '0190a0b0-0000-7000-8000-000000000001';
const G2 = '0190a0b0-0000-7000-8000-000000000002';
const MENUS: MatrixMenu[] = [
  { key: 'content', label: '콘텐츠', parentKey: null, sort: 10, actions: [] },
  { key: 'system', label: '시스템', parentKey: null, sort: 20, actions: [] },
  { key: 'bulletin', label: '주보', parentKey: 'content', sort: 10, actions: ['READ', 'UPDATE'] },
  { key: 'users', label: '사용자', parentKey: 'system', sort: 10, actions: ['READ', 'UPDATE'] },
];
const GROUPS = [
  { id: G1, name: '주보 담당', description: null, locked: false },
  { id: G2, name: '사람 담당', description: null, locked: false },
];
const GRANTS = {
  [G1]: [
    { menuKey: 'bulletin', action: 'READ' as const },
    { menuKey: 'bulletin', action: 'UPDATE' as const },
  ],
  [G2]: [{ menuKey: 'users', action: 'READ' as const }],
};

const renderForm = (departmentLimit: string | null = null) =>
  render(
    <UserCreateForm
      groups={GROUPS}
      ownGroupsOnly={false}
      departmentLimit={departmentLimit}
      menus={MENUS}
      grants={GRANTS}
    />
  );

const fillBasic = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/이름/), '홍길동');
  await user.type(screen.getByLabelText(/이메일/), 'hong@example.com');
  await user.click(screen.getByRole('button', { name: '다음' }));
};

describe('UserCreateForm — 단계로 나눈 새 사용자', () => {
  it('기본 정보가 틀리면 다음으로 가지 않고 그 칸에 오류를 단다', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText('이름을 넣어 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
    expect(screen.queryByText('주보 담당')).toBeNull();
  });

  it('그룹을 고르면 갖게 될 권한이 보이고, 끝낸 단계는 접혀 머리를 누르면 다시 열린다', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);

    // 기본 정보는 한 줄 요약으로 접힌다
    const basic = screen.getByRole('button', { name: /기본 정보/ });
    expect(basic).toHaveAttribute('aria-expanded', 'false');
    expect(basic).toHaveTextContent('홍길동 · hong@example.com');

    // 카드 한 줄 — 그 그룹이 주는 메뉴
    expect(screen.getByText('주보')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /주보 담당/ }));
    expect(screen.getByRole('listitem')).toHaveTextContent('주보 — 조회 · 수정');

    await user.click(basic);
    expect(screen.getByLabelText(/이름/)).toHaveValue('홍길동');
  });

  it('확인 단계에서 계정을 만들고 임시 비밀번호를 보여 준다', async () => {
    m.createUser.mockResolvedValue({ ok: true, data: { id: 'u1', tempPassword: 'temp-1234' } });
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);
    await user.click(screen.getByRole('checkbox', { name: /주보 담당/ }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));

    await waitFor(() => expect(m.createUser).toHaveBeenCalledTimes(1));
    expect(m.createUser).toHaveBeenCalledWith({
      name: '홍길동',
      email: 'hong@example.com',
      groupIds: [G1],
      department: '',
    });
    expect(await screen.findByDisplayValue('temp-1234')).toBeInTheDocument();
  });

  it('서버가 이메일 칸 오류를 주면 기본 정보 단계를 다시 열어 그 칸에 보인다', async () => {
    m.createUser.mockResolvedValue({
      ok: false,
      error: { code: 'DUPLICATE', message: '', fields: { email: ['이미 있는 이메일입니다.'] } },
    });
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));

    expect(await screen.findByText('이미 있는 이메일입니다.')).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일/)).toHaveValue('hong@example.com');
  });

  it('부서 범위가 있으면 담당 부서를 그 부서로 고정해 보낸다', async () => {
    m.createUser.mockResolvedValue({ ok: true, data: { id: 'u1', tempPassword: 't' } });
    const user = userEvent.setup();
    renderForm('INFANT');
    await fillBasic(user);
    expect(screen.getByText('내 담당 부서로만 정할 수 있습니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));
    await waitFor(() =>
      expect(m.createUser).toHaveBeenCalledWith(expect.objectContaining({ department: 'INFANT' }))
    );
  });

  it('담당 부서는 고른 그룹과 상관없이 늘 묻고, 고른 부서를 그대로 보낸다(그 부서 담당자가 관리한다)', async () => {
    m.createUser.mockResolvedValue({ ok: true, data: { id: 'u1', tempPassword: 't' } });
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);
    expect(screen.getByRole('combobox', { name: '담당 부서' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /주보 담당/ }));
    await user.click(screen.getByRole('combobox', { name: '담당 부서' }));
    await user.click(await screen.findByRole('option', { name: '유치부' }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('유치부')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));
    await waitFor(() =>
      expect(m.createUser).toHaveBeenCalledWith({
        name: '홍길동',
        email: 'hong@example.com',
        groupIds: [G1],
        department: 'KINDERGARTEN',
      })
    );
  });

  it('서버가 담당 부서 오류를 주면 역할 단계를 열어 보이고, 고치면 다시 만들 수 있다', async () => {
    m.createUser.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'NOT_ALLOWED',
        message: '',
        fields: { department: ['고를 수 없는 부서입니다.'] },
      },
    });
    m.createUser.mockResolvedValueOnce({ ok: true, data: { id: 'u1', tempPassword: 't' } });
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));

    expect(await screen.findByText('고를 수 없는 부서입니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: '담당 부서' }));
    await user.click(await screen.findByRole('option', { name: '영아부' }));
    expect(screen.queryByText('고를 수 없는 부서입니다.')).toBeNull();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));
    await waitFor(() => expect(m.createUser).toHaveBeenCalledTimes(2));
    expect(m.createUser).toHaveBeenLastCalledWith(
      expect.objectContaining({ department: 'INFANT' })
    );
  });

  it('화면에 없는 칸(«groupIds.0» · «_») 의 서버 오류가 다음 제출을 막지 않는다', async () => {
    m.createUser.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '',
        fields: { 'groupIds.0': ['그룹을 다시 골라 주세요.'], _: ['다시 해 주세요.'] },
      },
    });
    m.createUser.mockResolvedValueOnce({ ok: true, data: { id: 'u1', tempPassword: 't' } });
    const user = userEvent.setup();
    renderForm();
    await fillBasic(user);
    await user.click(screen.getByRole('checkbox', { name: /주보 담당/ }));
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));

    // 그룹 칸이 있는 역할 단계가 다시 열린다
    expect(await screen.findByText('그룹을 다시 골라 주세요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음' }));
    await user.click(screen.getByRole('button', { name: '계정 만들기' }));
    await waitFor(() => expect(m.createUser).toHaveBeenCalledTimes(2));
  });
});
