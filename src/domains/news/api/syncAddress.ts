// 주보·교회앨범은 다른 항목을 골라도 페이지를 옮기지 않는다(화면만 바뀐다). 대신 고른 항목을 주소에 둔다 —
// 새로고침·공유하면 그 항목이 열린다(app/news/bulletin/[date] · app/news/album/[id]).
// 화면은 고른 항목을 **주소에서 읽는다**(idFromPath + usePathname): Next 는 replaceState 때 주소만 바꾸고 페이지는
// 그대로 두므로, 고른 항목을 화면 안의 상태로 들고 있으면 다른 메뉴에 갔다가 «뒤로» 왔을 때(페이지가 새로 만들어진다)
// 주소는 그 항목인데 화면은 처음 항목이 된다.

/**
 * 주소를 `${basePath}/${id}` 로 맞춘다. 기록을 쌓지 않는다(replaceState) — «뒤로» 는 고른 항목을 하나씩 되짚지 않고
 * 이전 페이지로 간다. Next 라우터가 이 변경을 따라와 usePathname 이 새 주소를 준다.
 */
export const syncAddress = (basePath: string, id: string) => {
  window.history.replaceState(null, '', `${basePath}/${encodeURIComponent(id)}`);
};

/** 주소가 `${basePath}/id` 모양이면 그 id, 아니면(목록 주소·다른 메뉴) undefined. */
export const idFromPath = (pathname: string, basePath: string): string | undefined => {
  if (!pathname.startsWith(`${basePath}/`)) return undefined;
  const rest = pathname.slice(basePath.length + 1).replace(/\/$/, '');
  if (!rest || rest.includes('/')) return undefined;
  try {
    return decodeURIComponent(rest);
  } catch {
    return undefined; // 깨진 인코딩
  }
};
