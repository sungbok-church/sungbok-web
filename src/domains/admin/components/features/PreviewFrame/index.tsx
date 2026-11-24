'use client';

import {
  PREVIEW_READY,
  PREVIEW_VALUES,
  type PreviewMenu,
  type PreviewPayload,
  readPreviewMessage,
  toPreviewIssue,
  toPreviewSermon,
} from '@/domains/admin/lib/preview';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';
import { SermonWatchPage } from '@/domains/worship-video/components/features/SermonWatchPage';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { useEffect, useState } from 'react';

/** 저장 전 값을 공개 화면 부품 그대로 — 주보는 주보 화면, 주일광고 · 성복의 뜰은 «영상 한 편» 화면 */
const Preview = ({ payload }: { payload: PreviewPayload }) => {
  if (payload.menu === 'bulletin') {
    const issue = toPreviewIssue(payload.values, readSupabaseEnv()?.url ?? '');
    return issue.pages.length > 0 ? (
      <BulletinPage issues={[issue]} basePath="/news/bulletin" />
    ) : null;
  }
  const sermon = toPreviewSermon(payload.values);
  return sermon ? (
    <SermonWatchPage
      page={payload.menu}
      videoId={sermon.id}
      sermons={[sermon]}
      description={payload.values.description}
    />
  ) : null;
};

/**
 * 미리보기 틀(iframe) 안 — 부모(등록 · 수정 화면)가 보낸 저장 전 값을 공개 화면 부품 그대로 그린다(설계 6.10).
 * 붙으면 부모에게 «준비됨» 을 알리고, 값이 올 때마다 다시 그린다. 같은 출처 · 이 틀의 메뉴 메시지만 받는다.
 */
export const PreviewFrame = ({ menu }: { menu: PreviewMenu }) => {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = readPreviewMessage(event, window.location.origin);
      if (message?.type === PREVIEW_VALUES && message.menu === menu) setPayload(message);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [menu]);

  return payload ? <Preview payload={payload} /> : null;
};
