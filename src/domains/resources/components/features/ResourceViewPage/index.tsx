'use client';

import type { Resource } from '@/domains/resources/api/resource.types';
import {
  dateLabel,
  downloadTarget,
  groupLabel,
  pageImageName,
  videoLinkLabel,
} from '@/domains/resources/api/resourceList';
import {
  clearDocumentOpen,
  markListReturn,
  wasDocumentOpened,
} from '@/domains/resources/api/resourceListState';
import { noPreviewNotice } from '@/domains/resources/api/resourceViewer';
import { ResourceReader } from '@/domains/resources/components/features/ResourceViewPage/ResourceReader';
import { resourcePath } from '@/domains/resources/config/resourceSections';
import { requestPlay } from '@/domains/worship-video/api/playIntent';
import type { SermonLink } from '@/domains/worship-video/api/sermonLink.server';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { YoutubeIcon } from '@/shared/components/brand/YoutubeIcon';
import { isPlainClick } from '@/shared/lib/isPlainClick';
import { cn } from '@/shared/lib/utils';
import { ArrowLeft, ArrowUpRight, Download, FileText, Play } from 'lucide-react';
import { useLenis } from 'lenis/react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  resource: Resource;
  /** 연결된 설교 영상을 볼 주소 — 서버가 찾아 준다(sermonLinkFor). 영상이 없는 자료는 빈 배열 */
  videoLinks: readonly SermonLink[];
}

const ACTION = 'text-label min-h-11 px-4';
const PRIMARY_BTN =
  'bg-b1-accent text-b1-surface hover:bg-b1-accent/90 duration-fast inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors';

/**
 * 문서 열람 페이지(/resources/분류/자료id) — «자료 목록» 돌아가기(한 번만) · 머리(묶음·제목·날짜·본문) ·
 * 동작(내려받기·설교 영상 보기) · 열람기(쪽 넘김 · «크게 보기»). 확장자·용량은 적지 않는다(A안).
 * 자료의 실제 형태대로 그린다: 미리보기가 있으면 열람기, 없으면(한글 파일) 내려받아 보라는 안내.
 * 원본 파일이 없는 자료(이미지로만 제공)에는 «내려받기» 를 만들지 않고 보고 있는 쪽을 저장하는 «이미지 저장» 을 둔다.
 */
