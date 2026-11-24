// 콘텐츠 미리보기(설계 6.10 — 사용자 결정 2026-11-20) — 등록 · 수정 화면이 저장하지 않은 지금 값을 미리보기 틀(iframe)에 보낸다.
// 서버에 아무것도 남기지 않는다. 틀은 같은 출처(관리자 주소 아래)이고, 같은 출처의 메시지만 받는다.
import type { BulletinIssue } from '@/domains/news/api/news.types';
import type { Sermon } from '@/domains/worship-video/api/worshipVideo.types';
import { storagePublicUrl } from '@/shared/lib/storageUrl';

import { MEDIA_BUCKET } from './fileUpload';
import type { FileItem } from './input/fileInput';
import { youtubeImages } from './newsFeed';

/** 미리보기 틀의 주소(뒤에 메뉴 key) — 이 주소만 관리자 화면이 iframe 으로 연다(CSP frame-ancestors 'self') */
export const ADMIN_PREVIEW_PATH = '/admin/preview/';

/** 틀이 준비됐다(틀 → 화면) — 화면이 지금 값을 보낸다 */
export const PREVIEW_READY = 'admin:preview-ready';
/** 지금 값(화면 → 틀) — 칸을 고칠 때마다 다시 보낸다 */
export const PREVIEW_VALUES = 'admin:preview-values';

/** 미리보기 폭 — 실제 기기처럼 배치가 바뀌게 틀의 폭을 바꾼다 */
export const PREVIEW_WIDTHS = [
  { key: 'pc', label: 'PC', width: 1280 },
  { key: 'tablet', label: '태블릿', width: 768 },
  { key: 'phone', label: '휴대폰', width: 375 },
] as const;

export type BulletinPreviewValues = { date: string; pages: FileItem[] };

/** 주일광고 · 성복의 뜰 — 분류는 이름으로(공개 화면이 이름을 보인다) */
export type NewsPreviewValues = {
  title: string;
  categoryLabel: string;
  date: string;
  videoId: string | null;
  description: string;
};

/** 메뉴마다 보내는 값 */
export type PreviewPayload =
  | { menu: 'bulletin'; values: BulletinPreviewValues }
  | { menu: 'announcements' | 'garden'; values: NewsPreviewValues };

export type PreviewMenu = PreviewPayload['menu'];

const PREVIEW_MENUS: readonly string[] = ['bulletin', 'announcements', 'garden'];

export type PreviewMessage =
  { type: typeof PREVIEW_READY } | ({ type: typeof PREVIEW_VALUES } & PreviewPayload);

/** postMessage 를 받을 때 — 같은 출처 · 정한 모양만. 아니면 null */
export const readPreviewMessage = (
  event: { origin: string; data: unknown },
  origin: string
): PreviewMessage | null => {
  if (event.origin !== origin) return null;
  const data = event.data as { type?: unknown; menu?: unknown; values?: unknown } | null;
  if (!data || typeof data !== 'object') return null;
  if (data.type === PREVIEW_READY) return { type: PREVIEW_READY };
  if (
    data.type === PREVIEW_VALUES &&
    typeof data.menu === 'string' &&
    PREVIEW_MENUS.includes(data.menu) &&
    data.values
  )
    return { type: PREVIEW_VALUES, menu: data.menu, values: data.values } as PreviewMessage;
  return null;
};

/** 주보 폼의 지금 값 → 공개 화면(BulletinPage)이 그리는 호 하나 */
export const toPreviewIssue = (values: BulletinPreviewValues, baseUrl: string): BulletinIssue => ({
  id: values.date,
  status: 'published',
  date: values.date,
  pages: values.pages
    .filter(p => p.kind === 'IMAGE' && p.width && p.height)
    .map(p => ({
      src: storagePublicUrl(baseUrl, MEDIA_BUCKET, p.path),
      width: p.width as number,
      height: p.height as number,
    })),
});

/** 주일광고 · 성복의 뜰 폼의 지금 값 → 공개 «영상 한 편» 화면(SermonWatchPage)의 영상. 영상이 없으면 null */
export const toPreviewSermon = (values: NewsPreviewValues): Sermon | null =>
  values.videoId
    ? {
        id: values.videoId,
        title: values.title,
        series: values.categoryLabel,
        date: values.date,
        dateFrom: 'sermon',
        ...youtubeImages(values.videoId, false),
      }
    : null;
