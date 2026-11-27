'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react';

type Props = { content: Promise<ReactNode>; fallback: ReactNode };

const Arrive = ({ content, fallback }: Props) => {
  // Next 가 지금 그리는 화면의 경로 — 주소줄(window.location)은 Next 가 그린 뒤에야 바뀌어 그리는 중에는 앞 주소다
  const path = usePathname();
  // 이 약속을 받은 화면(커밋)의 경로 — 받는 쪽 효과가 읽는다. 효과는 선언 순서대로 돌아 아래 효과보다 먼저 맞춰진다
  const committed = useRef(path);
  useEffect(() => {
    committed.current = path;
  });
  const [shown, setShown] = useState<{ node: ReactNode; path: string } | null>(null);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  useEffect(() => {
    let live = true;
    // 내용은 그것을 요청한 화면의 경로 것이다 — 도착한 때의 경로로 적으면 뒤로 가기와 겹칠 때 다른 글이 붙는다
    const at = committed.current;
    content.then(
      node => {
        if (live) setShown({ node, path: at });
      },
      error => {
        if (live) setFailure({ error });
      }
    );
    return () => {
      live = false;
    };
  }, [content]);
  if (failure) throw failure.error;
  // 같은 경로면(검색 · 쪽 · 정렬 · 저장 뒤 다시 읽음) 새 내용이 올 때까지 지금 내용을 둔다. 경로가 다르면(이전 · 다음 글) 뼈대
  return shown !== null && shown.path === path ? shown.node : fallback;
};

/**
 * 서버가 그린 부분을 약속(Promise)으로 받아 오는 대로 그 자리에 보인다 — 오기 전에는 fallback(그 자리의 뼈대).
 * 화면의 틀은 미리 만들어 누르는 즉시 보이고, 서버에서 받아야 하는 내용(목록 줄 · 상세 값 · 수정 폼)만 이것으로 뒤따라 온다(ADR 0027).
 * 내용을 바꿀 때 <Suspense> 로 바꿔 끼우지 않는 까닭: React 는 자리 표시를 한 번 보이면 0.3초는 두고 바꾼다(useArrived 와 같다).
 * 같은 경로에서 다시 읽으면(검색 · 쪽 · 정렬 · 저장 뒤) 새 내용이 올 때까지 지금 내용을 그대로 둔다. 다른 경로의 내용은 보이지 않고
 * 새 내용이 올 때까지 뼈대다 — 앞 글의 단추를 누르면 앞 글에 적용되기 때문이다(Next 16.4 는 글마다 따로 그리지만 — 화면 키에 id —
 * 같은 부품이 다른 경로에 남는 경우를 막아 둔다).
 * 받지 못하면 그 오류를 던진다(권한이 없으면 받는 쪽이 «없음» 으로 끊는다).
 * 바깥 <Suspense> 는 경로를 모르는 때(빌드 때 미리 만드는 틀 — 글 id 가 든 주소)에만 같은 뼈대를 둔다. 브라우저에서는 경로를 늘
 * 알아 멈추지 않으므로 화면을 옮길 때 이 자리 표시는 쓰이지 않는다(0.3초 규칙에 걸리지 않는다).
 */
export const Deferred = (props: Props) => (
  <Suspense fallback={props.fallback}>
    <Arrive {...props} />
  </Suspense>
);
