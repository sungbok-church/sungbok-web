import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

/**
 * 없는 주소 안내 — 공개 사이트 틀(헤더·푸터) 안에서 그린다.
 * 어디에도 없는 주소(`app/not-found.tsx`)와 페이지가 notFound() 를 부른 경우(`app/(site)/not-found.tsx`)가 함께 쓴다.
 * 좌우 여백·본문 폭은 SectionShell 과 같다(px-[6vw] → max-w-[1320px]).
 */
export const NotFoundMessage = () => (
  <div className="px-[6vw] pt-[84px] pb-20 md:pt-[100px] md:pb-28 lg:pt-[128px]">
    <div className="mx-auto w-full max-w-[1320px]">
      <h1 className="text-h1 text-b1-text">페이지를 찾을 수 없습니다</h1>
      <p className="text-body text-b1-sub mt-3">주소가 바뀌었거나 없는 페이지입니다.</p>
      <Link href="/" className={cn(OUTLINE_BTN, FOCUS, 'text-label mt-8 min-h-11 px-4')}>
        홈으로
      </Link>
    </div>
  </div>
);
