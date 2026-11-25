/**
 * MorphFrame — 히어로 화면 전체를 카드로 변형하는 프레임(시안 P 승격, 2026-10-19).
 *
 * 바깥 창(비균등 scale + overflow hidden) × 안쪽 콘텐츠 역scale(cover) 로 레이아웃 속성 없이 비율까지 변형한다.
 * 부모(HomeLead)가 rAF 에서 update() 로 CSS 변수만 쓴다. 카드가 되는 사진은 히어로 전경 그대로 — 마스크 없는
 * 전체폭 전경 레이어를 히어로 사진 상자에 픽셀 정렬해 두고(q=0) q 가 커질수록 identity 로 풀어준다(사진 교체 없음).
 * 전경 레이어 상자는 왼쪽으로 EXT_G 만큼 넓혀 정렬 중에도 왼쪽이 비지 않게 한다 — 안착 타일도 같은 상자를 쓴다.
 */
'use client';

import { Photo } from '@/shared/components/features/Photo';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import type { HomeHeroData } from '@/domains/home/api/homeHero';
import { HomeHero } from '@/domains/home/components/widgets/HomeHero';
import { heroImageSizes } from '@/domains/home/components/widgets/HomeHero/imageConfig';

import { exteriorAlign, fullRect, PHOTO_HERO_BOX, type Rect } from './morphMath';

const YOUTUBE_HERO_BOX = { left: 0, width: 1, pos: 0.6 };

export type FrameState = {
  /** 카드 픽셀 기하(뷰포트 좌표). null = 전체화면 */
  rect: Rect | null;
  /** 0 전체화면 → 1 카드 */
  q: number;
  /** 히어로 → 전경 레이어 크로스페이드 */
  f1: number;
  /** 히어로 카피 불투명도 */
  copy: number;
  /** false 면 프레임을 숨김(안착 후 타일에 핸드오프) */
  visible: boolean;
};
export type MorphFrameHandle = { update: (s: FrameState) => void };

/** 전경 연속 레이어의 왼쪽 여유 폭(뷰포트 비율) */
export const EXT_G = 0.24;

// 보이지 않는 동안은 visibility 도 끈다 — 투명한 히어로 CTA 가 키보드 포커스/클릭을 받지 않도록(a11y)
const CSS = `.mf-copy{opacity:var(--copy);visibility:var(--copy-vis)}`;

export const MorphFrame = forwardRef<
  MorphFrameHandle,
  { className?: string; radius: number; hero: HomeHeroData }
>(({ className, radius, hero }, ref) => {
  // 전경 레이어를 히어로 사진 상자에 픽셀 정렬하는 데 쓰는 사진 크기(관리자에서 바꾸면 따라간다)
  const img = { w: hero.photo.width, h: hero.photo.height };
  // 유튜브면 대표 사진이 화면 전체(object-position 60%)라 그 구도에 맞춘다(HeroVideo 의 포스터와 같은 값)
  const box = hero.kind === 'youtube' ? YOUTUBE_HERO_BOX : PHOTO_HERO_BOX;
  const rootRef = useRef<HTMLDivElement>(null);
  const extRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    update(s) {
      const el = rootRef.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const g = s.rect ?? fullRect(vw, vh);
      const sx = g.w / vw;
      const sy = g.h / vh;
      const k = Math.max(sx, sy);
      const st = el.style;
      st.setProperty('--fx', `${(g.cx - vw / 2).toFixed(2)}px`);
      st.setProperty('--fy', `${(g.cy - vh / 2).toFixed(2)}px`);
      st.setProperty('--sx', sx.toFixed(4));
      st.setProperty('--sy', sy.toFixed(4));
      st.setProperty('--ix', (k / sx).toFixed(4));
      st.setProperty('--iy', (k / sy).toFixed(4));
      st.setProperty('--r', `${(radius * s.q).toFixed(1)}px`);
      st.setProperty('--f1', s.f1.toFixed(3));
      st.setProperty('--copy', s.copy.toFixed(3));
      st.setProperty('--copy-vis', s.copy > 0 ? 'visible' : 'hidden');
      st.setProperty('--vis', s.visible ? '1' : '0');
      st.setProperty('--vis-v', s.visible ? 'visible' : 'hidden');
      if (extRef.current) {
        const a = exteriorAlign(s.q, vw, vh, img, EXT_G, box);
        extRef.current.style.transform = `translate(${a.tx.toFixed(2)}px,${a.ty.toFixed(2)}px) scale(${a.k.toFixed(5)})`;
      }
    },
  }));

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none ${className ?? ''}`}
      style={
        {
          '--fx': '0px',
          '--fy': '0px',
          '--sx': 1,
          '--sy': 1,
          '--ix': 1,
          '--iy': 1,
          '--r': '0px',
          '--f1': 0,
          '--copy': 1,
          '--copy-vis': 'visible',
          '--vis': 1,
          '--vis-v': 'visible',
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>
      <div
        className="bg-b1-bg pointer-events-auto absolute inset-0 overflow-hidden"
        style={{
          transform: 'translate3d(var(--fx),var(--fy),0) scale(var(--sx),var(--sy))',
          borderRadius: 'calc(var(--r) / var(--sx)) / calc(var(--r) / var(--sy))',
          opacity: 'var(--vis)',
          visibility: 'var(--vis-v)' as React.CSSProperties['visibility'],
          willChange: 'transform',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ transform: 'scale(var(--ix),var(--iy))', willChange: 'transform' }}
        >
          <div className="absolute inset-0" style={{ opacity: 'calc(1 - var(--f1))' }}>
            <HomeHero copyClassName="mf-copy" hero={hero} />
          </div>
          <div
            ref={extRef}
            aria-hidden
            className="absolute inset-y-0 right-0 origin-top-left"
            style={{ left: `${-EXT_G * 100}%`, opacity: 'var(--f1)', willChange: 'transform' }}
          >
            <Photo
              src={hero.photo}
              alt=""
              fill
              sizes={heroImageSizes(hero.kind)}
              className="object-cover object-[55%_50%]"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
MorphFrame.displayName = 'MorphFrame';
