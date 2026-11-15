import type { ResourceSection } from '@/domains/resources/api/resource.types';
import { resourcePath } from '@/domains/resources/config/resourceSections';
import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

/**
 * 없는 자료(지워졌거나 잘못된 주소·다른 분류의 자료·임시저장) — 서브페이지 머리(SectionShell)는 그대로 두고
 * 안내와 목록 링크만 보인다. 예배 영상의 «이 설교 영상을 찾을 수 없습니다.» 와 같은 모양이다.
 */
export const ResourceNotFound = ({ section }: { section: ResourceSection }) => (
  <div className="text-b1-sub flex flex-wrap items-center gap-x-4 gap-y-3 py-10">
    <p>이 자료를 찾을 수 없습니다.</p>
    <Link
      href={resourcePath(section)}
      className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}
    >
      자료 목록
    </Link>
  </div>
);