export const ResourceViewPage = ({ resource: r, videoLinks }: Props) => {
  const headId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis(); // 사이트 스크롤은 Lenis 가 맡는다(_provider)
  const [page, setPage] = useState(0);
  const download = downloadTarget(r, page);
  const meta = [dateLabel(r), r.passage].filter(Boolean);
  const notice = r.pages.length === 0 ? noPreviewNotice(r.file?.kind) : undefined;

  // 목록에서 눌러 넘어온 문서인지 — 들어올 때 한 번 정하고 표시는 지운다: 지우지 않으면 뒤로·앞으로 가기로
  // 다시 들어왔을 때 브라우저가 되찾아 준 화면 위치를 아래 맞추기가 덮어 버린다.
  const [opened] = useState(() => wasDocumentOpened(r.id));
  useEffect(() => {
    clearDocumentOpen(r.id);
  }, [r.id]);

  // 눌러서 넘어왔으면 문서가 화면 위쪽에서 시작하게 맞춘다 — 서브페이지 머리(제목·메뉴)가 커서 그대로 두면
  // 종이가 화면 아래로 밀린다. 주소로 바로 들어온 경우(공유 링크·예배 영상의 시트지 카드)는 맨 위 그대로 둔다.
  useEffect(() => {
    if (!opened) return;
    // 재는 건 다음 프레임 — 페이지가 바뀐 뒤의 스크롤 위치(Next 가 맞춘다)가 자리 잡은 뒤에
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      // 고정 헤더 여백은 전역 scroll-padding-top(globals.css)을 읽어 쓴다 — 홈 앵커와 같은 기준
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const y = Math.max(0, root.getBoundingClientRect().top + window.scrollY - offset);
      // 새 페이지에 들어온 것이라 미끄러지지 않고 바로 간다. Lenis 는 페이지 크기를 나중에 다시 재므로
      // (앞 페이지의 스크롤 한도에 잘리지 않게) 지금 크기로 먼저 재게 한다.
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(y, { immediate: true });
      } else window.scrollTo({ top: y, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [opened, lenis]);

  return (
    <div ref={rootRef} className="mx-auto max-w-[1050px]">
      <Link
        href={resourcePath(r.section)}
        // 목록의 보던 자리로 돌아간다 — 화면 위치는 목록 화면이 맞춘다(ResourceListPage)
        scroll={false}
        onClick={e => {
          if (isPlainClick(e)) markListReturn(r.section); // 새 탭으로 열면 이 탭은 돌아가지 않는다
        }}
        className={cn(
          'text-b1-sub hover:text-b1-accent text-label duration-fast -mt-2 mb-2 inline-flex min-h-11 items-center gap-2 rounded transition-colors',
          FOCUS
        )}
      >
        <ArrowLeft aria-hidden className="size-4" />
        자료 목록
      </Link>

      <article
        aria-labelledby={headId}
        className="border-b1-border bg-b1-placeholder overflow-hidden rounded-xl border"
      >
        <header className="border-b1-border bg-b1-surface border-b px-4 py-4 md:px-6 md:py-5">
          <p className="text-b1-accent text-caption font-bold">{groupLabel(r)}</p>
          <h2
            id={headId}
            className="text-b1-text text-h3 mt-1.5 font-bold tracking-[-0.02em] wrap-anywhere"
          >
            {r.title}
          </h2>
          {meta.length > 0 && (
            <p className="text-b1-sub text-caption mt-2 flex flex-wrap gap-x-3.5 gap-y-1 tabular-nums">
              {meta.map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </p>
          )}
          {(download || videoLinks.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {download && (
                <a
                  href={download.href}
                  download={download.name}
                  className={cn(PRIMARY_BTN, FOCUS, ACTION)}
                >
                  <Download aria-hidden className="size-4" />
                  {download.kind === 'file' ? '내려받기' : '이미지 저장'}
                </a>
              )}
              {videoLinks.map((link, i) =>
                link.external ? (
                  <a
                    key={link.videoId}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(OUTLINE_BTN, FOCUS, ACTION)}
                  >
                    <YoutubeIcon size={16} />
                    {videoLinkLabel(true, i, videoLinks.length)}
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only">(새 창)</span>
                  </a>
                ) : (
                  <Link
                    key={link.videoId}
                    href={link.href}
                    onClick={e => {
                      // 들어가자마자 재생되게 — 새 탭으로 여는 클릭은 이 탭의 표시를 남기지 않는다
                      if (isPlainClick(e)) requestPlay(link.videoId);
                    }}
                    className={cn(OUTLINE_BTN, FOCUS, ACTION)}
                  >
                    <Play aria-hidden className="size-3.5 fill-current" />
                    {videoLinkLabel(false, i, videoLinks.length)}
                  </Link>
                )
              )}
            </div>
          )}
        </header>

        {notice ? (
          <div className="bg-b1-bg grid justify-items-center gap-2 px-5 py-12 text-center md:py-16">
            <span className="border-b1-border bg-b1-surface text-b1-accent mb-2 grid h-[60px] w-12 place-items-center rounded-md border">
              <FileText aria-hidden className="size-[22px]" />
            </span>
            <h3 className="text-b1-text text-title">{notice.title}</h3>
            {notice.body && <p className="text-b1-sub text-body-sm">{notice.body}</p>}
          </div>
        ) : (
          <ResourceReader
            title={r.title}
            pages={r.pages}
            page={page}
            onPage={setPage}
            hasFile={Boolean(r.file)}
            // 원본 파일이 없는 자료만 «크게 보기» 에 «이미지 저장» 을 둔다(머리의 버튼과 같은 규칙)
            saveName={r.file ? undefined : i => pageImageName(r, i)}
          />
        )}
      </article>
    </div>
  );
};
