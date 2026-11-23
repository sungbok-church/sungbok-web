import type { DragEndEvent } from '@dnd-kit/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SortableRows } from '.';

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateMenu: vi.fn(
    async (): Promise<{ ok: boolean; data?: { updatedAt: string }; message: string }> => ({
      ok: true,
      message: '저장했습니다.',
    })
  ),
  reorderMenus: vi.fn(),
  notifyResult: vi.fn(),
  dragEnd: null as null | ((event: DragEndEvent) => void),
}));
vi.mock('@/domains/admin/api/actions/menuActions', () => ({
  updateMenu: m.updateMenu,
  reorderMenus: m.reorderMenus,
}));
vi.mock('@/domains/admin/api/actions/itemActions', () => ({
  updateCode: vi.fn(),
  reorderCodes: vi.fn(),
  updateCategory: vi.fn(),
  reorderCategories: vi.fn(),
}));
vi.mock('@/domains/admin/lib/notify', () => ({ notifyResult: m.notifyResult }));
// 끌기(포인터 · 키보드)는 jsdom 에 자리(좌표)가 없어 흉내 낼 수 없다 — 놓았을 때(onDragEnd)를 직접 부른다
vi.mock('@dnd-kit/core', async importOriginal => {
  const real = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...real,
    DndContext: (props: React.ComponentProps<typeof real.DndContext>) => {
      m.dragEnd = props.onDragEnd ?? null;
      return <real.DndContext {...props} />;
    },
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: m.refresh }) }));
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

  it('저장에 성공하면 router.refresh 를 부르지 않는다 — 화면은 Server Action 이 다시 그려 보낸다', async () => {
    m.updateMenu.mockResolvedValue({
      ok: true,
      data: { updatedAt: 't2' },
      message: '저장했습니다.',
    });
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    const input = screen.getByLabelText('코드 관리 이름');
    fireEvent.change(input, { target: { value: '새 이름' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(input).not.toBeDisabled());
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it('저장에 실패하면(다른 사람이 먼저 고침 등) 지금 값을 다시 읽는다', async () => {
    m.updateMenu.mockResolvedValue({ ok: false, message: '다른 사람이 먼저 고쳤습니다.' });
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    const input = screen.getByLabelText('코드 관리 이름');
    fireEvent.change(input, { target: { value: '새 이름' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(m.refresh).toHaveBeenCalledTimes(1));
  });

  it('이름이 그대로면 저장하지 않는다', () => {
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    fireEvent.blur(screen.getByLabelText('코드 관리 이름'));
    expect(m.updateMenu).not.toHaveBeenCalled();
  });

  it('켜고 끌 수 없으면(toggleable=false) 사용 스위치만 막고 이름은 고친다', () => {
    render(
      <SortableRows
        kind="menus"
        rows={[ROW]}
        editable
        toggleable={false}
        caption="메뉴"
        detailHeader="주소"
      />
    );
    // Base UI 스위치는 span 이라 disabled 대신 aria-disabled 로 막는다
    expect(screen.getByRole('switch', { name: '분류 관리 사용' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByLabelText('코드 관리 이름')).toBeEnabled();
  });

  it('기본은 사용 스위치를 켜고 끈다', () => {
    render(<SortableRows kind="menus" rows={[ROW]} editable caption="메뉴" detailHeader="주소" />);
    expect(screen.getByRole('switch', { name: '분류 관리 사용' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});

const ROWS = ['a', 'b', 'c'].map((name, i) => ({
  id: `0190a0b0-0000-7000-8000-00000000000${i + 1}`,
  label: name,
  defaultLabel: `기본 ${name}`,
  isActive: true,
  updatedAt: 't1',
}));
const [A, B, C] = ROWS.map(r => r.id);
const order = () => screen.getAllByRole('textbox').map(i => (i as HTMLInputElement).value);
const drop = (active: string, over: string | null) =>
  act(() =>
    m.dragEnd?.({ active: { id: active }, over: over && { id: over } } as unknown as DragEndEvent)
  );

describe('SortableRows — 끌어서 순서 바꾸기', () => {
  it('줄마다 이름을 단 손잡이가 있고, 위로 · 아래로 버튼은 없다', () => {
    render(<SortableRows kind="menus" rows={ROWS} editable caption="메뉴" detailHeader="주소" />);
    expect(screen.getByRole('button', { name: 'a 순서 옮기기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '위로' })).toBeNull();
    expect(screen.queryByRole('button', { name: '아래로' })).toBeNull();
  });

  it('고칠 권한이 없으면 손잡이를 쓸 수 없다', () => {
    render(
      <SortableRows kind="menus" rows={ROWS} editable={false} caption="메뉴" detailHeader="주소" />
    );
    expect(screen.getByRole('button', { name: 'a 순서 옮기기' })).toBeDisabled();
  });

  it('놓으면 바로 그 순서로 보이고, 무리 전체의 새 순서를 한 번에 저장한다', async () => {
    let finish!: (v: { ok: true; message: string }) => void;
    m.reorderMenus.mockReturnValue(new Promise(r => (finish = r)));
    render(<SortableRows kind="menus" rows={ROWS} editable caption="메뉴" detailHeader="주소" />);
    drop(A, C);
    expect(m.reorderMenus).toHaveBeenCalledTimes(1);
    expect(m.reorderMenus).toHaveBeenCalledWith({ ids: [B, C, A] });
    expect(order()).toEqual(['b', 'c', 'a']);
    await act(async () => finish({ ok: true, message: '순서를 바꿨습니다.' }));
    expect(m.notifyResult).toHaveBeenCalledWith({ ok: true, message: '순서를 바꿨습니다.' });
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it('저장에 실패하면 서버의 순서로 되돌리고 알린 뒤 지금 값을 다시 읽는다', async () => {
    const failed = { ok: false, error: { code: 'NOT_ALLOWED', message: '목록이 바뀌었습니다' } };
    m.reorderMenus.mockResolvedValue(failed);
    render(<SortableRows kind="menus" rows={ROWS} editable caption="메뉴" detailHeader="주소" />);
    drop(C, A);
    await vi.waitFor(() => expect(m.refresh).toHaveBeenCalledTimes(1));
    expect(m.notifyResult).toHaveBeenCalledWith(failed);
    expect(order()).toEqual(['a', 'b', 'c']);
  });

  it('제자리 · 목록 밖에 놓으면 저장하지 않는다', () => {
    render(<SortableRows kind="menus" rows={ROWS} editable caption="메뉴" detailHeader="주소" />);
    drop(B, B);
    drop(B, null);
    expect(m.reorderMenus).not.toHaveBeenCalled();
  });
});
