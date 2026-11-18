import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './sidebar';

// 화면 폭: true 면 좁은 화면(md 미만 — shadcn 원본 기준)
const stubViewport = (narrow: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: narrow,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );

const Shell = ({ defaultOpen }: { defaultOpen?: boolean }) => (
  <SidebarProvider defaultOpen={defaultOpen}>
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive>첫 화면</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
    <SidebarTrigger />
  </SidebarProvider>
);

const sidebarState = (container: HTMLElement) =>
  container.querySelector('[data-slot="sidebar"]')?.getAttribute('data-state');

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'sidebar_state=; path=/; max-age=0';
});

describe('Sidebar', () => {
  it('넓은 화면에서 메뉴 버튼을 누르면 펼침 ↔ 접힘이 바뀐다', () => {
    stubViewport(false);
    const { container } = render(<Shell />);
    expect(sidebarState(container)).toBe('expanded');
    fireEvent.click(screen.getByRole('button', { name: '메뉴 접기/펼치기' }));
    expect(sidebarState(container)).toBe('collapsed');
    fireEvent.click(screen.getByRole('button', { name: '메뉴 접기/펼치기' }));
    expect(sidebarState(container)).toBe('expanded');
  });

  it('defaultOpen 이 false 면 접힌 채로 시작한다', () => {
    stubViewport(false);
    const { container } = render(<Shell defaultOpen={false} />);
    expect(sidebarState(container)).toBe('collapsed');
  });

  it('Ctrl+B · Cmd+B 로도 바뀐다', () => {
    stubViewport(false);
    const { container } = render(<Shell />);
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(sidebarState(container)).toBe('collapsed');
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(sidebarState(container)).toBe('expanded');
    fireEvent.keyDown(window, { key: 'b' });
    expect(sidebarState(container)).toBe('expanded');
  });

  it('접힘 상태를 쿠키에 적는다(다음 방문 때 같은 모양으로 그리게)', () => {
    stubViewport(false);
    render(<Shell />);
    fireEvent.click(screen.getByRole('button', { name: '메뉴 접기/펼치기' }));
    expect(document.cookie).toContain('sidebar_state=false');
  });

  it('좁은 화면에서는 메뉴 버튼이 시트를 연다(접힘 상태는 건드리지 않는다)', () => {
    stubViewport(true);
    render(<Shell />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 접기/펼치기' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('첫 화면')).toBeTruthy();
    expect(document.cookie).not.toContain('sidebar_state');
  });

  it('지금 화면의 메뉴에는 data-active 가 붙는다', () => {
    stubViewport(false);
    render(<Shell />);
    expect(
      screen.getByText('첫 화면').closest('[data-slot="sidebar-menu-button"]')
    ).toHaveAttribute('data-active');
  });

  it('SidebarProvider 밖에서 useSidebar 를 쓰면 던진다', () => {
    const Probe = () => {
      useSidebar();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/SidebarProvider/);
    spy.mockRestore();
  });
});
