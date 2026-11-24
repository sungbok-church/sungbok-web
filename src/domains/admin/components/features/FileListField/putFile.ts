// 파일을 Storage 의 한 번 쓰는 올리기 주소로 보낸다(서버가 만든 주소 — signUpload). fetch 는 올리는 진행을 알 수 없어 XHR 을 쓴다.
// 머리값은 supabase-js 의 uploadToSignedUrl 과 같다(덮어쓰지 않기). 경로가 파일 id 라 내용이 바뀌지 않으므로 오래 캐시해도 된다.

type PutRequest = {
  url: string;
  body: Blob;
  contentType: string;
  /** 공개 키(publishable) — Supabase 게이트웨이가 요구한다 */
  apiKey: string;
};

export const putFile = (
  { url, body, contentType, apiKey }: PutRequest,
  onProgress: (fraction: number) => void,
  Xhr: typeof XMLHttpRequest = XMLHttpRequest
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new Xhr();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', contentType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.setRequestHeader('apikey', apiKey);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else reject(new Error(`upload ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('upload network'));
    xhr.onabort = () => reject(new Error('upload aborted'));
    xhr.send(body);
  });
