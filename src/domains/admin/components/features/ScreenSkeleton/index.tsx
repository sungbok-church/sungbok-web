import type { ScreenShape } from '@/domains/admin/lib/navigationProgress';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

// 관리자 화면을 읽는 동안의 뼈대(설계 6.10 «편의 기능 › 불러오는 중») — 모양은 갈 화면을 보고 고른다(screenShape: 묶음 · 입력 · 목록).
// 다른 화면으로 가는 순간 브라우저가 바로 그린다(PendingScreen) — 서버에서 받는 loading.tsx 는 두지 않는다.
export const ScreenSkeleton = ({ shape }: { shape: ScreenShape }) => (
  <div role="status" aria-label="불러오는 중" data-shape={shape} className="flex flex-col gap-6">
    {shape === 'groups' ? <GroupsBody /> : shape === 'form' ? <FormBody /> : <ListBody />}
  </div>
);

/** 목록 화면 — 머리 · 검색 막대 · 표 줄 */
const ListBody = () => (
  <>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <ListRows />
  </>
);

/** 검색 막대 · 표 줄 */
const ListRows = () => (
  <>
    <Skeleton className="h-14 w-full rounded-lg" />
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </>
);

/**
 * 목록의 몸통 뼈대(검색 막대 · 표 줄) — 머리(제목 · 단추)는 미리 만든 틀이 바로 그리고, 몸통은 서버에서 오는 동안 이것(Deferred,
 * ADR 0027). 바깥 칸(본문)의 간격을 그대로 쓰려고 칸을 하나 더 두지 않는다(contents)
 */
export const ListBodySkeleton = () => (
  <div role="status" aria-label="불러오는 중" className="contents">
    <ListRows />
  </div>
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

/** 입력 칸 하나 — 이름 · 칸 */
const FieldSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-9 w-full" />
  </div>
);

/** 등록 · 수정 — 머리, 입력 칸 카드(칸 몇 줄 · 파일 고르는 자리), 아래 버튼 줄(AdminForm 과 같은 배치) */
const FormBody = () => (
  <>
    <Skeleton className="h-8 w-32" />
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-4 w-36" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-16" />
        ))}
      </div>
    </div>
  </>
);

/**
 * 수정 화면 전체의 뼈대(머리 · 입력 칸 카드 · 아래 단추 줄) — 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체가 서버에서 오는
 * 동안 이것(Deferred, ADR 0027)
 */
export const FormScreenSkeleton = () => <ScreenSkeleton shape="form" />;

/**
 * 상세 화면 전체의 뼈대(머리 · 단추 · 값 줄) — 머리(글 제목)부터 글마다 달라 화면 전체가 서버에서 오는 동안 이것(Deferred, ADR 0027)
 */
export const DetailScreenSkeleton = () => (
  <div role="status" aria-label="불러오는 중" className="flex flex-col gap-6">
    <div className="flex items-start justify-between gap-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
    <Card>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);
