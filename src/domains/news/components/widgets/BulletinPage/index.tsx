'use client';

import {
  issueLabel,
  issueLongDate,
  issueStatus,
  issueYears,
} from '@/domains/news/api/bulletinList';
import type { BulletinIssue } from '@/domains/news/api/news.types';
import { idFromPath, syncAddress } from '@/domains/news/api/syncAddress';
import { ImageViewer } from '@/domains/news/components/features/ImageViewer';
import {
  SpreadImage,
  type SpreadSide,
  type SpreadView,
} from '@/domains/news/components/features/SpreadImage';
import { IssueList } from '@/domains/news/components/widgets/BulletinPage/IssueList';
import { FOCUS, OUTLINE_BTN, PILL } from '@/shared/components/ui/controlStyles';
import { PageStepper, Segmented } from '@/shared/components/features/ViewerControls';
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery';
import { cn } from '@/shared/lib/utils';
import { BookOpen, ChevronDown, ChevronRight, Maximize2, X } from 'lucide-react';
import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

interface Props {
  /** 공개된 주보 — 최신 주일부터(newsRepository.issues) */
  issues: readonly BulletinIssue[];
  /** 고른 호를 두는 주소(`${basePath}/날짜`) — 펼칠 호는 이 주소에서 읽는다(공유·새로고침·뒤로 가기) */
  basePath: string;
}

// md(768) 미만 — «한 면» 이 기본인 폭. 모양은 CSS 가 가르고(SpreadImage auto), 이 값은 버튼의 눌림 상태에만 쓴다
const NARROW = '(max-width: 767px)';

/**
 * 주보 — B안 «바로 읽기». 들어오면 최신 주보가 펼쳐져 있고, 다른 호는 PC 는 왼쪽 연도별 접이식 목록에서,
 * 휴대폰은 «다른 주보 보기» 바텀시트(연도 탭 + 월별 목록)에서 고른다(셀렉트박스 없음).
 * 그림 한 장이 펼친 두 면이라 «한 면 / 양면», «왼쪽 / 오른쪽» 을 고정된 선택 버튼으로 둔다. «크게 보기» 는 하나.
 * 다른 호를 골라도 페이지를 옮기지 않는다 — 주소만 바꾸고(history.replaceState) 펼칠 호를 주소에서 읽는다.
 */
