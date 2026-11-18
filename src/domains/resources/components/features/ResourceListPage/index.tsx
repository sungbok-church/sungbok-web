'use client';

import type { Resource, ResourceSection } from '@/domains/resources/api/resource.types';
import {
  countLabel,
  dateLabel,
  filterOptions,
  findResources,
  groupLabel,
} from '@/domains/resources/api/resourceList';
import {
  rememberListLeave,
  requestDocumentOpen,
  takeListReturn,
  useResourceListState,
} from '@/domains/resources/api/resourceListState';
import { resourcePath } from '@/domains/resources/config/resourceSections';
import { FOCUS, HIT_36, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { ChipRow } from '@/shared/components/features/ChipRow';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import { isPlainClick } from '@/shared/lib/isPlainClick';
import { cn } from '@/shared/lib/utils';
import { Download, FileText, Image as ImageIcon, Search } from 'lucide-react';
import { useLenis } from 'lenis/react';
import Link from 'next/link';
import { useId, useLayoutEffect, useMemo, useRef } from 'react';

interface Props {
  section: ResourceSection;
  /** 그 분류의 공개 자료 — 최신순(resourceRepository.list) */
  resources: readonly Resource[];
}

const SORTS = [
  { value: 'new', label: '최신순' },
  { value: 'old', label: '오래된 순' },
] as const;

/**
 * 자료 한 줄 — 줄(제목)을 누르면 문서 열람 페이지로, 오른쪽 아이콘은 원본 파일을 올린 이름 그대로 내려받는다(별개 동작).
 * 확장자·용량은 적지 않는다(A안). 첨부 없이 이미지로만 제공되는 자료는 내려받을 원본이 없어 아이콘을 두지 않는다.
 */
const Row = ({ section, resource: r }: { section: ResourceSection; resource: Resource }) => {
  const date = dateLabel(r);
  const Icon = r.file ? FileText : ImageIcon;
  return (
    <li className="border-b1-border grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2 border-b md:gap-5">
      <Link
        href={resourcePath(section, r.id)}
        data-resource-id={r.id}
        // 화면에 보이는 줄마다 열람 페이지를 미리 받지 않는다 — 줄 수만큼 서버가 페이지를 만든다
        prefetch={false}
        onClick={e => {
          if (!isPlainClick(e)) return; // 새 탭으로 여는 클릭 — 이 탭은 그대로다
          rememberListLeave(section, { y: window.scrollY, id: r.id }); // «자료 목록» 으로 돌아올 자리
          requestDocumentOpen(r.id);
        }}
        className={cn(
          'group flex min-w-0 items-start gap-3 rounded-lg py-4 md:items-center md:gap-5 md:py-5',
          FOCUS
        )}
      >
        <span className="border-b1-border bg-b1-surface text-b1-accent mt-0.5 grid h-12 w-9 shrink-0 place-items-center rounded-md border md:mt-0 md:h-[60px] md:w-12">
          <Icon aria-hidden className="size-[18px] md:size-[22px]" />
        </span>
        <div className="grid min-w-0 gap-1">
          <div className="text-caption flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="text-b1-accent font-bold">{groupLabel(r)}</span>
            {date && (
              <time dateTime={r.date ?? r.year} className="text-b1-sub tabular-nums">
                {date}
              </time>
            )}
          </div>
          <h3 className="text-b1-text group-hover:text-b1-accent text-body md:text-title duration-fast leading-normal font-semibold wrap-anywhere transition-colors">
            {r.title}
          </h3>
          {r.passage && <p className="text-b1-sub text-caption">{r.passage}</p>}
        </div>
      </Link>
      {r.file && (
        <a
          href={r.file.url}
          download={r.file.name}
          aria-label={`${r.title} 내려받기`}
          className={cn(
            'text-b1-sub hover:bg-b1-accent-soft hover:text-b1-accent duration-fast grid size-11 place-items-center rounded-lg transition-colors',
            FOCUS
          )}
        >
          <Download aria-hidden className="size-[19px]" />
        </a>
      )}
    </li>
  );
};

/**
 * 자료 목록 페이지(/resources/분류) — A안(빠른 목록형): 「자료 찾기」 검색 · 분류 칩 · 결과 수와 정렬 · 글 중심의 목록.
 * 서버가 실어 보낸 그 분류의 자료를 화면에서 거른다(치는 대로 바뀐다). 조건은 화면 밖에 둔다(useResourceListState) —
 * 문서를 보고 «자료 목록» 으로 돌아오면 조건과 보던 자리가 그대로다.
 */
export const ResourceListPage = ({ section, resources }: Props) => {
  const { state, setQuery, reset } = useResourceListState(section);
  const headId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lenis = useLenis(); // 사이트 스크롤은 Lenis 가 맡는다(_provider)
  const options = useMemo(() => filterOptions(section, resources), [section, resources]);
  const rows = useMemo(() => findResources(resources, state), [resources, state]);

  // 열람 페이지의 «자료 목록» 으로 돌아왔으면 보던 자리로 가고(그 링크는 화면을 맨 위로 올리지 않는다), 눌렀던 줄에
  // 키보드 포커스를 되돌린다. 브라우저 «뒤로» 는 브라우저·Next 가 자리를 되찾아 주고, 메뉴로 새로 들어온 경우는 맨 위에서 시작한다.
  // 그리기 전에 옮긴다(useLayoutEffect) — 열람 페이지의 화면 위치로 한 번 그려졌다가 튀지 않게.
  useLayoutEffect(() => {
    const back = takeListReturn(section);
    if (!back) return;
    if (lenis) {
      // Lenis 는 페이지 크기를 나중에(크기 변화 감지로) 다시 잰다 — 그대로 가면 방금 떠난 열람 페이지의
      // 스크롤 한도에 잘려 엉뚱한 곳에 선다. 지금 크기로 먼저 다시 재게 한다.
      lenis.resize();
      lenis.scrollTo(back.y, { immediate: true, force: true });
    } else window.scrollTo({ top: back.y, behavior: 'instant' });
    const row = [...(listRef.current?.querySelectorAll<HTMLElement>('a[data-resource-id]') ?? [])];
    row.find(a => a.dataset.resourceId === back.id)?.focus({ preventScroll: true });
  }, [section, lenis]);

  if (resources.length === 0) {
    return <p className="text-b1-sub py-10">아직 등록된 자료가 없습니다.</p>;
  }

  return (
    <section aria-labelledby={headId}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:items-center">
        <h2 id={headId} className="text-b1-text text-h3 font-bold tracking-[-0.02em]">
          자료 찾기
        </h2>
        {/* 치는 대로 걸러지므로 검색 버튼은 두지 않는다. 자판의 «검색»(엔터)은 자판을 내려 결과를 보이게 한다 */}
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault();
            inputRef.current?.blur();
          }}
        >
          <label className="relative block">
            <span className="sr-only">자료 검색</span>
            <Search
              aria-hidden
              className="text-b1-muted pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2"
            />
            <input
              ref={inputRef}
              type="search"
              value={state.q}
              onChange={e => setQuery({ q: e.target.value })}
              placeholder="제목·본문 검색"
              autoComplete="off"
              enterKeyHint="search"
              // 입력칸 글씨는 16px(text-body) — 더 작으면 아이폰이 입력할 때 화면을 확대한다(DESIGN.md §7)
              className={cn(
                'border-b1-border bg-b1-surface text-b1-text text-body placeholder:text-b1-sub focus-visible:border-b1-accent h-12 w-full rounded-xl border pr-3.5 pl-[42px]',
                FOCUS
              )}
            />
          </label>
        </form>
      </div>

      <ChipRow
        label="자료 분류"
        options={options}
        value={state.filter}
        onChange={filter => setQuery({ filter })}
      />

      <div className="text-b1-sub text-body-sm mt-2.5 mb-3.5 flex items-center justify-between gap-2.5 lg:mt-3.5 lg:mb-[18px]">
        {/* 조건이 바뀔 때마다 화면낭독기가 결과 수를 읽는다 */}
        <p role="status" className="min-w-0">
          {countLabel(state, options)} <b className="text-b1-text">{rows.length}개</b>
        </p>
        <div
          role="group"
          aria-label="정렬"
          className="border-b1-border bg-b1-surface flex shrink-0 rounded-lg border"
        >
          {SORTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={state.sort === value}
              onClick={() => setQuery({ sort: value })}
              className={cn(
                'text-caption h-9 px-2.5',
                HIT_36,
                FOCUS,
                'first:rounded-l-md last:rounded-r-md',
                state.sort === value ? 'bg-b1-text text-b1-surface font-bold' : 'text-b1-sub'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 ? (
        // 표 머리(«자료 제목 / 원본 내려받기»)는 두지 않는다 — 줄마다 제목과 내려받기 아이콘이 스스로 설명한다
        <ul ref={listRef} className="border-b1-border m-0 list-none border-t p-0">
          {rows.map(r => (
            <Row key={r.id} section={section} resource={r} />
          ))}
        </ul>
      ) : (
        <Empty className="bg-card border">
          <EmptyHeader>
            <EmptyTitle role="heading" aria-level={3}>
              찾으시는 자료가 없습니다.
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <button
              type="button"
              onClick={() => {
                reset();
                // 누른 버튼은 목록이 돌아오면서 사라진다 — 포커스를 검색칸으로 옮긴다(문서 맨 위로 튀지 않게)
                inputRef.current?.focus({ preventScroll: true });
              }}
              className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}
            >
              검색 조건 초기화
            </button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
};
