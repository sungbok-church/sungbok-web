import 'server-only';

// 유튜브 영상의 큰 표지(maxresdefault)가 있는지 — 없는 영상이 있다(작게 올린 영상 등). 저장할 때 한 번 묻는다.
// 유튜브 API(쿼터)를 쓰지 않는 그림 주소라 쿼터가 들지 않는다. 실패하면 없다고 본다(표지는 작은 썸네일 — 저장은 막지 않는다).
const TIMEOUT_MS = 3000;

export const hasMaxresThumbnail = async (
  videoId: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> => {
  try {
    const res = await fetchImpl(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
};
