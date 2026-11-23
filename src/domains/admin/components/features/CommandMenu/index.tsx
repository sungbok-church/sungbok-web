'use client';

import { type AdminNavGroup } from '@/domains/admin/lib/adminNav';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { useCommandShortcut } from '@/domains/admin/hooks/useKeyShortcut';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

/**
 * 메뉴 찾기(⌘K · Ctrl+K) — 권한이 있는 메뉴 이름으로 바로 간다(설계 6.10). 글 찾기는 콘텐츠 화면이 생기면(패키지 B) 더한다.
 * 위쪽 막대의 «찾기» 버튼으로도 연다(단축키를 모르는 사람).
 */
export const CommandMenu = ({ nav }: { nav: AdminNavGroup[] }) => {
  const navigate = useAdminNavigate();
  const [open, setOpen] = useState(false);
  useCommandShortcut(() => setOpen(true));

  return (
    <>
      {/* 스타터의 SearchInput 처럼 입력칸 모양의 버튼 — 좁은 화면은 아이콘만 */}
      <Button
        variant="outline"
        className="text-muted-foreground hidden w-44 justify-start md:inline-flex lg:w-64"
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" />
        메뉴 찾기
        <kbd className="ml-auto font-sans text-xs">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="메뉴 찾기"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="메뉴 찾기"
        description="메뉴 이름으로 찾아 바로 갑니다"
      >
        <Command>
          <CommandInput placeholder="메뉴 이름" />
          <CommandList>
            <CommandEmpty>찾는 메뉴가 없습니다.</CommandEmpty>
            {nav.map(group => (
              <CommandGroup key={group.key} heading={group.label || '바로 가기'}>
                {group.items.map(item => (
                  <CommandItem
                    key={item.key}
                    value={`${item.label} ${item.key}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(item.href);
                    }}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
