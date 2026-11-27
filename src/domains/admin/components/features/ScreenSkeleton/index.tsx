import type { ScreenShape } from '@/domains/admin/lib/navigationProgress';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

// 관리자 화면을 읽는 동안의 뼈대(설계 6.10 «편의 기능 › 불러오는 중») — 모양은 갈 화면을 보고 고른다(screenShape: 묶음 · 목록).
// 다른 화면으로 가는 순간 브라우저가 바로 그린다(PendingScreen) — 서버에서 받는 loading.tsx 는 두지 않는다.
export const ScreenSkeleton = ({ shape }: { shape: ScreenShape }) => (
  <div role="status" aria-label="불러오는 중" data-shape={shape} className="flex flex-col gap-6">
    {shape === 'groups' ? <GroupsBody /> : <ListBody />}
  </div>
);

/** 목록 화면 — 머리 · 검색 막대 · 표 줄 */
const ListBody = () => (
  <>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <Skeleton className="h-14 w-full rounded-lg" />
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </>
);

/** 코드 · 분류 관리 — 머리(제목 · 변경 이력), 왼쪽 묶음 목록 + 오른쪽 그 묶음(이름 · 더하기 칸 · 표). ItemGroups 와 같은 칸 나눔 */
const GroupsBody = () => (
  <>
    <div className="flex items-start justify-between gap-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1 lg:flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 lg:w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* 더하기 칸(ItemCreateForm)과 같은 배치 — 좁으면 세로, 넓으면 이름 · 영문 값 · 버튼이 한 줄 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {['sm:w-56', 'sm:w-64'].map(width => (
              <div key={width} className={cn('flex flex-col gap-2', width)}>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <Skeleton className="h-9 w-20" />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </>
);
