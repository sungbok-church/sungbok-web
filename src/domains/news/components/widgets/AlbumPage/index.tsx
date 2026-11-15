'use client';

import { albumCategories, albumMeta, filterAlbums } from '@/domains/news/api/albumList';
import type { Album } from '@/domains/news/api/news.types';
import { idFromPath, syncAddress } from '@/domains/news/api/syncAddress';
import { ImageViewer } from '@/domains/news/components/features/ImageViewer';
import { FOCUS, HIT_34, OUTLINE_BTN, PILL } from '@/shared/components/ui/controlStyles';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery';
import { usePrefersReducedMotion } from '@/shared/lib/hooks/usePrefersReducedMotion';
import { cn } from '@/shared/lib/utils';
import { ChevronRight, Maximize2, Search, X } from 'lucide-react';
import { useLenis } from 'lenis/react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

interface Props {
  /** 공개된 앨범(newsRepository.albums) */
  albums: readonly Album[];
  /** 고른 앨범을 두는 주소(`${basePath}/id`) — 고른 앨범은 이 주소에서 읽는다(공유·새로고침·뒤로 가기) */
  basePath: string;
}

// lg(1024) 미만 — 목록 아래에 미리보기가 쌓이는 폭. 항목을 고르면 미리보기로 내려간다
const STACKED = '(max-width: 1023px)';

/**
 * 교회앨범 — C안 «목록 + 미리보기». 왼쪽(휴대폰은 위)에서 행사를 고르면 옆(아래)에 화보가 전체 비율 그대로 보이고,
 * «크게 보기» 하나로 뷰어를 연다. 별도 상세 페이지·«자세히 보기»·하단 반복 목록은 없다 — 고른 항목은 주소에만 맞춘다.
 * 휴대폰은 소개 문구 없이 바로 분류와 목록이고, 검색은 아이콘으로 접어 둔다.
 */
