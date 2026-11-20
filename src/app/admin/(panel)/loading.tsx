import { Skeleton } from '@/shared/components/ui/skeleton';

// 관리자 화면을 읽는 동안의 뼈대(설계 6.10 «편의 기능 › 불러오는 중») — 머리 · 검색 막대 · 표 줄.
export default function AdminLoading() {
  return (
    <div role="status" aria-label="불러오는 중" className="flex flex-col gap-6">
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
    </div>
  );
}
