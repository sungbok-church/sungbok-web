'use client';

import type { ResourcePage } from '@/domains/resources/api/resource.types';
import { previewCaption } from '@/domains/resources/api/resourceViewer';
import { ImageViewer } from '@/shared/components/features/ImageViewer';
import { PageStepper } from '@/shared/components/features/ViewerControls';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import { Maximize2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  pages: readonly ResourcePage[];
  /** 보고 있는 쪽(0 부터) — 부르는 쪽이 들고 있다(«이미지 저장» 이 보고 있는 쪽을 저장한다) */
  page: number;
  onPage: (page: number) => void;
  /** 원본 파일이 있는 자료인지 — 없으면 설명 줄에 «이미지로 제공되는 자료» 임을 덧붙인다 */
  hasFile: boolean;
  /** «크게 보기» 에서 쪽 그림을 저장할 때의 이름(확장자 없이). 원본 파일이 있는 자료는 주지 않는다 — 저장은 «내려받기» 하나로 */
  saveName?: (page: number) => string;
}

/**
 * 문서 열람기 — 쪽 넘김 · «크게 보기» · 스크롤되는 종이 창 · 설명 줄. 주보·교회앨범과 조작이 같다:
 * 페이지 안에서는 창 폭에 맞춘 크기로만 보여 주고, 확대(100~300%)는 «크게 보기»(공용 ImageViewer)에서 한다.
 * 종이를 눌러도 «크게 보기» 가 열린다. 뷰어에서 넘긴 쪽은 닫은 뒤에도 그대로다(쪽 번호를 부르는 쪽이 들고 있다).
 * 미리보기 쪽은 이미 줄여 둔 그림이라 그대로 싣는다(unoptimized) — 확대해서 읽어야 하므로 다시 줄이지 않는다.
 */
export const ResourceReader = ({ title, pages, page, onPage, hasFile, saveName }: Props) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const count = pages.length;
  const current = pages[page] ?? pages[0];

  // 쪽을 넘기면 새 쪽의 맨 위부터
  useLayoutEffect(() => {
    windowRef.current?.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
  }, [page]);

  // 다음 쪽 그림을 미리 받아 둔다 — 넘길 때 빈 종이가 잠깐 보이지 않게
  const nextSrc = pages[page + 1]?.src;
  useEffect(() => {
    if (nextSrc) new window.Image().src = nextSrc;
  }, [nextSrc]);

  if (!current) return null;

  return (
    <>
      {/* 쪽 넘김과 «크게 보기» 는 휴대폰에서도 한 줄 */}
      <div className="border-b1-border flex items-center justify-between gap-2 border-b px-2.5 py-2.5 md:px-4">
        <PageStepper noun="쪽" index={page} count={count} onChange={onPage} />
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 shrink-0 px-4 whitespace-nowrap')}
        >
          <Maximize2 aria-hidden className="size-4" />
          크게 보기
        </button>
      </div>

      {/* 종이 창 — 안쪽 스크롤은 브라우저 기본으로(사이트 부드러운 스크롤 Lenis 가 휠·터치를 가져가지 않게). 끝에 닿으면 페이지로 이어진다.
          키보드로도 움직일 수 있게 포커스를 받는다(화살표·Page Up/Down). 짧은 자료(가로 그림 등)는 창이 그림 높이만큼만 차지한다. */}
      <div
        ref={windowRef}
        data-lenis-prevent
        tabIndex={0}
        role="group"
        aria-label="문서 미리보기"
        className="focus-visible:ring-b1-accent max-h-[62vh] [scrollbar-width:thin] overflow-auto p-3 focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset md:max-h-[min(70vh,790px)] md:p-5"
      >
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label={`${title} ${page + 1}쪽 크게 보기`}
          className={cn('bg-b1-surface block w-full cursor-zoom-in shadow-sm', FOCUS)}
        >
          <Image
            key={current.src}
            src={current.src}
            width={current.width}
            height={current.height}
            alt={`${title} ${page + 1}쪽`}
            unoptimized
            loading="eager"
            className="block h-auto w-full"
          />
        </button>
      </div>

      <p className="border-b1-border bg-b1-bg text-b1-sub text-caption border-t px-3.5 py-2.5 md:px-5">
        {previewCaption({ hasFile, page, count })}
      </p>

      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={title}
        subtitle="설교 시트지 크게 보기"
        images={pages}
        index={page}
        onIndex={onPage}
        alt={i => `${title} ${i + 1}쪽`}
        downloadName={saveName}
        noun="쪽"
      />
    </>
  );
};
