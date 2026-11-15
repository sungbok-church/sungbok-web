import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

// 없는 날짜의 주보(잘못된 주소·내린 호)
export default function NotFound() {
  return (
    <div className="text-b1-sub flex flex-wrap items-center gap-x-4 gap-y-3 py-10">
      <p>이 날짜의 주보를 찾을 수 없습니다.</p>
      <Link href="/news/bulletin" className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}>
        최신 주보
      </Link>
    </div>
  );
}
