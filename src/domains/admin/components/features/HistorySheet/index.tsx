'use client';

import {
  type HistoryItem,
  type HistoryTarget,
  loadHistory,
} from '@/domains/admin/api/historyActions';
import { AuditEntry } from '@/domains/admin/components/features/AuditEntry';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { Spinner } from '@/shared/components/ui/spinner';
import { CircleAlertIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

type Loaded = { items: HistoryItem[]; names: Record<string, string>; hasMore: boolean };

type Props = HistoryTarget & {
  /** 창 제목에 쓰는 대상 이름(«홍길동», «콘텐츠 담당», «메뉴 관리») */
  subject: string;
};

/**
 * «변경 이력» 버튼 — 누르면 오른쪽에서 창이 열리고 그때 이력을 읽는다(설계 6.7). 화면에 늘어놓지 않는다.
 * rowId 가 있으면 한 건(상세), 없으면 그 화면 전체(목록만 있는 메뉴 · 코드).
 * 이 버튼은 그 메뉴의 «이력조회» 권한이 있을 때만 페이지가 그린다(서버도 다시 확인한다).
 */
export const HistorySheet = ({ subject, ...target }: Props) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      setError(null);
      const result = await loadHistory(target);
      if (result.ok && result.data) setLoaded(result.data);
      else if (!result.ok) setError(result.error.message);
    });

  return (
    <Sheet onOpenChange={open => open && load()}>
      <SheetTrigger render={<Button variant="outline" />}>
        <HistoryIcon data-icon="inline-start" />
        변경 이력
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>변경 이력</SheetTitle>
          <SheetDescription>{subject} — 누가 언제 무엇을 바꿨는지(최신순)</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {pending && !loaded && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner /> 불러오는 중
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loaded && loaded.items.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>아직 기록이 없습니다</EmptyTitle>
                <EmptyDescription>
                  {target.rowId ? '이 항목을' : '이 화면에서'} 고치면 여기에 남습니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {loaded && loaded.items.length > 0 && (
            <ol className="m-0 flex list-none flex-col p-0">
              {loaded.items.map(item => (
                <li key={item.id} className="border-b py-4 first:pt-0 last:border-b-0">
                  <AuditEntry item={item} names={loaded.names} />
                </li>
              ))}
            </ol>
          )}
          {loaded?.hasMore && (
            <Button variant="link" nativeButton={false} render={<Link href="/admin/audit" />}>
              전체 변경 이력에서 더 보기
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
