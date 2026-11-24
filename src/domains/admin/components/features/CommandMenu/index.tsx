'use client';

import { type AdminNavGroup } from '@/domains/admin/lib/adminNav';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { useContentSearch } from '@/domains/admin/hooks/useContentSearch';
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
 * 찾기(⌘K · Ctrl+K) — 권한이 있는 메뉴 이름과 콘텐츠 글로 바로 간다(설계 6.10, 글은 패키지 B5).
 * 메뉴는 화면에서 바로 거르고, 글은 2자 이상 치면 서버에 묻는다(그 사람이 조회 권한을 가진 메뉴의 글만 — useContentSearch).
 * 위쪽 막대의 «찾기» 버튼으로도 연다(단축키를 모르는 사람).
 */
export const CommandMenu = ({ nav }: { nav: AdminNavGroup[] }) => {
  const navigate = useAdminNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { items: hits, pending } = useContentSearch(open ? query : '');
  const menuLabel = (key: string) =>
    nav.flatMap(g => g.items).find(i => i.key === key)?.label ?? key;
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
        찾기
        <kbd className="ml-auto font-sans text-xs">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="찾기"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) setQuery('');
        }}
        title="찾기"
        description="메뉴 이름이나 글 제목으로 찾아 바로 갑니다"
      >
        <Command>
          <CommandInput placeholder="메뉴 · 글 제목" value={query} onValueChange={setQuery} />
          <CommandList>
            {/* 글 답을 기다리는 동안은 «없습니다» 를 띄우지 않는다 */}
            {!pending && <CommandEmpty>찾는 것이 없습니다.</CommandEmpty>}
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
            {hits.length > 0 && (
              <CommandGroup heading="글">
                {hits.map(hit => (
                  <CommandItem
                    key={`${hit.menu}:${hit.id}`}
                    // 서버가 이미 거른 글 — 화면의 거르기에서 빠지지 않게 검색어를 값에 넣는다
                    value={`${query} ${hit.title} ${hit.menu} ${hit.id}`}
                    onSelect={() => {
                      setOpen(false);
                      setQuery('');
                      navigate(hit.href);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {menuLabel(hit.menu)}
                      {hit.detail && ` · ${hit.detail}`}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
