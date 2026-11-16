'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// 알림 문구를 보이는 시간
const SHOW_FOR = 2600;

export type CopyMessages = {
  /** 복사에 성공했을 때 */
  copied: string;
  /** 복사가 막혔을 때(권한 거부, 보안 연결이 아닌 주소) — 손으로 복사할 방법을 알린다 */
  failed: string;
};

/**
 * 글을 클립보드에 넣고 결과 문구를 잠깐 돌려준다(message, 없으면 null). 문구는 쓰는 곳이 정한다 —
 * «링크 복사»(useCopyLink)와 찾아오시는 길의 «주소 복사» 가 함께 쓴다.
 * messages 는 모듈 상수로 넘긴다(렌더마다 새 객체면 copy 가 매번 새 함수가 된다).
 */
export const useCopyText = (messages: CopyMessages) => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      let copied = false;
      try {
        // 보안 연결이 아니면 navigator.clipboard 자체가 없다 — 그때도 아래 catch 로 간다
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
      setMessage(copied ? messages.copied : messages.failed);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), SHOW_FOR);
    },
    [messages]
  );

  return { message, copy };
};
