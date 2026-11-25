'use client';

import {
  PREVIEW_READY,
  PREVIEW_VALUES,
  type PreviewMenu,
  type PreviewPayload,
  readPreviewMessage,
  toPreviewAlbum,
  toPreviewIssue,
  toPreviewResource,
  toPreviewSermon,
} from '@/domains/admin/lib/preview';
import type { HomeHeroData } from '@/domains/home/api/homeHero';
import { HomeLead } from '@/domains/home/components/widgets/HomeLead';
import { WorshipTimes } from '@/domains/home/components/widgets/WorshipTimes';
import { toDepartmentPage } from '@/domains/next-generation/api/departmentPage';
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { toUploadedPhoto } from '@/shared/lib/uploadedPhoto';
import { DepartmentPage } from '@/domains/next-generation/components/widgets/DepartmentPage';
import { ResourceViewPage } from '@/domains/resources/components/features/ResourceViewPage';
import { AlbumPage } from '@/domains/news/components/widgets/AlbumPage';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';
import { SermonWatchPage } from '@/domains/worship-video/components/features/SermonWatchPage';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { useEffect, useState } from 'react';

/** 저장 전 값을 공개 화면 부품 그대로 — 주보는 주보 화면, 교회앨범은 앨범 화면, 주일광고 · 성복의 뜰은 «영상 한 편» 화면 */
const Preview = ({ payload }: { payload: PreviewPayload }) => {
  if (payload.menu === 'home-hero') {
    const v = payload.values;
    const photo = v.photo ? toUploadedPhoto(readSupabaseEnv()?.url ?? '', v.photo) : null;
    if (!photo) return null;
    const videoId = v.kind === 'YOUTUBE' ? (parseYoutubeVideoId(v.video) ?? null) : null;
    const hero: HomeHeroData = {
      kind: videoId ? 'youtube' : 'photo',
      photo,
      alt: v.photo?.alt || '성복교회',
      videoId,
    };
    // 홈처럼 히어로 다음 섹션까지 — 스크롤하면 카드로 줄어들어 사진 띠에 내려앉는 것까지 본다
    return (
      <>
        <HomeLead hero={hero} />
        <div className="bg-b1-bg relative z-0">
          <WorshipTimes />
        </div>
      </>
    );
  }
  if (payload.menu === 'departments') {
    const v = payload.values;
    const page = toDepartmentPage(v.slug, readSupabaseEnv()?.url ?? '', {
      ...v,
      extra: v.extra.trim() || null,
      staff: v.staff.map(s => ({ ...s, greeting: s.greeting.trim() || null })),
    });
    return page.photos.length > 0 ? <DepartmentPage {...page} /> : null;
  }
  if (payload.menu === 'bulletin') {
    const issue = toPreviewIssue(payload.values, readSupabaseEnv()?.url ?? '');
    return issue.pages.length > 0 ? (
      <BulletinPage issues={[issue]} basePath="/news/bulletin" />
    ) : null;
  }
  if (payload.menu === 'resources') {
    const { resource, videoLinks } = toPreviewResource(
      payload.values,
      readSupabaseEnv()?.url ?? ''
    );
    return <ResourceViewPage resource={resource} videoLinks={videoLinks} />;
  }
  if (payload.menu === 'album') {
    const album = toPreviewAlbum(payload.values, readSupabaseEnv()?.url ?? '');
    return album.images.length > 0 ? <AlbumPage albums={[album]} basePath="/news/album" /> : null;
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
