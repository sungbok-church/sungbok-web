// DB 파일 줄(files) → 화면의 올린 사진(UploadedPhoto) — 공개 화면의 저장소와 관리자 미리보기가 같이 쓴다.
// 폭별 파일(files.variants, [[가로 px, 경로], …])도 공개 주소로 바꾸고 가로 오름차순으로 둔다(pickVariant 가 앞에서 찾는다).
import type { UploadedPhoto } from './photoVariant';
import { storagePublicUrl } from './storageUrl';

const BUCKET = 'media';

type FileLike = {
  path: string;
  width: number | null;
  height: number | null;
  variants?: unknown;
};

/** 크기를 모르는 파일(그림이 아님)이면 null */
export const toUploadedPhoto = (baseUrl: string, file: FileLike): UploadedPhoto | null => {
  if (!file.width || !file.height) return null;
  const ladder = Array.isArray(file.variants)
    ? (file.variants as [number, string][])
        .filter(([w, p]) => Number.isInteger(w) && typeof p === 'string')
        .sort((a, b) => a[0] - b[0])
        .map(([w, p]) => [w, storagePublicUrl(baseUrl, BUCKET, p)] as const)
    : [];
  return {
    src: storagePublicUrl(baseUrl, BUCKET, file.path),
    width: file.width,
    height: file.height,
    variants: ladder,
  };
};
