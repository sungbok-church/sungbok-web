'use client';

import {
  activeConditions,
  canApplyDates,
  canResetList,
  hasConditions,
  type ListQuery,
  listQueryHref,
  type ListSpec,
  parseListQuery,
} from '@/domains/admin/lib/listQuery';
import {
  pushRecentSearch,
  readRecentSearches,
  type RecentSearch,
  recentKey,
} from '@/domains/admin/lib/recentSearches';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { useKeyShortcut } from '@/domains/admin/hooks/useKeyShortcut';
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
import { HistoryIcon, RotateCcwIcon, SearchIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type KeyboardEvent, useRef, useState } from 'react';

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
/** 칸에 쓰다가 적용하는 값 — 검색어 · 기간 */
type Field = 'q' | 'from' | 'to';
type Drafts = Record<Field, string>;
const CLEAN: Record<Field, boolean> = { q: false, from: false, to: false };

/** 쪽당 개수도 기본값으로 — 기억해 둔 개수(쿠키)를 지운다(남겨 두면 서버가 그 개수로 다시 그린다) */
const forgetListSize = () => {
  document.cookie = 'admin_list_size=; path=/admin; max-age=0; samesite=lax';
};

/** Enter(한글 조합 중 Enter 는 칸이 건너뛰고 폼 제출이 받는다) */
const isEnter = (e: KeyboardEvent) => e.key === 'Enter' && !e.nativeEvent.isComposing;

/**
 * 목록의 검색 조건(설계 6.10 «화면 흐름 표준 › 목록») — 카드 없이 한 줄: 검색어 · 조건 고르기 · 기간 · [초기화].
 * 칸마다 제 값만 바꾸고, 이동할 주소는 언제나 «적용된 값»(주소 · 방금 보내서 주소가 아직 따라오지 않은 값) 위에 그 하나만
 * 얹어 만든다 — 다른 칸에 쓰다 만 값은 싣지 않는다.
 * - 조건 고르기 · «삭제된 항목»: 바로. 검색어: Enter. 기간: 두 칸이 각각 비었거나 다 고른 날짜이고 적용된 값과 다를 때만
 *   [적용](또는 Enter) — 두 날짜를 함께 보낸다. 고르는 중 · 칸을 떠날 때는 가지 않는다.
 * - 주소가 바뀌면(뒤로 가기 · 다른 칸 · «조건 초기화») 손대지 않은 칸만 주소 값으로 맞춘다 — 고치던 칸은 지우지 않는다.
 * - [초기화]: 조건이 있거나 정렬 · 쪽당 개수가 기본값과 다를 때(`canResetList`). 주소가 이미 맨 주소면(기억한 쪽당 개수만
 *   다르면) 서버가 다시 그리게 한다.
 * - 최근 검색 조건 5개: 조건이 있는 이동만 남긴다. 검색어를 주소에 싣지 않는 목록(개인정보)은 남기지 않는다.
 * `/` 를 누르면 검색칸으로.
 */
