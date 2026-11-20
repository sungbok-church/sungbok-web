import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SortableRows } from '.';

const m = vi.hoisted(() => ({
  updateMenu: vi.fn(
    async (): Promise<{ ok: boolean; data?: { updatedAt: string }; message: string }> => ({
      ok: true,
      message: '저장했습니다.',
    })
  ),
}));
vi.mock('@/domains/admin/api/menuActions', () => ({ updateMenu: m.updateMenu, moveMenu: vi.fn() }));
vi.mock('@/domains/admin/api/codeActions', () => ({ updateCode: vi.fn(), moveCode: vi.fn() }));
vi.mock('@/domains/admin/api/notify', () => ({ notifyResult: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/shared/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: () => null,
}));

afterEach(() => vi.clearAllMocks());

const ROW = {
  id: '0190a0b0-0000-7000-8000-000000000001',
  label: '분류 관리',
  defaultLabel: '코드 관리',
  isActive: true,
  updatedAt: 't1',
};

describe('SortableRows', () => {
  it('바꾼 이름을 지우고 Enter 하면 «기본 이름으로»(빈 이름) 저장한다', async () => {
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    const input = screen.getByLabelText('코드 관리 이름');
    expect(input).toHaveValue('분류 관리');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() =>
      expect(m.updateMenu).toHaveBeenCalledWith({
        id: ROW.id,
        updatedAt: 't1',
        label: '',
        isActive: true,
      })
    );
  });

  it('Enter 로 저장한 뒤 바로 칸을 떠나도 다시 저장하지 않는다(«다른 사람이 먼저 고쳤습니다» 가 뜨지 않게)', async () => {
    m.updateMenu.mockResolvedValue({
      ok: true,
      data: { updatedAt: 't2' },
      message: '저장했습니다.',
    });
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    const input = screen.getByLabelText('코드 관리 이름');
    fireEvent.change(input, { target: { value: '새 이름' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input); // 저장 요청 중에 떠남
    await vi.waitFor(() => expect(m.updateMenu).toHaveBeenCalledTimes(1));
    fireEvent.blur(input); // 저장이 끝났지만 화면이 아직 새로 그려지기 전에 떠남
    await new Promise(r => setTimeout(r, 0));
    expect(m.updateMenu).toHaveBeenCalledTimes(1);
  });

  it('저장한 뒤 화면이 새로 그려지기 전에 또 고치면 방금 받은 판(updatedAt)으로 저장한다', async () => {
    m.updateMenu.mockResolvedValue({
      ok: true,
      data: { updatedAt: 't2' },
      message: '저장했습니다.',
    });
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    const input = screen.getByLabelText('코드 관리 이름');
    fireEvent.change(input, { target: { value: '첫째' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: '둘째' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(m.updateMenu).toHaveBeenCalledTimes(2));
    expect(m.updateMenu).toHaveBeenLastCalledWith({
      id: ROW.id,
      updatedAt: 't2',
      label: '둘째',
      isActive: true,
    });
  });

  it('이름이 그대로면 저장하지 않는다', () => {
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    fireEvent.blur(screen.getByLabelText('코드 관리 이름'));
    expect(m.updateMenu).not.toHaveBeenCalled();
  });
});
