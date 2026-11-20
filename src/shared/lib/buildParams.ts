/**
 * 빌드 때 미리 만들 주소를 못 정했을 때 쓰는 자리표시 — 어느 목록에도 없는 값. 빌드 때 목록을 받았으면 404,
 * 못 받았으면(그래서 자리표시를 쓴 것) «불러오는 중» 으로 그려지고 화면이 받은 뒤 «찾을 수 없습니다» 가 뜬다.
 */
export const BUILD_PLACEHOLDER = '__placeholder';

/**
 * 상세 페이지(`[id]` · `[videoId]`)의 generateStaticParams — 빌드 때 한 주소만 미리 만든다(ADR 0024).
 * Cache Components 는 빈 목록을 받지 않는다(빌드가 그 페이지를 한 번은 그려 봐야 «요청 때만 되는 일» 을 검사할 수 있다).
 * 나머지 주소는 처음 열릴 때 만들어 두고 그 뒤로는 저장된 것을 준다(지금까지와 같다).
 * 실제 주소(최신 영상 · 최신 자료)를 쓰면 빌드가 페이지 전체를 검사하고, 못 받으면(유튜브 실패) 자리표시로 빌드를 막지 않는다.
 */
export const oneBuildParam = async <K extends string>(
  key: K,
  pick: () => Promise<string | undefined>
): Promise<Record<K, string>[]> => {
  const id = await pick().catch(() => undefined);
  return [{ [key]: id ?? BUILD_PLACEHOLDER } as Record<K, string>];
};
