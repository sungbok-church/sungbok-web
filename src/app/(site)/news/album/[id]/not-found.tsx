import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

// 없는 앨범(잘못된 주소·내린 글)
export default function NotFound() {
  return (
    <div className="text-b1-sub flex flex-wrap items-center gap-x-4 gap-y-3 py-10">
      <p>이 앨범을 찾을 수 없습니다.</p>
      <Link href="/news/album" className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}>
        교회앨범
      </Link>
    </div>
  );
}
