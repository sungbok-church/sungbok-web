// 파일 올리기 통로의 규칙(설계 6.8) — 받는 종류, Storage 경로, 그림 줄이기 크기. 화면 · 서버가 함께 쓴다.
// 파일 바이트는 브라우저가 Storage 로 직접 올리고(서버가 만든 한 번 쓰는 주소로), 파일 줄은 저장할 때 서버가 한 번에 적는다.

/** 그림의 긴 변 한도(px) — 넘으면 브라우저에서 줄인다 */
export const MAX_IMAGE_EDGE = 2000;
/** 줄여서 다시 만들 때의 WebP · JPEG 품질 */
export const IMAGE_QUALITY = 0.85;
/** Storage 버킷 — 공개 읽기 하나(reference.sql) */
export const MEDIA_BUCKET = 'media';

export type FileKind = 'IMAGE' | 'PDF' | 'HWP';

const TYPES: Record<string, { kind: FileKind; ext: string }> = {
  'image/webp': { kind: 'IMAGE', ext: 'webp' },
  'image/jpeg': { kind: 'IMAGE', ext: 'jpg' },
  'image/png': { kind: 'IMAGE', ext: 'png' },
  'application/pdf': { kind: 'PDF', ext: 'pdf' },
  'application/x-hwp': { kind: 'HWP', ext: 'hwp' },
};

/**
 * 받는 파일인가 — 종류(MIME)로 판정하고 확장자는 종류에서 정한다(이름의 확장자를 믿지 않는다).
 * 한글 파일만 브라우저가 종류를 비우거나 제각각으로 주므로 이름이 .hwp 이면 받는다(버킷은 application/x-hwp 로 받는다).
 */
export const uploadTypeOf = (mime: string, name: string): { kind: FileKind; ext: string } | null =>
  TYPES[mime] ??
  (/\.hwp$/i.test(name) && (mime === '' || mime.includes('hwp'))
    ? TYPES['application/x-hwp']
    : null);

/** 그 종류를 Storage 에 올릴 때 쓰는 MIME — 한글 파일은 버킷이 받는 값으로 맞춘다 */
export const uploadMimeOf = (kind: FileKind, mime: string): string =>
  kind === 'HWP' ? 'application/x-hwp' : mime;

/** Storage 경로 `<메뉴 key>/<묶음 id>/<파일 id>.<확장자>` — DB 의 can_write_storage_path 가 같은 모양만 받는다 */
export const storagePath = (menuKey: string, listId: string, fileId: string, ext: string) =>
  `${menuKey}/${listId}/${fileId}.${ext}`;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILE_PATH = new RegExp(`^([a-z][a-z0-9-]*)/(${UUID})/(${UUID})\\.([a-z0-9]{1,5})$`);

/**
 * 글이 가리켜도 되는 파일 경로인가 — 그 메뉴 아래의 `<묶음 id>/<파일 id>.<확장자>` 이고 확장자가 종류와 맞을 때만.
 * 묶음은 보지 않는다: 고치거나 복제한 글은 앞 묶음에 올린 파일을 그대로 가리킨다(같은 메뉴라 권한이 같다).
 * 다른 메뉴의 파일(부서 사진 등)은 가리키지 못한다.
 */
export const isAllowedPath = (path: string, menuKey: string, kind?: FileKind): boolean => {
  const m = FILE_PATH.exec(path);
  if (!m || m[1] !== menuKey) return false;
  return !kind || Object.values(TYPES).some(t => t.kind === kind && t.ext === m[4]);
};

/** 긴 변이 max 를 넘으면 비율대로 줄인 크기, 아니면 그대로 */
export const fitLongEdge = (width: number, height: number, max: number) => {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

/** 다시 만들지 않고 그대로 올려도 되는 그림인가 — WebP · JPEG 이고 한도 안 */
export const keepAsIs = (mime: string, width: number, height: number, max: number) =>
  (mime === 'image/webp' || mime === 'image/jpeg') && Math.max(width, height) <= max;

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/**
 * uuid v7(ADR 0019 — DB 의 private.uuid_v7 과 같은 모양). 올리기 전에 파일 id 가 있어야 경로를 만들 수 있어 여기서 만든다.
 * random 은 16바이트(앞 6바이트는 시각으로 덮는다).
 */
export const uuidV7 = (now: number, random: Uint8Array): string => {
  const b = Uint8Array.from(random.slice(0, 16));
  let t = now;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
