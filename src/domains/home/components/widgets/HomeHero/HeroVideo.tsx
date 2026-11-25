'use client';

import { Photo } from '@/shared/components/features/Photo';
import type { UploadedPhoto } from '@/shared/lib/photoVariant';
import { createPlayer } from '@/shared/lib/youtubePlayer';
import { Pause, Play } from 'lucide-react';
import type { StaticImageData } from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const WIDE = '(min-width: 1024px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

/** 영상을 틀어도 되는가 — 넓은 화면 · 동작 줄이기 꺼짐 · 데이터 절약 꺼짐. 설정 · 창 크기가 바뀌면 따라간다 */
const subscribe = (onChange: () => void) => {
  const lists = [window.matchMedia(WIDE), window.matchMedia(REDUCED)];
  lists.forEach(l => l.addEventListener('change', onChange));
  return () => lists.forEach(l => l.removeEventListener('change', onChange));
};
const canPlay = () =>
  window.matchMedia(WIDE).matches &&
  !window.matchMedia(REDUCED).matches &&
  !(navigator as { connection?: { saveData?: boolean } }).connection?.saveData;

/** 이 화면에서 히어로 영상을 틀어도 되는가(조건만) */
export const useHeroVideoEnabled = () => useSyncExternalStore(subscribe, canPlay, () => false);

// 영상이 지금 실제로 보이는가(재생이 시작돼 드러났고 멈추지 않았다) — 변형 무대가 사진 전환 시점을 정하는 데 쓴다.
// 히어로는 홈에 하나뿐이라 모듈 하나에 둔다
let showing = false;
const showingListeners = new Set<() => void>();
const setShowing = (next: boolean) => {
  if (showing === next) return;
  showing = next;
  showingListeners.forEach(l => l());
};
export const useHeroVideoShowing = () =>
  useSyncExternalStore(
    l => {
      showingListeners.add(l);
      return () => showingListeners.delete(l);
    },
    () => showing,
    () => false
  );

/** 첫 화면이 다 그려진 뒤(load + 한가할 때) — 플레이어(수백 KB)가 대표 사진(첫 화면의 가장 큰 그림)과 회선을 다투지 않게 */
const afterFirstPaint = (run: () => void) => {
  let cancel = () => {};
  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, 0);
      cancel = () => window.clearTimeout(id);
    }
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    window.removeEventListener('load', schedule);
    cancel();
  };
};

/**
 * 홈 히어로의 유튜브 «분위기 영상»(설계 6.12, 시안 B 승격 2026-11-25). 대표 사진을 먼저 그리고(첫 화면의 가장 큰 그림 — 먼저 받는다),
 * 넓은 화면(lg) · 동작 줄이기 꺼짐 · 데이터 절약 꺼짐일 때만, 첫 화면이 다 그려진 뒤 소리 없이 반복 재생한다. 실제로 재생되기 시작하고
 * 조금 더 기다린 뒤에만 영상을 서서히 보인다 — 유튜브가 시작할 때 잠깐 띄우는 제목 · 로고를 가리려고. 영상을 crop 배로 키워
 * 가장자리(제목 줄 · 로고)를 잘라 낸다. 영상 쪽은 inert(포커스 · 클릭 · 낭독기 모두 없음) — 대신 [멈춤] 단추 하나(WCAG 2.2.2).
 * 화면 밖에 나가면 멈춘다. controlsClassName: 단추에 얹을 클래스(카피와 함께 사라지게).
 */