export const AlbumPage = ({ albums, basePath }: Props) => {
  // 고른 앨범은 화면 안에 두지 않고 주소에서 읽는다(api/syncAddress 의 이유 참고)
  const pathId = idFromPath(usePathname(), basePath);
  const selectedId = albums.some(a => a.id === pathId) ? pathId : albums[0]?.id;
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const headId = useId();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const stacked = useMediaQuery(STACKED);
  const reduced = usePrefersReducedMotion();
  const lenis = useLenis(); // 사이트 스크롤은 Lenis 가 맡는다(_provider)

  const categories = useMemo(() => albumCategories(albums), [albums]);
  const rows = useMemo(() => filterAlbums(albums, { q, category }), [albums, q, category]);
  // 고른 항목이 조건에 걸러졌으면 결과의 첫 항목을 보인다(고른 것 자체는 바꾸지 않는다 — 조건을 풀면 돌아온다)
  const album = rows.find(a => a.id === selectedId) ?? rows[0];

  // 보이는 앨범이 바뀌면(고르기·검색·분류) 뷰어는 첫 장부터 — 앞 앨범의 장 번호가 남지 않게
  const [shownId, setShownId] = useState(album?.id);
  if (shownId !== album?.id) {
    setShownId(album?.id);
    setViewerIndex(0);
  }

  // 탭 제목도 그 주소로 바로 들어왔을 때와 같게 — 주소만 바꾼 것이라 Next 가 제목을 다시 정하지 않는다
  const pickedTitle = albums.find(a => a.id === pathId)?.title;
  useEffect(() => {
    document.title = pickedTitle ? `${pickedTitle} | 교회앨범 | 성복교회` : '교회앨범 | 성복교회';
  }, [pickedTitle]);

  if (albums.length === 0) return <p className="text-b1-sub py-10">아직 등록된 앨범이 없습니다.</p>;

  const select = (id: string) => {
    // 페이지를 옮기지 않고 주소만 바꾼다 — 화면은 주소를 따라온다. 새로고침·공유하면 그 항목이 골라진 채 열린다
    syncAddress(basePath, id);
    if (!stacked) return;
    // 목록 아래에 미리보기가 쌓이는 폭에서는 미리보기로 내려가고 포커스를 옮긴다
    const display = displayRef.current;
    if (!display) return;
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = Math.max(0, display.getBoundingClientRect().top + window.scrollY - offset - 12);
    if (lenis) lenis.scrollTo(y, { immediate: reduced });
    else window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
    display.focus({ preventScroll: true });
  };
  const reset = () => {
    setQ('');
    setCategory('');
  };
  const toggleSearch = () => {
    if (searchOpen) setQ(''); // 접으면 검색어도 비운다 — 안 보이는 조건이 남지 않게
    setSearchOpen(o => !o);
    if (!searchOpen) requestAnimationFrame(() => inputRef.current?.focus());
  };

  const chip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={value === category}
      onClick={() => setCategory(value)}
      className={cn(
        PILL,
        HIT_34,
        FOCUS,
        value === category
          ? 'border-b1-accent-soft bg-b1-accent-soft text-b1-accent font-bold'
          : 'text-b1-sub hover:text-b1-text'
      )}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby={headId}>
      {/* 휴대폰·태블릿에서는 제목 줄 없이 바로 분류와 목록(화면낭독기에는 남긴다) */}
      <h2
        id={headId}
        className="border-b1-border text-b1-text text-h3 max-lg:sr-only lg:border-b lg:pb-5 lg:font-bold lg:tracking-[-0.02em]"
      >
        함께한 기록
      </h2>

      <div className="grid gap-6 lg:mt-7 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="앨범 분류" className="flex min-w-0 flex-wrap gap-1.5">
              {chip('', '전체')}
              {categories.map(c => chip(c, c))}
            </div>
            <button
              type="button"
              aria-label={searchOpen ? '앨범 검색 닫기' : '앨범 검색 열기'}
              aria-expanded={searchOpen}
              aria-controls={searchId}
              onClick={toggleSearch}
              className={cn(
                'border-b1-border bg-b1-surface text-b1-text grid size-11 shrink-0 place-items-center rounded-lg border lg:hidden',
                FOCUS
              )}
            >
              {searchOpen ? (
                <X aria-hidden className="size-[19px]" />
              ) : (
                <Search aria-hidden className="size-[19px]" />
              )}
            </button>
          </div>

          {/* 검색칸 — PC 는 늘 보이고, 그 아래 폭에서는 아이콘을 눌러야 열린다 */}
          <form
            id={searchId}
            role="search"
            onSubmit={e => {
              e.preventDefault();
              inputRef.current?.blur();
            }}
            className={cn('mt-3.5', !searchOpen && 'max-lg:hidden')}
          >
            <label className="relative block">
              <span className="sr-only">앨범 제목 검색</span>
              <Search
                aria-hidden
                className="text-b1-muted pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2"
              />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="행사 이름 검색"
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

          <p role="status" className="text-b1-sub text-caption mt-3 mb-1">
            {rows.length}개의 기록
          </p>

          <ul className="border-b1-border m-0 list-none border-t p-0">
            {rows.map(a => {
              const on = a.id === album?.id;
              return (
                <li key={a.id} className="border-b1-border border-b">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => select(a.id)}
                    className={cn(
                      'duration-fast flex w-full items-center gap-3.5 rounded-r-lg border-l-[3px] px-2.5 py-3 text-left transition-colors md:gap-4 md:px-3.5 md:py-4',
                      FOCUS,
                      on
                        ? 'border-l-b1-accent bg-b1-accent-soft'
                        : 'hover:bg-b1-accent-soft/60 border-l-transparent'
                    )}
                  >
                    {/* 작은 그림도 전체 비율 그대로 — 자르지 않는다. 바로 옆 제목과 같은 내용이라 대체 글은 비운다 */}
                    <Image
                      src={a.images[0].src}
                      width={a.images[0].width}
                      height={a.images[0].height}
                      alt=""
                      unoptimized
                      className="bg-b1-surface h-[62px] w-[46px] shrink-0 object-contain md:h-[82px] md:w-[61px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-b1-sub text-caption block">{a.category}</span>
                      <span
                        className={cn(
                          'text-body md:text-title mt-0.5 block leading-normal font-semibold wrap-anywhere',
                          on ? 'text-b1-accent' : 'text-b1-text'
                        )}
                      >
                        {a.title}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="text-b1-sub size-[17px] shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          ref={displayRef}
          tabIndex={-1}
          role="region"
          aria-label="고른 행사 미리보기"
          className={cn('min-w-0 rounded-xl', FOCUS)}
        >
          {album ? (
            <>
              {/* 사진과 글을 편집한 세로 화보 — 틀에 맞춰 자르지 않고 전체 비율 그대로 */}
              <div className="bg-b1-placeholder flex justify-center rounded-xl p-5 md:p-7 lg:h-[600px]">
                <Image
                  key={album.images[0].src}
                  src={album.images[0].src}
                  width={album.images[0].width}
                  height={album.images[0].height}
                  alt={`${album.title} 화보`}
                  unoptimized
                  loading="eager"
                  className="h-auto max-h-full w-full max-w-[520px] object-contain shadow-sm lg:w-auto lg:max-w-full"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-4">
                <p className="text-b1-sub text-body-sm min-w-0">{albumMeta(album)}</p>
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className={cn(
                    OUTLINE_BTN,
                    FOCUS,
                    'text-label min-h-11 shrink-0 px-4 whitespace-nowrap'
                  )}
                >
                  <Maximize2 aria-hidden className="size-4" />
                  크게 보기
                </button>
              </div>
              <ImageViewer
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                title={album.title}
                subtitle="화보 크게 보기"
                images={album.images}
                index={viewerIndex}
                onIndex={setViewerIndex}
                alt={i => `${album.title} 화보 ${i + 1}`}
                downloadName={i => `성복교회 ${album.title} ${i + 1}`}
              />
            </>
          ) : (
            <EmptyState
              title="찾으시는 기록이 없습니다."
              className="bg-b1-surface"
              action={
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    // 누른 버튼은 목록이 돌아오면서 사라진다 — 포커스를 미리보기 영역에 남긴다
                    displayRef.current?.focus({ preventScroll: true });
                  }}
                  className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}
                >
                  전체 기록 보기
                </button>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
};
