// 올리기 전 그림 줄이기(설계 6.8) — 긴 변 2000px 안팎, WebP(못 만드는 브라우저는 JPEG). 한도 안의 WebP · JPEG 는 그대로.
// 그리기(캔버스)는 브라우저에서만 되므로 deps 로 받는다 — 시험에서는 가짜를 넣는다.
import {
  fitLongEdge,
  IMAGE_QUALITY,
  keepAsIs,
  MAX_IMAGE_EDGE,
} from '@/domains/admin/lib/fileUpload';

export type PreparedImage = {
  blob: Blob;
  type: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  /** 줄였는가(크기를 바꿨을 때만 — 알림용) */
  resized: boolean;
};

type Deps = {
  readSize: (file: File) => Promise<{ width: number; height: number }>;
  encode: (
    file: File,
    width: number,
    height: number,
    type: string,
    quality: number
  ) => Promise<Blob>;
};

// 사진의 회전 정보(EXIF)를 반영해 읽는다 — 휴대폰 세로 사진이 눕지 않게
const bitmapOf = (file: File) => createImageBitmap(file, { imageOrientation: 'from-image' });

export const browserDeps: Deps = {
  readSize: async file => {
    const bitmap = await bitmapOf(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  },
  encode: async (file, width, height, type, quality) => {
    const bitmap = await bitmapOf(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    // 끝나면 캔버스 메모리를 바로 돌려준다 — 휴대폰 Safari 는 한도가 작아 여러 장을 한 번에 줄이면 toBlob 이 null 을 준다
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        b => {
          canvas.width = canvas.height = 0;
          if (b) resolve(b);
          else reject(new Error('encode'));
        },
        type,
        quality
      )
    );
  },
};

export const prepareImage = async (
  file: File,
  deps: Deps = browserDeps
): Promise<PreparedImage> => {
  const size = await deps.readSize(file);
  if (keepAsIs(file.type, size.width, size.height, MAX_IMAGE_EDGE))
    return { blob: file, type: file.type as PreparedImage['type'], ...size, resized: false };
  const { width, height } = fitLongEdge(size.width, size.height, MAX_IMAGE_EDGE);
  const resized = width !== size.width || height !== size.height;
  const webp = await deps.encode(file, width, height, 'image/webp', IMAGE_QUALITY);
  // 지원하지 않는 형식을 달라고 하면 브라우저는 PNG 를 준다
  if (webp.type === 'image/webp') return { blob: webp, type: 'image/webp', width, height, resized };
  const jpeg = await deps.encode(file, width, height, 'image/jpeg', IMAGE_QUALITY);
  return { blob: jpeg, type: 'image/jpeg', width, height, resized };
};