export const BulletinPage = ({ issues, basePath }: Props) => {
  const latest = issues[0];
  // 고른 호는 화면 안에 두지 않고 주소에서 읽는다(api/syncAddress 의 이유 참고)
  const pathId = idFromPath(usePathname(), basePath);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<SpreadView>('auto');
  const [side, setSide] = useState<SpreadSide>('right'); // 첫 장의 오른쪽 면이 표지
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const narrow = useMediaQuery(NARROW);
  const railId = useId();
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);

  const years = useMemo(() => issueYears(issues), [issues]);
  const issue = issues.find(i => i.id === pathId) ?? latest;
  const year = issue?.date.slice(0, 4) ?? '';
  // PC 접이식 목록에서 펼쳐 둔 연도 — 보고 있는 호의 연도는 늘 펼친다. 바텀시트의 연도 탭
  const [openYears, setOpenYears] = useState<ReadonlySet<string>>(new Set());
  const [pickerYear, setPickerYear] = useState(year);

  // 호가 바뀌면 첫 장·표지 면부터 — 렌더 중에 맞춘다(바뀐 호가 앞 호의 장 번호로 한 번 그려지지 않게)
  const [shownId, setShownId] = useState(issue?.id);
  if (issue && shownId !== issue.id) {
    setShownId(issue.id);
    setPage(0);
    setSide('right');
  }

  // 탭 제목도 그 주소로 바로 들어왔을 때와 같게 — 주소만 바꾼 것이라 Next 가 제목을 다시 정하지 않는다
  const issueDate = issue?.date;
  useEffect(() => {
    if (!issueDate) return;
    document.title = pathId ? `${issueLabel(issueDate)} | 주보 | 성복교회` : '주보 | 성복교회';
  }, [pathId, issueDate]);

  if (!issue) return <p className="text-b1-sub py-10">아직 등록된 주보가 없습니다.</p>;

  const half = view === 'auto' ? narrow : view === 'half';
  const current = issue.pages[page] ?? issue.pages[0];
  const longDate = issueLongDate(issue.date);

  // 페이지를 옮기지 않고 주소만 바꾼다 — 화면은 주소를 따라온다. 새로고침·공유하면 그 호가 열린다
  const select = (id: string) => syncAddress(basePath, id);
  const toggleYear = (y: string) =>
    setOpenYears(prev => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });

  return (
    <section
      aria-label="주보 열람"
      className="border-b1-border bg-b1-placeholder overflow-hidden rounded-2xl border max-md:-mx-1"
    >
      <div className="border-b1-border bg-b1-surface flex items-center justify-between gap-3 border-b px-4 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <h2 className="text-b1-text text-h3 font-bold tracking-[-0.02em] whitespace-nowrap">
            {issueLabel(issue.date)}
          </h2>
          <p className="text-b1-sub text-caption mt-0.5">
            {year}년 · {issueStatus(issue, issues)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 shrink-0 px-4 whitespace-nowrap')}
        >
          <Maximize2 aria-hidden className="size-4" />
          크게 보기
        </button>
      </div>

      {/* 휴대폰: 왼쪽 목록 대신 바텀시트를 여는 한 줄 */}
      <button
        ref={pickerTriggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setPickerYear(year);
          setPickerOpen(true);
        }}
        className={cn(
          'border-b1-border bg-b1-surface text-b1-accent text-label hover:bg-b1-accent-soft duration-fast flex min-h-12 w-full items-center gap-2 border-b px-4 font-semibold transition-colors md:hidden',
          FOCUS,
          'focus-visible:ring-offset-0 focus-visible:ring-inset'
        )}
      >
        <BookOpen aria-hidden className="size-[17px]" />
        다른 주보 보기
        <ChevronRight aria-hidden className="ml-auto size-4" />
      </button>

      <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[224px_minmax(0,1fr)]">
        {/* PC·태블릿: 연도별 접이식 목록. 바탕은 열람부 높이만큼 채우고 목록만 안에서 스크롤한다 — 호가 쌓여도 상자가 길어지지 않게 */}
        <div className="border-b1-border bg-b1-bg hidden border-r md:block">
          <nav
            aria-labelledby={railId}
            data-lenis-prevent
            className="max-h-[820px] [scrollbar-width:thin] overflow-y-auto px-3 py-5"
          >
            <p id={railId} className="text-b1-text text-label mb-2 px-2.5 font-bold">
              다른 주보 보기
            </p>
            {years.map(y => {
              const open = y.year === year || openYears.has(y.year);
              const panelId = `${railId}-${y.year}`;
              return (
                <div key={y.year} className="border-b1-border border-t">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    // 보고 있는 호의 연도는 접지 않는다 — 고른 호가 목록에서 사라지지 않게
                    aria-disabled={y.year === year}
                    onClick={() => y.year !== year && toggleYear(y.year)}
                    className={cn(
                      'text-b1-text text-label flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left font-bold',
                      FOCUS
                    )}
                  >
                    <span>{y.year}년</span>
                    <span className="text-b1-sub text-caption flex items-center gap-1.5 font-normal">
                      {y.count}개 호
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          'duration-fast size-3.5 transition-transform motion-reduce:transition-none',
                          open && 'rotate-180'
                        )}
                      />
                    </span>
                  </button>
                  <div id={panelId} hidden={!open}>
                    <IssueList
                      months={y.months}
                      selectedId={issue.id}
                      latestId={latest?.id}
                      onSelect={select}
                    />
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="min-w-0 px-3 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-2">
            <PageStepper
              noun="장"
              unit="장"
              index={page}
              count={issue.pages.length}
              onChange={setPage}
            />
            <Segmented
              label="주보 보기 방식"
              value={half ? 'half' : 'spread'}
              options={[
                { value: 'half', label: '한 면' },
                { value: 'spread', label: '양면' },
              ]}
              onChange={setView}
            />
          </div>
          {/* 한 면일 때만 — 고르기 전(auto)에는 휴대폰에서만 보인다(CSS). 스크립트가 붙기 전에도 모양이 맞다 */}
          {(view === 'auto' || half) && (
            <div
              className={cn(
                'mt-2.5 flex items-center justify-between gap-3 md:justify-end',
                view === 'auto' && 'md:hidden'
              )}
            >
              <span className="text-b1-sub text-caption">보는 면</span>
              <Segmented
                label="표시할 면"
                value={side}
                options={[
                  { value: 'left', label: '왼쪽' },
                  { value: 'right', label: '오른쪽' },
                ]}
                onChange={setSide}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label={`${longDate} 주보 ${page + 1}번째 장 크게 보기`}
            className={cn(
              'mt-3.5 block w-full cursor-zoom-in shadow-md',
              // 한 면은 넓은 화면에서 종이 한 장 폭으로만
              view === 'half' && 'md:mx-auto md:w-[65%]',
              FOCUS
            )}
          >
            <SpreadImage
              key={current.src}
              image={current}
              alt={`${longDate} 주보 ${page + 1}번째 장`}
              view={view}
              side={side}
              preload={page === 0}
            />
          </button>
          {/* 휴대폰은 바로 위에 «크게 보기» 가 보여 같은 안내를 되풀이하지 않는다 */}
          <p className="text-b1-sub text-caption mt-3 max-md:hidden">
            그림을 누르면 크게 볼 수 있습니다.
          </p>

          {issue.pages.length > 1 && (
            <ul
              aria-label="주보 장 선택"
              data-lenis-prevent
              className="m-0 mt-4 flex [scrollbar-width:thin] list-none gap-2.5 overflow-x-auto p-1"
            >
              {issue.pages.map((img, i) => (
                <li key={img.src} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={i === page}
                    aria-label={`${i + 1}번째 장 보기`}
                    onClick={() => setPage(i)}
                    className={cn(
                      'block w-[92px] rounded-lg border-2 p-1 md:w-[112px]',
                      FOCUS,
                      i === page ? 'border-b1-accent bg-b1-surface' : 'border-transparent'
                    )}
                  >
                    <Image
                      src={img.src}
                      width={img.width}
                      height={img.height}
                      alt=""
                      unoptimized
                      className="bg-b1-surface h-auto w-full"
                    />
                    <span className="text-b1-sub text-caption mt-1 block tabular-nums">
                      {i + 1} / {issue.pages.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 휴대폰 바텀시트 — 연도 탭 + 월별 목록. 고르면 닫히고 포커스는 연 버튼으로 돌아간다(Base UI Dialog) */}
      <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            data-lenis-prevent
            className="bg-b1-text/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-[60] motion-reduce:animate-none"
          />
          <Dialog.Popup
            data-lenis-prevent
            // 고른 뒤에도 «다른 주보 보기» 로 — 이어서 또 고를 수 있게
            finalFocus={pickerTriggerRef}
            className="bg-b1-surface data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom fixed inset-x-0 bottom-0 z-[60] flex max-h-[82dvh] flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-lg outline-hidden motion-reduce:animate-none"
          >
            <header className="border-b1-border flex shrink-0 items-center justify-between gap-4 border-b py-2.5 pr-2.5 pl-4">
              <Dialog.Title className="text-b1-text text-h3 font-bold tracking-[-0.02em]">
                주보 모아보기
              </Dialog.Title>
              <Dialog.Close
                aria-label="주보 목록 닫기"
                className={cn('text-b1-text grid size-11 place-items-center rounded-lg', FOCUS)}
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </header>
            <div
              role="group"
              aria-label="주보 연도"
              className="border-b1-border flex shrink-0 [scrollbar-width:none] gap-1.5 overflow-x-auto border-b px-4 py-3 [&::-webkit-scrollbar]:hidden"
            >
              {years.map(y => (
                <button
                  key={y.year}
                  type="button"
                  aria-pressed={y.year === pickerYear}
                  onClick={() => setPickerYear(y.year)}
                  className={cn(
                    PILL,
                    FOCUS,
                    'text-label h-11 px-4',
                    y.year === pickerYear
                      ? 'border-b1-accent-soft bg-b1-accent-soft text-b1-accent font-bold'
                      : 'text-b1-sub'
                  )}
                >
                  {y.year}년
                </button>
              ))}
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 overflow-y-auto overscroll-contain px-2.5 pb-4"
            >
              <IssueList
                months={years.find(y => y.year === pickerYear)?.months ?? []}
                selectedId={issue.id}
                latestId={latest?.id}
                onSelect={id => {
                  select(id);
                  setPickerOpen(false);
                }}
                roomy
              />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={`${longDate} 주보`}
        subtitle="주보 크게 보기"
        images={issue.pages}
        index={page}
        onIndex={setPage}
        alt={i => `${longDate} 주보 ${i + 1}번째 장`}
        downloadName={i => `성복교회 주보 ${issue.date} ${i + 1}`}
        spread={{
          half,
          side,
          onHalf: h => setView(h ? 'half' : 'spread'),
          onSide: setSide,
        }}
      />
    </section>
  );
};
