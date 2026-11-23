'use client';

import {
  type HistoryItem,
  type HistoryTarget,
  loadHistory,
} from '@/domains/admin/api/actions/historyActions';
import { AuditEntry } from '@/domains/admin/components/features/AuditEntry';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Empty, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
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
import { useEffect, useEffectEvent, useState, useTransition } from 'react';

type Loaded = { items: HistoryItem[]; names: Record<string, string>; hasMore: boolean };

type Props = HistoryTarget & {
  /** 창 제목에 쓰는 대상 이름(«홍길동», «콘텐츠 담당», «메뉴 관리») */
  subject: string;
} & (
    | { open?: never; onOpenChange?: never }
    /** 버튼 없이 밖에서 연다(상세 머리의 «더 보기» 메뉴) — 창은 메뉴 밖에 둔다 */
    | { open: boolean; onOpenChange: (open: boolean) => void }
  );

/**
 * «변경 이력» 버튼 — 누르면 오른쪽에서 창이 열리고 그때 이력을 읽는다(설계 6.7). 화면에 늘어놓지 않는다.
 * rowId 가 있으면 한 건(상세), 없으면 그 화면 전체(목록만 있는 메뉴 · 코드).
 * open 을 주면 버튼 없이 밖에서 연다. 버튼 · 메뉴 항목은 그 메뉴의 «변경 이력 보기» 권한이 있을 때만 그린다(서버도 다시 확인한다).
 */
export const HistorySheet = ({ subject, open: openProp, onOpenChange, ...target }: Props) => {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useEffectEvent(() =>
    startTransition(async () => {
      setError(null);
      const result = await loadHistory(target);
      if (result.ok && result.data) setLoaded(result.data);
      else if (!result.ok) setError(result.error.message);
    })
  );
  // 열릴 때마다 새로 읽는다 — 버튼으로 열든 밖에서 열든 같다
  useEffect(() => {
    if (open) load();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {openProp === undefined && (
        <SheetTrigger render={<Button variant="outline" />}>
          <HistoryIcon data-icon="inline-start" />
          변경 이력
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>변경 이력</SheetTitle>
          <SheetDescription>{subject} · 최신순</SheetDescription>
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
