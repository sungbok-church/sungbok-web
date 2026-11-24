'use client';

import {
  type BulletinPreviewValues,
  PREVIEW_READY,
  PREVIEW_VALUES,
  readPreviewMessage,
  toPreviewIssue,
} from '@/domains/admin/lib/preview';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { useEffect, useState } from 'react';

/**
 * 미리보기 틀(iframe) 안 — 부모(등록 · 수정 화면)가 보낸 저장 전 값을 공개 화면 부품 그대로 그린다(설계 6.10).
 * 붙으면 부모에게 «준비됨» 을 알리고, 값이 올 때마다 다시 그린다. 같은 출처의 메시지만 받는다.
 */
export const BulletinPreviewFrame = () => {
  const [values, setValues] = useState<BulletinPreviewValues | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = readPreviewMessage(event, window.location.origin);
      if (message?.type === PREVIEW_VALUES) setValues(message.values);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!values) return null;
  const issue = toPreviewIssue(values, readSupabaseEnv()?.url ?? '');
  return issue.pages.length > 0 ? (
    <BulletinPage issues={[issue]} basePath="/news/bulletin" />
  ) : null;
};