export const HeroVideo = ({
  videoId,
  poster,
  sizes,
  posterPosition = '60% 50%',
  crop = 1.2,
  revealDelayMs = 900,
  controlsClassName,
}: {
  videoId: string;
  poster: StaticImageData | UploadedPhoto;
  sizes: string;
  posterPosition?: string;
  crop?: number;
  revealDelayMs?: number;
  controlsClassName?: string;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<{ playVideo(): void; pauseVideo(): void } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  // 마지막으로 본 화면 안/밖 — 플레이어가 준비되기 전에 지나쳐 내려갔으면 준비되자마자 멈춘다
  const visibleRef = useRef(true);
  const enabled = useHeroVideoEnabled();

  useEffect(() => {
    const el = holder.current;
    const wrap = box.current;
    if (!el || !wrap || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let destroy = () => {};
    let io: IntersectionObserver | null = null;
    let raf = 0;
    let shown: boolean | null = null;
    // 보이는가 = 화면 안(IO) + 실제로 보임(카드가 내려앉아 변형 무대가 숨기거나 투명하게 만든 뒤에는 화면 안이어도 안 보인다).
    // 바뀔 때만 틀고 멈춘다. 사람이 멈춘 영상은 다시 틀지 않는다
    const sync = () => {
      const next =
        visibleRef.current &&
        (wrap.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
      if (next === shown) return;
      shown = next;
      if (!player.current || pausedRef.current) return;
      if (next) player.current.playVideo();
      else player.current.pauseVideo();
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (visibleRef.current) sync();
      });
    };
    const stopWaiting = afterFirstPaint(() => {
      destroy = createPlayer(el, videoId, {
        autoplay: true,
        muted: true,
        loop: true,
        onReady: p => {
          player.current = p;
          shown = null;
          sync();
        },
        onStateChange: state => {
          if (state !== 1) return;
          // 자동재생이 준비 때의 멈춤을 무시하고 시작하는 경우가 있다 — 보이지 않거나 사람이 멈췄으면 다시 멈춘다
          if (pausedRef.current || shown === false) player.current?.pauseVideo();
          if (!timer) timer = setTimeout(() => setPlaying(true), revealDelayMs);
        },
      });
      // 화면 밖이면 멈춘다(배터리 · 데이터)
      io = new IntersectionObserver(([entry]) => {
        visibleRef.current = entry.isIntersecting;
        sync();
      });
      io.observe(wrap);
      window.addEventListener('scroll', onScroll, { passive: true });
    });
    return () => {
      stopWaiting();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
      destroy();
      player.current = null;
      // 플레이어를 새로 만들면 처음 상태로(멈춘 채 단추가 사라져 다시 틀 수 없게 되지 않게)
      pausedRef.current = false;
      setPaused(false);
      setPlaying(false);
    };
  }, [videoId, revealDelayMs, enabled]);

  useEffect(() => {
    setShowing(playing && !paused);
    return () => setShowing(false);
  }, [playing, paused]);

  const toggle = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    if (next) player.current?.pauseVideo();
    else player.current?.playVideo();
  };

  return (
    <>
      <div
        ref={box}
        inert
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <Photo
          src={poster}
          alt=""
          fill
          preload
          fetchPriority="high"
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition: posterPosition }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-out motion-reduce:transition-none"
          style={{ opacity: playing ? 1 : 0, containerType: 'size' }}
        >
          <div
            ref={holder}
            className="absolute top-1/2 left-1/2"
            style={{
              // 상자를 덮는 16:9(cover) 크기 + crop 배 확대
              width: 'max(100cqw, 177.78cqh)',
              height: 'max(100cqh, 56.25cqw)',
              transform: `translate(-50%, -50%) scale(${crop})`,
            }}
          />
        </div>
      </div>
      {playing && (
        <button
          type="button"
          onClick={toggle}
          // 이름은 고정하고 상태는 aria-pressed 로(누름 = 멈춤). 자리는 오른쪽 위 — 오른쪽 아래는 «등록 · 문의» 버튼 자리
          aria-pressed={paused}
          aria-label="배경 영상 멈춤"
          className={`bg-b1-surface/85 text-b1-text focus-visible:ring-b1-accent animate-in fade-in-0 absolute top-24 right-6 z-20 grid size-11 place-items-center rounded-full shadow-sm backdrop-blur-sm duration-700 focus-visible:ring-2 focus-visible:outline-none motion-reduce:animate-none ${controlsClassName ?? ''}`}
        >
          {paused ? <Play aria-hidden size={18} /> : <Pause aria-hidden size={18} />}
        </button>
      )}
    </>
  );
};
