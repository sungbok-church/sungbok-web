// 콘텐츠 미리보기(설계 6.10 — 사용자 결정 2026-11-20) — 등록 · 수정 화면이 저장하지 않은 지금 값을 미리보기 틀(iframe)에 보낸다.
// 서버에 아무것도 남기지 않는다. 틀은 같은 출처(관리자 주소 아래)이고, 같은 출처의 메시지만 받는다.
import type { Album, BulletinIssue } from '@/domains/news/api/news.types';
import type { DepartmentSlug } from '@/domains/next-generation/config/departmentSlug';
import type { Resource } from '@/domains/resources/api/resource.types';
import type { Sermon } from '@/domains/worship-video/api/worshipVideo.types';
import { storagePublicUrl } from '@/shared/lib/storageUrl';

import { MEDIA_BUCKET } from './fileUpload';
import type { FileItem } from './input/fileInput';
import { youtubeImages } from './newsFeed';
import { type ResourceSectionKey, SECTION_CONFIG } from './resourceSection';

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

/** 교회앨범 — 분류는 이름으로 */
export type AlbumPreviewValues = { title: string; categoryLabel: string; images: FileItem[] };

/** 설교 시트지 — 묶음은 이름으로, 회차 · 날짜 · 연도는 폼의 글자 그대로 */
export type ResourcePreviewValues = {
  section: ResourceSectionKey;
  seriesLabel: string;
  episode: string;
  title: string;
  date: string;
  year: string;
  passage: string;
  file: FileItem[];
  pages: FileItem[];
  videoIds: string[];
};

/** 다음세대 부서 — 직분은 이름으로, 담당자 사진은 한 장(없으면 null) */
export type DepartmentPreviewValues = {
  slug: DepartmentSlug;
  ages: string;
  tagline: string;
  intro: string;
  extra: string;
  photos: FileItem[];
  staff: { name: string; roleLabel: string; greeting: string; photo: FileItem | null }[];
};

/** 홈 히어로 — 종류 · 대표 사진(한 장) · 유튜브 주소(글자 그대로 — 틀이 영상 id 로 바꾼다) */
export type HomeHeroPreviewValues = {
  kind: 'PHOTO' | 'YOUTUBE';
  photo: FileItem | null;
  video: string;
};

/** 메뉴마다 보내는 값 */
export type PreviewPayload =
  | { menu: 'home-hero'; values: HomeHeroPreviewValues }
  | { menu: 'departments'; values: DepartmentPreviewValues }
  | { menu: 'resources'; values: ResourcePreviewValues }
  | { menu: 'bulletin'; values: BulletinPreviewValues }
  | { menu: 'album'; values: AlbumPreviewValues }
  | { menu: 'announcements' | 'garden'; values: NewsPreviewValues };

export type PreviewMenu = PreviewPayload['menu'];

const PREVIEW_MENUS: readonly string[] = [
  'bulletin',
  'announcements',
  'garden',
  'album',
  'resources',
  'departments',
  'home-hero',
];

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

/** 교회앨범 폼의 지금 값 → 공개 앨범 화면(AlbumPage)의 한 건 */
export const toPreviewAlbum = (values: AlbumPreviewValues, baseUrl: string): Album => ({
  id: 'preview',
  status: 'published',
  title: values.title,
  category: values.categoryLabel,
  images: values.images
    .filter(p => p.kind === 'IMAGE' && p.width && p.height)
    .map(p => ({
      src: storagePublicUrl(baseUrl, MEDIA_BUCKET, p.path),
      width: p.width as number,
      height: p.height as number,
    })),
});

/** 설교 시트지 폼의 지금 값 → 공개 «문서 열람»(ResourceViewPage)의 한 건과 영상 링크(미리보기는 유튜브로) */
export const toPreviewResource = (values: ResourcePreviewValues, baseUrl: string) => {
  const url = (path: string) => storagePublicUrl(baseUrl, MEDIA_BUCKET, path);
  const original = values.file[0];
  const episode = Number(values.episode);
  const resource: Resource = {
    id: 'preview',
    status: 'published',
    section: SECTION_CONFIG[values.section].publicSection,
    group: values.seriesLabel,
    ...(Number.isInteger(episode) && episode > 0 ? { episode } : {}),
    title: values.title,
    ...(values.date ? { date: values.date } : values.year ? { year: values.year } : {}),
    ...(values.passage ? { passage: values.passage } : {}),
    ...(original && original.kind !== 'IMAGE'
      ? {
          file: {
            url: url(original.path),
            name: original.originalName,
            kind: original.kind === 'PDF' ? ('pdf' as const) : ('hwp' as const),
          },
        }
      : {}),
    pages: values.pages
      .filter(p => p.kind === 'IMAGE' && p.width && p.height)
      .map(p => ({ src: url(p.path), width: p.width as number, height: p.height as number })),
    videoIds: values.videoIds,
  };
  const videoLinks = values.videoIds.map(videoId => ({
    videoId,
    href: `https://www.youtube.com/watch?v=${videoId}`,
    external: true,
  }));
  return { resource, videoLinks };
};
