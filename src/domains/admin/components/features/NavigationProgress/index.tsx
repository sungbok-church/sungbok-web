'use client';

import {
  isInAppClick,
  leadsElsewhere,
  NAVIGATION_START,
  type NavigationStartDetail,
  signalNavigationStart,
} from '@/domains/admin/lib/navigationProgress';
import { cn } from '@/shared/lib/utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'loading' | 'done';

// 끝나지 않는 이동이어도 표시줄이 남지 않게 — 주소가 바뀌지 않는 이동(같은 화면으로 돌아오는 리다이렉트, download 속성 없는
// 파일 링크 등)은 끝을 알 수 없어 이 시간 뒤에 사라진다
const GIVE_UP_MS = 10_000;

/**
 * 화면 이동 중 위쪽에 뜨는 얇은 진행 표시줄 — 누르는 순간 «눌렸다» 를 보여 준다(서버 응답을 기다리는 동안 멈춘 것처럼 보이지 않게).
 * 링크 클릭은 여기서 알아채 신호(NAVIGATION_START)를 내고 — 본문 뼈대(PendingScreen)도 같은 신호를 듣는다 —, router.push 로
 * 옮기는 곳은 useAdminNavigate 가 신호를 낸다. 출발한 주소에서 바뀌면(새 화면이 그려지면) 끝난다.
 * 클릭은 링크 자신의 처리보다 먼저(capture) 듣는다 — <Link> 가 스스로 preventDefault 하므로 나중에 들으면 구별할 수 없다.
 */
export const NavigationProgress = () => {
  const location = `${usePathname()}?${useSearchParams().toString()}`;
  const here = useRef(location);
  const [state, setState] = useState<{ phase: Phase; from: string }>({ phase: 'idle', from: '' });
  // 출발한 주소에서 바뀌었으면 끝 — 그리는 중에 바로 맞춘다(효과에서 상태를 바꾸면 한 번 더 그린다)
  if (state.phase === 'loading' && location !== state.from) setState({ ...state, phase: 'done' });

  useEffect(() => {
    here.current = location;
  }, [location]);

  useEffect(() => {
    const start = (e: Event) => {
      const href = (e as CustomEvent<NavigationStartDetail>).detail?.href;
      // 지금 화면으로 가는 이동 — 앞서 누른 이동을 대신한다(Next 가 버린다). 켜 둔 표시줄은 끝내고 새로 켜지 않는다
      if (!href || !leadsElsewhere(href, window.location.href)) {
        // 켜는 중(idle, 다음 프레임에 loading 예약)이면 from 을 비워 그 예약을 무효로 한다
        setState(s =>
          s.phase === 'loading'
            ? { ...s, phase: 'done' }
            : s.phase === 'idle'
              ? { phase: 'idle', from: '' }
              : s
        );
        return;
      }
      const from = here.current;
      // 0 에서 다시 시작한다 — 끝나는 중(done)에 또 누르면 꽉 찬 표시줄이 뒤로 줄어드는 것처럼 보였다.
      // 한 번 0 으로 그린 다음 프레임에 나아가게 한다(같은 프레임이면 줄어드는 움직임이 그대로 보인다)
      setState({ phase: 'idle', from });
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setState(s => (s.from === from ? { phase: 'loading', from } : s))
        )
      );
    };
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (
        a instanceof HTMLAnchorElement &&
        isInAppClick(
          e,
          { href: a.href, target: a.target, download: a.hasAttribute('download') },
          window.location.href
        )
      )
        // 갈 곳을 실어 알린다 — 이 표시줄(start)과 본문 뼈대(PendingScreen)가 함께 듣는다
        signalNavigationStart(a.href);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener(NAVIGATION_START, start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener(NAVIGATION_START, start);
    };
  }, []);

  const { phase } = state;
  useEffect(() => {
    if (phase === 'idle') return;
    const t = setTimeout(
      () => setState(s => ({ ...s, phase: 'idle' })),
      phase === 'done' ? 250 : GIVE_UP_MS
    );
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      {/* transform(가로 늘이기) · opacity 로만 움직인다. 움직임 줄이기 설정이면 움직이지 않고 그 상태로 바로 보인다 */}
      <div
        className={cn(
          'bg-primary h-full w-full origin-left ease-out motion-reduce:transition-none',
          phase === 'idle' && 'scale-x-0 opacity-0',
          // 처음에 빨리 나아가다 느려진다 — 끝은 새 화면이 그려질 때 채운다
          phase === 'loading' && 'scale-x-[0.8] transition-[scale] duration-[8000ms]',
          phase === 'done' && 'scale-x-100 opacity-0 transition-[scale,opacity] duration-200'
        )}
      />
    </div>
  );
};
