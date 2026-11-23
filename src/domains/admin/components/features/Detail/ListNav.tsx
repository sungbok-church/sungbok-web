'use client';

import { type ListMemory, neighbors, readListMemory } from '@/domains/admin/lib/listMemory';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ListIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';

interface Props {
  /** 목록 주소(/admin/users) */
  listPath: string;
  /** 지금 보고 있는 항목 id(이전 · 다음을 찾는다) */
  id: string;
}

const noSubscribe = () => () => {};

/**
 * 상세 머리의 [목록] · 이전 · 다음(설계 6.10) — 마지막으로 본 목록의 조건 · 쪽으로 돌아가고, 그 쪽의 순서로 옆 항목에 간다.
 * 기억이 없으면(주소로 바로 들어온 경우) 기본 목록, 이전 · 다음은 숨긴다.
 */
export const ListNav = ({ listPath, id }: Props) => {
  // 탭 저장소는 브라우저에만 있다 — 서버에서는 기본 목록, 글자로 비교해 같으면 다시 그리지 않는다
  const raw = useSyncExternalStore(
    noSubscribe,
    () => JSON.stringify(readListMemory(window.sessionStorage, listPath)),
    () => JSON.stringify({ href: listPath, ids: [] })
  );
  const memory = useMemo(() => JSON.parse(raw) as ListMemory, [raw]);
  const { prev, next } = neighbors(memory.ids, id);

  return (
    <>
      <Button variant="outline" nativeButton={false} render={<Link href={memory.href} />}>
        <ListIcon data-icon="inline-start" />
        목록
      </Button>
      {(prev || next) && (
        <div className="flex">
          <Button
            variant="outline"
            size="icon"
            aria-label="이전 항목"
            disabled={!prev}
            nativeButton={false}
            render={prev ? <Link href={`${listPath}/${prev}`} /> : <span />}
            className="rounded-r-none"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="다음 항목"
            disabled={!next}
            nativeButton={false}
            render={next ? <Link href={`${listPath}/${next}`} /> : <span />}
            className="-ml-px rounded-l-none"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </>
  );
};
