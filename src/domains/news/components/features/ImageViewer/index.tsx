'use client';

import type { NewsImage } from '@/domains/news/api/news.types';
import { SpreadImage, type SpreadSide } from '@/domains/news/components/features/SpreadImage';
import {
  PageStepper,
  Segmented,
  TOOL_BTN,
  ZoomControls,
} from '@/shared/components/features/ViewerControls';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import { ZOOM_FIT } from '@/shared/lib/zoomSteps';
import { Download, X } from 'lucide-react';
import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

/** 주보의 보기 방식(한 면·양면, 왼쪽·오른쪽) — 주보를 열 때만 넘긴다. 뷰어에서 바꾼 것은 본문 화면에도 남는다. */
export type ViewerSpread = {
  half: boolean;
  side: SpreadSide;
  onHalf: (half: boolean) => void;
  onSide: (side: SpreadSide) => void;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  images: readonly NewsImage[];
  /** 보고 있는 장(0 부터) — 부르는 쪽이 들고 있다(닫아도 본문 화면이 같은 장에 있다) */
  index: number;
  onIndex: (index: number) => void;
  alt: (index: number) => string;
  /** «이미지 저장» 의 파일 이름(확장자 없이 — 확장자는 그림 주소의 것을 붙인다) */
  downloadName: (index: number) => string;
  spread?: ViewerSpread;
}

// «맞춤»(100%)일 때 종이의 최대 폭 — 양면은 넓게, 한 면·세로 화보는 읽기 좋은 폭까지만
const BASE_WIDTH = { spread: 1100, half: 650, single: 760 };

/**
 * «크게 보기» — 주보와 교회앨범이 같이 쓰는 뷰어. 화면을 거의 채우는 대화상자에서 장을 넘기고(←/→ 키) 확대(100~300%)한다.
 * 닫기: Esc · 바깥 · 닫기 버튼. 닫히면 열었던 버튼으로 포커스가 돌아간다.
 * 안쪽 스크롤은 브라우저 기본으로 — 사이트 부드러운 스크롤(Lenis)이 휠·터치를 가져가지 않게(data-lenis-prevent).
 */
