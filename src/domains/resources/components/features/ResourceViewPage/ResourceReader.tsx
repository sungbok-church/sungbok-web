'use client';

import type { ResourcePage } from '@/domains/resources/api/resource.types';
import { previewCaption } from '@/domains/resources/api/resourceViewer';
import { PageStepper, ZoomControls } from '@/shared/components/features/ViewerControls';
import { ZOOM_FIT } from '@/shared/lib/zoomSteps';
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
}

/**
 * 문서 열람기 — 쪽 넘김 · 확대(100~300%, 50% 단위, «맞춤») · 스크롤되는 종이 창 · 설명 줄.
 * 미리보기 쪽은 이미 줄여 둔 그림이라 그대로 싣는다(unoptimized) — 확대해서 읽어야 하므로 다시 줄이지 않는다.
 */
export const ResourceReader = ({ title, pages, page, onPage, hasFile }: Props) => {
  const [zoom, setZoom] = useState(ZOOM_FIT);
  const windowRef = useRef<HTMLDivElement>(null);
  const count = pages.length;
  const current = pages[page] ?? pages[0];

  // 배율을 바꿔도 보던 곳이 창 가운데에 남게 — 바꾸기 직전의 가운데 위치(비율)를 적어 두고 다시 그린 뒤 맞춘다
  const center = useRef<{ x: number; y: number } | null>(null);
  const zoomTo = (next: number) => {
    const el = windowRef.current;
    if (el && next !== zoom) {
      center.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
    setZoom(next);
  };
  useLayoutEffect(() => {
    const el = windowRef.current;
    const c = center.current;
    center.current = null;
    if (!el || !c) return;
    el.scrollLeft = c.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = c.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom]);

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
      {/* 쪽 넘김과 확대는 휴대폰에서도 한 줄 — 부품이 좁은 화면에 맞춰 줄어든다(ViewerControls) */}
      <div className="border-b1-border flex items-center justify-between gap-2 border-b px-2.5 py-2.5 md:px-4">
        <PageStepper noun="쪽" index={page} count={count} onChange={onPage} />
        <ZoomControls zoom={zoom} onZoom={zoomTo} />
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
        {/* 폭이 배율이다 — 100% 는 창 폭에 꼭 맞고, 그보다 크면 창 안에서 옆으로도 민다 */}
        <div className="bg-b1-surface mx-auto shadow-sm" style={{ width: `${zoom * 100}%` }}>
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
        </div>
      </div>

      <p className="border-b1-border bg-b1-bg text-b1-sub text-caption border-t px-3.5 py-2.5 md:px-5">
        {previewCaption({ hasFile, page, count })}
      </p>
    </>
  );
};
