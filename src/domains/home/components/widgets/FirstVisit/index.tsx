// 처음 오신 분께 — 풀블리드 + 스크롤 고정 배경(background-attachment:fixed) + 글래스 카드.
// 상세 절차(등록·5주 과정)와 등록·문의 폼은 우하단 플로팅 패널(RegisterPanel)에서.
// 배경은 임시 stand-in(self-host) — 확정 시 교회 실제 사진으로 교체.
// 홈의 지도 섹션은 찾아오시는 길 페이지로 옮겼다(ADR 0015) — 여기에는 주소 한 줄과 그 페이지 링크만 둔다.
// 고정 배경은 마우스 기기(pointer: fine)에서만 쓴다. iOS Safari(폰·아이패드)는 fixed 배경을 페이지 전체 높이에
// 맞춰 cover 해서 사진 한 귀퉁이만 수십 배 확대돼(흐릿한 색 덩어리) 보인다 — 터치 기기는 일반 스크롤 배경.
'use client';

import { ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import bg from '@/assets/images/main/first-visit.webp';
import { CHURCH_LOCATION } from '@/shared/config/church';
import { useNearViewport } from '@/shared/lib/hooks/useNearViewport';
import { cn } from '@/shared/lib/utils';

import { SECTION } from './data';
import { MorphPanel, usePanelFlow } from './RegisterPanel';

// 사진 위의 조작 요소 — 기본 포커스 선(accent 반투명)은 어두운 사진·글래스 위에서 잘 안 보여 흰 선으로 둔다
const FOCUS_ON_PHOTO =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export const FirstVisit = () => {
  const flow = usePanelFlow();
  // CSS 배경은 화면 밖이어도 페이지를 열자마자 받는다 — 페이지 맨 아래 섹션이라 첫 화면과 회선을 다투지 않게
  // 두 화면 거리 안에 들어왔을 때 붙인다. 그 전에는 어두운 바탕(bg-b1-text)이 깔려 흰 글씨 대비를 지킨다.
  const sectionRef = useRef<HTMLElement>(null);
  const near = useNearViewport(sectionRef);
  return (
    <>
      <section ref={sectionRef} className="relative flex min-h-[80vh] items-center overflow-hidden">
        <div
          aria-hidden
          className="bg-b1-text absolute inset-0 bg-cover bg-center pointer-fine:bg-fixed"
          style={near ? { backgroundImage: `url(${bg.src})` } : undefined}
        />
        <div aria-hidden className="absolute inset-0 bg-slate-950/35" />
        <div className="relative z-10 w-full px-[6vw]">
          <div className="mx-auto max-w-[1320px]">
            <div className="max-w-[460px] rounded-3xl border border-white/25 bg-white/10 p-8 text-white backdrop-blur-md md:p-10">
              <div className="b1-mono text-eyebrow mb-4 tracking-[0.2em] text-white/80">
                {SECTION.eyebrow}
              </div>
              <h2 className="m-0 text-[30px] leading-[1.12] font-bold tracking-[-0.02em] md:text-[40px]">
                {SECTION.headingShort}
              </h2>
              <p className="text-body-sm mt-4 leading-[1.8] text-white/90">{SECTION.lead}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={flow.openPanel}
                  className={cn(
                    FOCUS_ON_PHOTO,
                    'text-b1-accent text-label inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold transition-transform hover:-translate-y-0.5'
                  )}
                >
                  {SECTION.ctaLabel}
                  <ArrowRight size={16} />
                </button>
                <Link
                  href="/location"
                  className={cn(
                    FOCUS_ON_PHOTO,
                    'text-label inline-flex min-h-11 items-center border-b-2 border-transparent px-1 font-semibold text-white transition-colors hover:border-white'
                  )}
                >
                  {SECTION.directionsLabel}
                </Link>
              </div>
              <p className="text-caption mt-6 flex items-start gap-1.5 border-t border-white/25 pt-5 text-white/90">
                <MapPin size={15} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0" />
                {CHURCH_LOCATION.address}
              </p>
            </div>
          </div>
        </div>
      </section>

      <MorphPanel flow={flow} />
    </>
  );
};
