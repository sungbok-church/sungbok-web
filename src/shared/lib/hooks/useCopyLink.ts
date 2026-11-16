'use client';

import { useCallback } from 'react';

import { useCopyText, type CopyMessages } from './useCopyText';

const MESSAGES: CopyMessages = {
  copied: '링크를 복사했습니다.',
  failed: '복사하지 못했습니다. 주소창의 주소를 복사해 주세요.',
};

/**
 * «링크 복사» — 지금 페이지 주소를 클립보드에 넣고 결과 문구를 잠깐 돌려준다(message, 없으면 null).
 * 복사가 막힌 환경(권한 거부, 보안 연결이 아닌 주소)에서는 주소창에서 복사하라고 알린다.
 */
export const useCopyLink = () => {
  const { message, copy: copyText } = useCopyText(MESSAGES);
  const copy = useCallback(() => copyText(window.location.href), [copyText]);
  return { message, copy };
};
