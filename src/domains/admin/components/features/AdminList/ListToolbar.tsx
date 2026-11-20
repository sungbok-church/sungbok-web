'use client';

import {
  activeConditions,
  type ListQuery,
  listQueryHref,
  type ListSpec,
} from '@/domains/admin/api/listQuery';
import {
  pushRecentSearch,
  readRecentSearches,
  type RecentSearch,
  recentKey,
} from '@/domains/admin/api/recentSearches';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { HistoryIcon, RotateCcwIcon, SearchIcon, XIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export type ListFilter = {
  name: string;
  label: string;
  /** «전체» 는 자동으로 앞에 붙는다 */
  options: { value: string; label: string }[];
};

interface Props {
  /** 최근 검색 조건을 사용자별로 두기 위한 id */
  userId: string;
  query: ListQuery;
  spec: ListSpec;
  filters?: ListFilter[];
  /** 휴지통이 있는 목록이면 «삭제된 항목» 스위치를 그린다 */
  trashable?: boolean;
  searchPlaceholder?: string;
}

const ALL = '__all__';

/**
 * 목록의 검색 조건(설계 6.10 «화면 흐름 표준 › 목록»): 검색어(최근 검색 조건 5개) · 조건 · 기간 · [검색] · [초기화],
 * 아래에 적용된 조건 칩. `/` 를 누르면 검색칸으로. 검색어를 주소에 싣지 않는 목록(새가족)은 최근 검색도 남기지 않는다.
 */
export const ListToolbar = ({
  userId,
  query,
  spec,
  filters = [],
  trashable,
  searchPlaceholder,
}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(query.q);
  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const [recentOpen, setRecentOpen] = useState(false);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const remember = spec.searchInUrl !== false;
  const storeKey = recentKey(userId, pathname);

  const filterLabels = Object.fromEntries(
    filters.map(f => [
      f.name,
      { label: f.label, options: Object.fromEntries(f.options.map(o => [o.value, o.label])) },
    ])
  );
  const conditions = activeConditions(query, filterLabels);

  const go = (patch: Partial<ListQuery>) => {
    const next = listQueryHref(pathname, query, patch, spec);
    if (remember) {
      const nextQuery = { ...query, ...patch, filters: patch.filters ?? query.filters };
      const label = activeConditions(nextQuery, filterLabels)
        .map(c => `${c.label}: ${c.value}`)
        .join(' · ');
      pushRecentSearch(window.localStorage, storeKey, { query: next.split('?')[1] ?? '', label });
    }
    router.push(next);
  };

  // `/` 로 검색칸(글을 쓰는 칸 안에서는 그대로 입력)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = () => go({ q: q.trim(), from, to });
  const reset = () => {
    setQ('');
    setFrom('');
    setTo('');
    router.push(pathname);
  };
  const removeCondition = (key: string) => {
    if (key === 'q') {
      setQ('');
      go({ q: '' });
    } else if (key === 'from' || key === 'to') {
      if (key === 'from') setFrom('');
      else setTo('');
      go({ [key]: '' });
    } else if (key === 'trash') go({ trash: false });
    else {
      const next = { ...query.filters };
      delete next[key];
      go({ filters: next });
    }
  };

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-3">
      <form
        role="search"
        className="flex flex-wrap items-center gap-2"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        {spec.searchInUrl !== false && (
          <div className="relative w-full sm:w-72">
            <label htmlFor="list-search" className="sr-only">
              검색어
            </label>
            <SearchIcon
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              ref={inputRef}
              id="list-search"
              type="search"
              value={q}
              maxLength={100}
              autoComplete="off"
              placeholder={`${searchPlaceholder ?? '검색'}  ( / )`}
              onChange={e => setQ(e.target.value)}
              onFocus={() => {
                setRecent(readRecentSearches(window.localStorage, storeKey));
                setRecentOpen(true);
              }}
              onBlur={() => setTimeout(() => setRecentOpen(false), 150)}
              onKeyDown={e => e.key === 'Escape' && setRecentOpen(false)}
              className="pl-8"
            />
            {recentOpen && recent.length > 0 && (
              <div className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border p-1 shadow-md">
                <p className="text-muted-foreground m-0 px-2 py-1 text-xs">최근 검색 조건</p>
                <ul className="m-0 list-none p-0">
                  {recent.map(r => (
                    <li key={r.query}>
                      <button
                        type="button"
                        className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setRecentOpen(false);
                          router.push(`${pathname}?${r.query}`);
                        }}
                      >
                        <HistoryIcon
                          aria-hidden
                          className="text-muted-foreground size-3.5 shrink-0"
                        />
                        <span className="truncate">{r.label || r.query}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {filters.map(f => (
          <Select
            key={f.name}
            items={[{ value: ALL, label: '전체' }, ...f.options]}
            value={query.filters[f.name] ?? ALL}
            onValueChange={value => {
              const next = { ...query.filters };
              if (!value || value === ALL) delete next[f.name];
              else next[f.name] = String(value);
              go({ filters: next, q: q.trim() });
            }}
          >
            <SelectTrigger aria-label={f.label} className="min-w-32">
              <span className="text-muted-foreground">{f.label}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectGroup>
                <SelectItem value={ALL}>전체</SelectItem>
                {f.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}

        {spec.dateRange && (
          <div className="flex items-center gap-1">
            <label htmlFor="list-from" className="sr-only">
              시작일
            </label>
            <Input
              id="list-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={e => setFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground text-sm">~</span>
            <label htmlFor="list-to" className="sr-only">
              끝일
            </label>
            <Input
              id="list-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => setTo(e.target.value)}
              className="w-36"
            />
          </div>
        )}

        {trashable && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={query.trash} onCheckedChange={checked => go({ trash: checked })} />
            삭제된 항목
          </label>
        )}

        <div className="flex gap-2 sm:ml-auto">
          <Button type="submit">
            <SearchIcon data-icon="inline-start" />
            검색
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" />
            초기화
          </Button>
        </div>
      </form>

      {conditions.length > 0 && (
        <ul aria-label="적용된 조건" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {conditions.map(c => (
            <li key={c.key}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {c.label}: {c.value}
                <button
                  type="button"
                  aria-label={`${c.label} 조건 빼기`}
                  className="hover:bg-muted rounded-sm p-0.5"
                  onClick={() => removeCondition(c.key)}
                >
                  <XIcon aria-hidden className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