export const ImageViewer = ({
  open,
  onOpenChange,
  title,
  subtitle,
  images,
  index,
  onIndex,
  alt,
  downloadName,
  spread,
}: Props) => {
  const [zoom, setZoom] = useState(ZOOM_FIT);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 뷰어를 연 버튼 — 닫히면 그리로 포커스를 돌려놓는다. 이 뷰어는 Dialog.Trigger 없이 여는 곳이 여럿
  // («크게 보기» 버튼·종이 그림)이라, 열릴 때 포커스가 있던 곳을 적어 두었다가 finalFocus 로 넘긴다.
  const openerRef = useRef<HTMLElement | null>(null);
  // 범위를 벗어난 장 번호(다른 항목으로 바뀐 뒤 남은 번호)는 첫 장으로 본다 — 그림·표시·저장 이름이 같은 장을 가리키게
  const at = images[index] ? index : 0;
  const image = images[at];
  const base = spread ? (spread.half ? BASE_WIDTH.half : BASE_WIDTH.spread) : BASE_WIDTH.single;

  // 열 때마다 «맞춤» 에서 시작한다 — 렌더 중에 맞춘다(열린 뒤 한 번 더 그리지 않게)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setZoom(ZOOM_FIT);
  }

  // 장을 넘기거나 면을 바꾸면 새 그림의 맨 위·왼쪽부터
  const side = spread?.side;
  const half = spread?.half;
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
  }, [at, side, half]);

  const go = (next: number) => {
    if (next >= 0 && next < images.length) onIndex(next);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    // 확대해 둔 종이에 포커스가 있으면 화살표는 종이를 움직인다(브라우저 기본)
    if (zoom > ZOOM_FIT && e.target === scrollRef.current) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(at - 1);
    }
  };

  if (!image) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          data-lenis-prevent
          className="bg-b1-text/70 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-[60] motion-reduce:animate-none"
        />
        <Dialog.Popup
          data-lenis-prevent
          onKeyDown={onKeyDown}
          initialFocus={() => {
            // 이 시점의 포커스는 아직 뷰어를 연 버튼에 있다 — 적어 두고, 뷰어 안 포커스는 기본 동작에 맡긴다.
            // Safari 는 버튼을 눌러도 포커스를 주지 않아 body 가 잡힌다 — body 를 넘기면 닫을 때 페이지의
            // 첫 링크로 포커스가 튄다. 그때는 비워 두어 Base UI 의 기본 동작에 맡긴다.
            const el = document.activeElement;
            openerRef.current = el instanceof HTMLElement && el !== document.body ? el : null;
            return true;
          }}
          finalFocus={openerRef}
          className="bg-b1-placeholder data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-[60] flex flex-col overflow-hidden shadow-lg outline-hidden motion-reduce:animate-none md:inset-[18px] md:mx-auto md:max-w-[1400px] md:rounded-2xl"
        >
          <header className="border-b1-border bg-b1-surface flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 md:px-5">
            <div className="min-w-0">
              <Dialog.Title className="text-b1-text text-title truncate font-bold">
                {title}
              </Dialog.Title>
              <p className="text-b1-sub text-caption">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* 휴대폰에서는 숨긴다 — 그림을 길게 눌러 저장하는 쪽이 익숙하고, 머리 줄이 좁다 */}
              <a
                href={image.src}
                download={`${downloadName(at)}.${/\.(\w+)$/.exec(image.src)?.[1] ?? 'webp'}`}
                className={cn(
                  OUTLINE_BTN,
                  FOCUS,
                  'text-label hidden min-h-11 px-3.5 md:inline-flex'
                )}
              >
                <Download aria-hidden className="size-4" />
                이미지 저장
              </a>
              <Dialog.Close
                aria-label="크게 보기 닫기"
                className={cn(TOOL_BTN, FOCUS, 'size-11 max-lg:before:content-none')}
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
          </header>

          {/* 확대 영역 — 키보드로도 움직일 수 있게 포커스를 받는다 */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            tabIndex={0}
            role="group"
            aria-label={`${title} 확대 보기`}
            className="focus-visible:ring-b1-accent min-h-0 flex-1 overflow-auto overscroll-contain p-2.5 focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset md:p-6"
          >
            {/* 폭이 배율이다 — 100% 는 창에 맞고(읽기 좋은 폭까지만), 그보다 크면 창 안에서 민다 */}
            <div
              className="bg-b1-surface mx-auto shadow-sm"
              style={{ width: `${zoom * 100}%`, maxWidth: `${base * zoom}px` }}
            >
              {spread ? (
                <SpreadImage
                  key={image.src}
                  image={image}
                  alt={alt(at)}
                  view={spread.half ? 'half' : 'spread'}
                  side={spread.side}
                />
              ) : (
                <Image
                  key={image.src}
                  src={image.src}
                  width={image.width}
                  height={image.height}
                  alt={alt(at)}
                  unoptimized
                  loading="eager"
                  className="block h-auto w-full"
                />
              )}
            </div>
          </div>

          <footer className="border-b1-border bg-b1-surface flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:px-5">
            <PageStepper
              noun="장"
              unit="장"
              index={at}
              count={images.length}
              onChange={go}
              className="max-md:w-full max-md:justify-between"
            />
            {spread && (
              <div className="flex items-center gap-2.5 max-md:w-full max-md:justify-between">
                <Segmented
                  label="주보 보기 방식"
                  value={spread.half ? 'half' : 'spread'}
                  options={[
                    { value: 'half', label: '한 면' },
                    { value: 'spread', label: '양면' },
                  ]}
                  onChange={v => spread.onHalf(v === 'half')}
                />
                {spread.half && (
                  <Segmented
                    label="표시할 면"
                    value={spread.side}
                    options={[
                      { value: 'left', label: '왼쪽' },
                      { value: 'right', label: '오른쪽' },
                    ]}
                    onChange={spread.onSide}
                  />
                )}
              </div>
            )}
            <ZoomControls
              zoom={zoom}
              onZoom={setZoom}
              className="max-md:w-full max-md:justify-center"
            />
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
