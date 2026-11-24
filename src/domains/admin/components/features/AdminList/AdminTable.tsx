'use client';

import { saveListMemory } from '@/domains/admin/lib/listMemory';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  hasConditions,
  type ListQuery,
  listQueryHref,
  type ListSpec,
  PAGE_SIZES,
} from '@/domains/admin/lib/listQuery';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/shared/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type TableColumn = {
  key: string;
  header: string;
  /** 이 칸으로 정렬할 수 있으면 정렬 이름(ListSpec.sorts 의 값) */
  sortField?: string;
  className?: string;
  /** 머리 글자를 화면에서 숨긴다(스크린리더만) — 버튼만 있는 칸 */
  srOnly?: boolean;
};

export type TableRowData = {
  id: string;
  /** 줄을 누르면 가는 상세 주소 — 상세가 없는 목록(변경 이력)은 비운다 */
  href?: string;
  /** 칸 key → 서버가 그린 내용 */
  cells: Record<string, ReactNode>;
  /** 좁은 화면의 카드 */
  card: ReactNode;
};

const SelectionContext = createContext<{ ids: string[]; clear: () => void }>({
  ids: [],
  clear: () => {},
});
/** 일괄 처리 버튼(bulk)이 고른 줄의 id 를 읽는다 */
export const useSelectedIds = () => useContext(SelectionContext);

interface Props {
  query: ListQuery;
  spec: ListSpec;
  columns: TableColumn[];
  rows: TableRowData[];
  total: number;
  /** 줄 체크 + 일괄 처리 버튼(고른 줄이 있을 때 표 위에 뜬다) */
  bulk?: ReactNode;
  empty: { title: string; description?: string; create?: { href: string; label: string } };
}

const PAGE_WINDOW = 5;

/**
 * 관리자 목록의 표(설계 6.10 «화면 흐름 표준 › 목록»): 머리를 눌러 정렬 · 줄을 누르면 상세 · 줄 체크 일괄 처리 ·
 * 아래 «총 N건 · 쪽당 개수 · 쪽 번호». 좁은 화면은 카드. 그린 쪽의 주소와 줄 순서를 기억해 상세의 [목록] · 이전/다음이 쓴다.
 */
