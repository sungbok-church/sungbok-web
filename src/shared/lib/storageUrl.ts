// Storage 공개 버킷의 파일 주소 — DB(files.bucket · path)에 있는 값으로 만든다(설계 6.8). 관리자 · 공개 화면이 함께 쓴다.

/** `<Supabase 주소>/storage/v1/object/public/<bucket>/<path>` — 경로 조각마다 인코딩(/ 는 그대로) */
export const storagePublicUrl = (baseUrl: string, bucket: string, path: string): string =>
  `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
