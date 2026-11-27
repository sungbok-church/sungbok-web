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
import { useEffect, useEffectEvent, useRef, useState, useTransition } from 'react';

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
  // «더 보기» 의 실패는 버튼 곁에(긴 목록을 내려 누른 사람이 위쪽 알림을 못 보지 않게)
  const [moreError, setMoreError] = useState<string | null>(null);
  // 이어 붙인 첫 줄 — 받은 뒤 포커스를 옮긴다(키보드 · 낭독기가 새 줄부터 읽게, 마지막 묶음이면 버튼이 사라진다)
  const firstNew = useRef<HTMLLIElement>(null);
  // 창을 새로 읽을 때마다 늘린다 — 그 전에 누른 «더 보기» 가 늦게 오면 버린다(새 목록 뒤에 옛 목록 다음 묶음이 붙어 틈이 생기지 않게)
  const generation = useRef(0);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);
  // 이어 붙인 첫 줄이 그려진 뒤 포커스 — 표시(focusFrom)는 새로 읽을 때(창을 다시 열 때) 지운다
  useEffect(() => {
    if (focusFrom !== null) firstNew.current?.focus();
  }, [focusFrom]);
  const [pending, startTransition] = useTransition();

  const load = useEffectEvent(() =>
    startTransition(async () => {
      generation.current += 1;
      setError(null);
      setMoreError(null);
      setFocusFrom(null);
      const result = await loadHistory(target);
      if (result.ok && result.data) setLoaded(result.data);
      else if (!result.ok) setError(result.error.message);
    })
  );
  // «더 보기» — 받은 것 중 가장 오래된 줄보다 오래된 것을 이어 붙인다(이름표도 합친다)
  const loadMore = () =>
    startTransition(async () => {
      if (!loaded) return;
      setMoreError(null);
      const from = loaded.items.length;
      const last = loaded.items[from - 1];
      const asked = generation.current;
      const result = await loadHistory(target, last?.id);
      if (asked !== generation.current) return;
      if (result.ok && result.data) {
        const more = result.data;
        if (more.items.length > 0) setFocusFrom(from);
        setLoaded(prev =>
          prev
            ? {
                items: [...prev.items, ...more.items],
                names: { ...prev.names, ...more.names },
                hasMore: more.hasMore,
              }
            : more
        );
      } else if (!result.ok) setMoreError(result.error.message);
    });
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
              {loaded.items.map((item, i) => (
                <li
                  key={item.id}
                  ref={i === focusFrom ? firstNew : undefined}
                  tabIndex={i === focusFrom ? -1 : undefined}
                  className="border-b py-4 outline-none first:pt-0 last:border-b-0"
                >
                  <AuditEntry item={item} names={loaded.names} />
                </li>
              ))}
            </ol>
          )}
          {moreError && (
            <Alert variant="destructive" className="mt-4">
              <CircleAlertIcon aria-hidden />
              <AlertDescription>{moreError}</AlertDescription>
            </Alert>
          )}
          {loaded?.hasMore && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={loadMore}
              disabled={pending}
              // 기다리는 동안에도 포커스가 버튼에 남게(aria-disabled)
              focusableWhenDisabled
            >
              {pending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  불러오는 중
                </>
              ) : (
                '더 보기'
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
