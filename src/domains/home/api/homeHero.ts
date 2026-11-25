// 홈 히어로(설계 6.12)의 화면 값 — 관리자에서 고른 종류(사진 · 유튜브)와 대표 사진. 대표 사진은 어느 종류에서나 필수다
// (영상 전 · 좁은 화면 · 동작 줄이기 · 데이터 절약 · 영상을 못 불러올 때, 그리고 사진 띠에 내려앉는 카드).
import type { UploadedPhoto } from '@/shared/lib/photoVariant';
import { toUploadedPhoto } from '@/shared/lib/uploadedPhoto';
import type { StaticImageData } from 'next/image';

export type HomeHeroData = {
  kind: 'photo' | 'youtube';
  photo: StaticImageData | UploadedPhoto;
  alt: string;
  /** 유튜브일 때만 */
  videoId: string | null;
};

type FileRow = {
  path: string;
  kind: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  sort: number;
  variants: unknown;
};

export type HomeHeroRow = {
  kind: 'PHOTO' | 'YOUTUBE';
  youtube_video_id: string | null;
  photo: { files: FileRow[] } | null;
};

/** DB 행 → 화면 값. 대표 사진을 읽지 못하면 null(화면은 레포의 장애 대비 사진) */
export const rowToHomeHero = (baseUrl: string, row: HomeHeroRow): HomeHeroData | null => {
  const file = [...(row.photo?.files ?? [])]
    .filter(f => f.kind === 'IMAGE')
    .sort((a, b) => a.sort - b.sort)[0];
  const photo = file ? toUploadedPhoto(baseUrl, file) : null;
  if (!file || !photo) return null;
  const youtube = row.kind === 'YOUTUBE' && row.youtube_video_id;
  return {
    kind: youtube ? 'youtube' : 'photo',
    photo,
    alt: file.alt || '성복교회 전경',
    videoId: youtube ? row.youtube_video_id : null,
  };
};