export const AdminTable = ({ query, spec, columns, rows, total, bulk, empty }: Props) => {
  const router = useRouter();
  const navigate = useAdminNavigate();
  const pathname = usePathname();
  const [selected, setSelected] = useState<string[]>([]);
  const href = (patch: Partial<ListQuery>) => listQueryHref(pathname, query, patch, spec);
  const pages = Math.max(1, Math.ceil(total / query.size));
  const filtered = hasConditions(query);

  // 상세의 [목록] · 이전/다음이 쓰는 기억 — 그린 쪽이 바뀔 때마다
  const ids = useMemo(() => rows.map(r => r.id), [rows]);
  const currentHref = href({ page: query.page });
  useEffect(() => {
    saveListMemory(window.sessionStorage, pathname, { href: currentHref, ids });
  }, [pathname, currentHref, ids]);

  const selection = useMemo(() => ({ ids: selected, clear: () => setSelected([]) }), [selected]);
  const allChecked = rows.length > 0 && selected.length === rows.length;

  const openRow = (e: MouseEvent, rowHref: string | undefined) => {
    if (!rowHref) return;
    // 칸 안의 링크 · 버튼 · 체크는 그대로 둔다
    if ((e.target as HTMLElement).closest('a, button, input, [role="checkbox"], [role="menuitem"]'))
      return;
    if (e.metaKey || e.ctrlKey) window.open(rowHref, '_blank');
    else navigate(rowHref);
  };

  const sortHeader = (column: TableColumn) => {
    if (column.srOnly) return <span className="sr-only">{column.header}</span>;
    if (!column.sortField) return column.header;
    const active = query.sort === column.sortField;
    const nextDir = active ? (query.dir === 'asc' ? 'desc' : 'asc') : 'asc';
    const Icon = !active ? ArrowUpDownIcon : query.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon;
    return (
      <Link
        href={href({ sort: column.sortField, dir: nextDir })}
        className="hover:text-foreground inline-flex items-center gap-1"
        aria-label={`${column.header} ${active ? (query.dir === 'asc' ? '오름차순' : '내림차순') : ''} 정렬 바꾸기`}
      >
        {column.header}
        <Icon aria-hidden className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
      </Link>
    );
  };

  // 마지막 쪽을 넘긴 주소(지우고 돌아왔거나 쪽당 개수를 늘렸다) — «등록된 항목 없음» 이 아니라 1쪽으로 가는 길을
  if (rows.length === 0 && query.page > 1) {
    return (
      <div className="flex flex-col gap-3">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>이 쪽에는 항목이 없습니다</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={href({ page: 1 })} />}
            >
              1쪽으로
            </Button>
          </EmptyContent>
        </Empty>
        {pages > 1 && (
          <div className="flex justify-end">
            <Pager page={Math.min(query.page, pages)} pages={pages} href={page => href({ page })} />
          </div>
        )}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>{filtered ? '조건에 맞는 항목이 없습니다' : empty.title}</EmptyTitle>
          {!filtered && empty.description && (
            <EmptyDescription>{empty.description}</EmptyDescription>
          )}
        </EmptyHeader>
        <EmptyContent>
          {filtered ? (
            <Button variant="outline" nativeButton={false} render={<Link href={pathname} />}>
              조건 초기화
            </Button>
          ) : (
            empty.create && (
              <Button nativeButton={false} render={<Link href={empty.create.href} />}>
                {empty.create.label}
              </Button>
            )
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <SelectionContext.Provider value={selection}>
      <div className="flex flex-col gap-3">
        {bulk && selected.length > 0 && (
          <div className="bg-muted flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
            <span className="text-sm font-medium tabular-nums">{selected.length}개 선택</span>
            {bulk}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected([])}>
              선택 해제
            </Button>
          </div>
        )}

        {/* 넓은 화면 — 표 */}
        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {bulk && (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="이 쪽 모두 고르기"
                      checked={allChecked}
                      onCheckedChange={on => setSelected(on ? ids : [])}
                    />
                  </TableHead>
                )}
                {columns.map(c => (
                  <TableHead key={c.key} className={c.className}>
                    {sortHeader(c)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={selected.includes(row.id) ? 'selected' : undefined}
                  className={row.href ? 'cursor-pointer' : undefined}
                  onClick={e => openRow(e, row.href)}
                  // 줄은 링크가 아니라 미리 받기가 없다 — 마우스를 올리면 그 화면의 틀을 받아 두어, 누르는 순간
                  // «불러오는 중» 이 뜨게 한다(안 받아 두면 서버 응답이 올 때까지 화면이 멈춰 있다)
                  onMouseEnter={row.href ? () => router.prefetch(row.href!) : undefined}
                >
                  {bulk && (
                    <TableCell>
                      <Checkbox
                        aria-label="이 줄 고르기"
                        checked={selected.includes(row.id)}
                        onCheckedChange={on =>
                          setSelected(prev =>
                            on ? [...prev, row.id] : prev.filter(id => id !== row.id)
                          )
                        }
                      />
                    </TableCell>
                  )}
                  {columns.map(c => (
                    <TableCell key={c.key} className={c.className}>
                      {row.cells[c.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 좁은 화면 — 카드 */}
        <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
          {rows.map(row => (
            <li key={row.id}>
              {row.href ? (
                <Link href={row.href} className="block rounded-xl">
                  {row.card}
                </Link>
              ) : (
                row.card
              )}
            </li>
          ))}
        </ul>

        {/* 아래 — 총 건수 · 쪽당 개수 · 쪽 번호 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <span className="tabular-nums">총 {total.toLocaleString('ko-KR')}건</span>
            <Select
              items={PAGE_SIZES.map(n => ({ value: String(n), label: `${n}개씩` }))}
              value={String(query.size)}
              onValueChange={value => {
                const size = Number(value);
                // 마지막에 고른 쪽당 개수를 기억한다(서버가 다음 목록에서 읽는다)
                document.cookie = `admin_list_size=${size}; path=/admin; max-age=31536000; samesite=lax`;
                navigate(href({ size }));
              }}
            >
              <SelectTrigger size="sm" aria-label="쪽당 개수">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                <SelectGroup>
                  {PAGE_SIZES.map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}개씩
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {pages > 1 && (
            <Pager page={Math.min(query.page, pages)} pages={pages} href={page => href({ page })} />
          )}
        </div>
      </div>
    </SelectionContext.Provider>
  );
};

const Pager = ({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) => {
  const start = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), pages - PAGE_WINDOW + 1));
  const numbers = Array.from({ length: Math.min(PAGE_WINDOW, pages) }, (_, i) => start + i);
  const nav = (target: number, label: string, icon: ReactNode, disabled: boolean) => (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      disabled={disabled}
      nativeButton={false}
      render={disabled ? <span /> : <Link href={href(target)} />}
    >
      {icon}
    </Button>
  );
  return (
    <nav aria-label="쪽 넘기기" className="flex items-center gap-1">
      {nav(1, '첫 쪽', <ChevronsLeftIcon />, page <= 1)}
      {nav(page - 1, '이전 쪽', <ChevronLeftIcon />, page <= 1)}
      {numbers.map(n => (
        <Button
          key={n}
          variant={n === page ? 'default' : 'ghost'}
          size="icon"
          aria-current={n === page ? 'page' : undefined}
          nativeButton={false}
          render={<Link href={href(n)} />}
        >
          {n}
        </Button>
      ))}
      {nav(page + 1, '다음 쪽', <ChevronRightIcon />, page >= pages)}
      {nav(pages, '마지막 쪽', <ChevronsRightIcon />, page >= pages)}
    </nav>
  );
};
