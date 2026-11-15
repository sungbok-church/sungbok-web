import type { NewsImage } from '@/domains/news/api/news.types';
import { cn } from '@/shared/lib/utils';
import Image from 'next/image';
import type { CSSProperties } from 'react';

export type SpreadSide = 'left' | 'right';
/** half: 한 면, spread: 양면, auto: 고르기 전 — 휴대폰은 한 면, 태블릿부터 양면(CSS 로 가른다) */
export type SpreadView = 'half' | 'spread' | 'auto';

interface Props {
  image: NewsImage;
  alt: string;
  view: SpreadView;
  side: SpreadSide;
  /** 첫 화면에 보이는 큰 그림이면 먼저 받는다 */
  preload?: boolean;
  className?: string;
}

/**
 * 주보 그림 한 장 — 그림 하나가 펼친 두 면(왼쪽·오른쪽)이다. «한 면» 은 그림을 틀의 두 배 폭으로 놓고 반쪽만 보인다.
 * 고르기 전(auto)의 모양은 CSS 가 가른다 — 화면 폭을 스크립트로 읽어 정하면 휴대폰에서 양면으로 한 번 그려졌다가 바뀐다.
 * 이미 줄여 둔 그림이라 그대로 싣는다(unoptimized) — 확대해서 읽어야 하므로 다시 줄이지 않는다.
 */
export const SpreadImage = ({ image, alt, view, side, preload, className }: Props) => (
  <span
    style={
      {
        '--half': `${image.width / 2} / ${image.height}`,
        '--full': `${image.width} / ${image.height}`,
      } as CSSProperties
    }
    className={cn(
      'bg-b1-surface relative block overflow-hidden',
      view === 'half' && 'aspect-(--half)',
      view === 'spread' && 'aspect-(--full)',
      view === 'auto' && 'aspect-(--half) md:aspect-(--full)',
      className
    )}
  >
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={alt}
      unoptimized
      preload={preload}
      loading={preload ? undefined : 'eager'}
      className={cn(
        'absolute top-0 h-full max-w-none',
        side === 'left' ? 'left-0' : 'right-0',
        view === 'half' && 'w-[200%]',
        view === 'spread' && 'w-full',
        view === 'auto' && 'w-[200%] md:w-full'
      )}
    />
  </span>
);