export const ListToolbar = ({
  userId,
  query,
  spec,
  filters = [],
  trashable,
  searchPlaceholder,
}: Props) => {
  const navigate = useAdminNavigate();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Drafts>({ q: query.q, from: query.from, to: query.to });
  // 적용한 뒤 손댄 칸 — 주소가 바뀌어도 이 칸의 값은 지우지 않는다
  const [dirty, setDirty] = useState(CLEAN);
  // 방금 보낸 목록 상태(주소가 아직 따라오지 않았다) — 새 이동은 앞 이동을 버리므로 다음 이동은 이 위에 얹는다
  const [sent, setSent] = useState<ListQuery | null>(null);
  // 주소가 바뀌면 손대지 않은 칸을 주소 값으로 맞춘다 — 그리는 중에 맞춘다(effect 로 맞추면 옛 값이 한 번 그려진다).
  // 키를 다시 붙여 통째로 새로 그리지 않는다: Enter 로 검색하면 검색칸의 포커스가 사라진다
  const currentHref = listQueryHref(pathname, query, {}, spec);
  const [syncedHref, setSyncedHref] = useState(currentHref);
  if (syncedHref !== currentHref) {
    setSyncedHref(currentHref);
    setSent(null);
    const keep = (f: Field) => dirty[f] && drafts[f] !== query[f];
    setDrafts({
      q: keep('q') ? drafts.q : query.q,
      from: keep('from') ? drafts.from : query.from,
      to: keep('to') ? drafts.to : query.to,
    });
    setDirty({ q: keep('q'), from: keep('from'), to: keep('to') });
  }
  const applied = sent ?? query;
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
  const resettable = canResetList(query, spec);
  const [partialDates, setPartialDates] = useState<{ from?: boolean; to?: boolean }>({});
  const datesReady = canApplyDates(drafts, applied, partialDates);

  const go = (next: ListQuery) => {
    const href = listQueryHref(pathname, next, {}, spec);
    setSent(next);
    if (remember && hasConditions(next)) {
      const label = activeConditions(next, filterLabels)
        .map(c => `${c.label}: ${c.value}`)
        .join(' · ');
      pushRecentSearch(window.localStorage, storeKey, { query: href.split('?')[1] ?? '', label });
    }
    navigate(href);
  };
  /** 적용된 값에 이 칸의 값만 얹어 간다(1쪽으로) */
  const apply = (patch: Partial<ListQuery>) => go({ ...applied, ...patch, page: 1 });

  const edit = (field: Field, value: string) => {
    setDrafts(d => ({ ...d, [field]: value }));
    setDirty(d => ({ ...d, [field]: true }));
  };
  /** typed — 폼 제출(한글 입력 중의 Enter · 휴대폰 «검색» 키)은 칸의 지금 값을 직접 넘긴다(상태가 아직 안 바뀌었을 수 있다) */
  const applySearch = (typed?: string) => {
    const value = (typed ?? drafts.q).trim();
    setDirty(d => ({ ...d, q: false }));
    // 바꾼 것 없이 Enter 는 가지 않는다(3쪽에서 1쪽으로 튀지 않게)
    if (value !== applied.q) apply({ q: value });
  };
  const applyDates = () => {
    // 빈 칸에 연도만 친 것처럼 값('')이 안 바뀐 반쯤 입력은 onChange 가 오지 않는다 — 누르는 순간 칸을 직접 본다
    if (!datesReady || fromRef.current?.validity.badInput || toRef.current?.validity.badInput)
      return;
    setDirty(d => ({ ...d, from: false, to: false }));
    apply({ from: drafts.from, to: drafts.to });
  };
  /** 최근 검색 · [초기화] 처럼 모든 칸을 한 번에 바꾸는 이동 — 칸도 그 값으로 */
  const replaceAll = (next: ListQuery) => {
    setDrafts({ q: next.q, from: next.from, to: next.to });
    // 반쯤 친 날짜 칸은 값이 '' 라 React 가 다시 쓰지 않는다 — 칸을 직접 비우고 «반쯤» 표시도 지운다
    if (fromRef.current && fromRef.current.validity.badInput) fromRef.current.value = '';
    if (toRef.current && toRef.current.validity.badInput) toRef.current.value = '';
    setPartialDates({});
    setDirty(CLEAN);
    setSent(next);
  };

  // `/` 로 검색칸(글을 쓰는 칸 안에서는 그대로 입력)
  useKeyShortcut(
    e => e.key === '/' && !e.metaKey && !e.ctrlKey,
    () => inputRef.current?.focus()
  );

  const reset = () => {
    forgetListSize();
    const bare = window.location.search === '';
    // 보내 둔 이동이 있으면 맨 주소로 가서 그 이동을 버린다
    if (sent !== null || !bare) navigate(pathname);
    // 이미 맨 주소면(기억한 쪽당 개수만 달랐다) 같은 주소라 다시 그리지 않으니 직접 다시 그리게 한다
    if (bare) router.refresh();
    replaceAll(parseListQuery({}, spec));
  };

  return (
    <form
      role="search"
      // 브라우저 입력 검사(min · max · 반쯤 친 날짜) 말풍선이 검색을 막지 않게 — 날짜는 [적용] 이 직접 본다
      noValidate
      className="flex flex-wrap items-center gap-2"
      // 검색 버튼이 없다 — 칸마다 Enter 를 직접 받고, 한글 입력 중의 Enter(칸이 건너뛴 것)는 여기서 받는다.
      // 날짜 칸의 Enter 는 칸에서 막아(preventDefault) 이 제출로 오지 않는다.
      onSubmit={e => {
        e.preventDefault();
        setRecentOpen(false);
        applySearch(inputRef.current?.value);
      }}
    >
      {spec.searchInUrl !== false && (
        <div className="relative w-full sm:w-64">
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
            enterKeyHint="search"
            value={drafts.q}
            maxLength={100}
            autoComplete="off"
            placeholder={searchPlaceholder ?? '검색'}
            aria-keyshortcuts="/"
            onChange={e => edit('q', e.target.value)}
            onFocus={() => {
              setRecent(readRecentSearches(window.localStorage, storeKey));
              setRecentOpen(true);
            }}
            onBlur={() => setTimeout(() => setRecentOpen(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Escape') setRecentOpen(false);
              if (!isEnter(e)) return;
              e.preventDefault();
              setRecentOpen(false);
              applySearch();
            }}
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
                        replaceAll(
                          parseListQuery(Object.fromEntries(new URLSearchParams(r.query)), spec, {
                            size: query.size,
                          })
                        );
                        navigate(`${pathname}?${r.query}`);
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
          value={applied.filters[f.name] ?? ALL}
          onValueChange={value => {
            const next = { ...applied.filters };
            if (!value || value === ALL) delete next[f.name];
            else next[f.name] = String(value);
            apply({ filters: next });
          }}
        >
          <SelectTrigger aria-label={f.label}>
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
            ref={fromRef}
            id="list-from"
            type="date"
            value={drafts.from}
            max={drafts.to || undefined}
            onChange={e => {
              edit('from', e.target.value);
              setPartialDates(p => ({ ...p, from: e.target.validity.badInput }));
            }}
            onKeyDown={e => {
              if (!isEnter(e)) return;
              e.preventDefault();
              applyDates();
            }}
            className="w-36"
          />
          <span aria-hidden className="text-muted-foreground text-sm">
            ~
          </span>
          <label htmlFor="list-to" className="sr-only">
            끝일
          </label>
          <Input
            ref={toRef}
            id="list-to"
            type="date"
            value={drafts.to}
            min={drafts.from || undefined}
            onChange={e => {
              edit('to', e.target.value);
              setPartialDates(p => ({ ...p, to: e.target.validity.badInput }));
            }}
            onKeyDown={e => {
              if (!isEnter(e)) return;
              e.preventDefault();
              applyDates();
            }}
            className="w-36"
          />
          {datesReady && (
            <Button type="button" variant="outline" onClick={applyDates}>
              적용
            </Button>
          )}
        </div>
      )}

      {trashable && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={applied.trash} onCheckedChange={checked => apply({ trash: checked })} />
          삭제된 항목
        </label>
      )}

      {resettable && (
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          <RotateCcwIcon data-icon="inline-start" />
          초기화
        </Button>
      )}
      {/* 보이지 않는 제출 버튼 — 입력칸(조건 고르기가 넣는 숨은 칸 포함)이 여럿인 폼은 제출 버튼이 없으면 브라우저가
          Enter 로 제출하지 않는다. 그러면 한글 입력 중의 Enter · 휴대폰 «검색» 키(칸이 건너뛴 것)가 아무 일도 하지 않는다 */}
      <button type="submit" tabIndex={-1} aria-hidden className="sr-only" />
    </form>
  );
};
