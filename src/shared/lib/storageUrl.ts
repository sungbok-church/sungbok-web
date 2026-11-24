// Storage 공개 버킷의 파일 주소 — DB(files.bucket · path)에 있는 값으로 만든다(설계 6.8). 관리자 · 공개 화면이 함께 쓴다.

/** `<Supabase 주소>/storage/v1/object/public/<bucket>/<path>` — 경로 조각마다 인코딩(/ 는 그대로) */
export const storagePublicUrl = (baseUrl: string, bucket: string, path: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

/**
 * 내려받기 단추의 주소 — Storage 공개 주소는 사이트와 출처가 달라 브라우저가 `<a download>` 를 무시한다(PDF 는
 * 탭에서 열리고, 이름은 `<uuid>.확장자`). `?download=<이름>` 을 붙이면 Storage 가 원래 이름으로 내려받게 답한다.
 * Storage 주소가 아니면 그대로(같은 출처는 download 속성이 동작한다).
 */
export const storageDownloadUrl = (url: string, name: string): string =>
  url.includes('/storage/v1/object/public/')
    ? `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`
    : url;
