// 미리 그리는 페이지(빌드 · 운영 중 다시 그리기)가 데이터를 받을 때의 공용 실패 규칙 — 영상 페이지 · 홈이 쓴다(ADR 0024).
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { isRuntimeRegeneration } from '@/shared/lib/isRuntimeRegeneration';

/**
 * load 의 결과를 돌려준다. 실패하면:
 *  · 빌드 · 개발 서버: 넘기고 undefined — 화면이 브라우저에서 받는다(유튜브 쿼터가 바닥난 날에도 배포는 된다).
 *  · 운영에서 다시 그리는 중: 던진다 — Next 가 직전에 잘 그린 페이지를 계속 보여 준다(빈 목록으로 덮지 않는다).
 *    keepPrevious: false 면 이때도 넘긴다 — 빌드 때 만들지 않은 영상 한 편은 첫 방문에 «직전 페이지» 가 없어
 *    던지면 오류 화면이 되기 때문(화면이 브라우저에서 받게 한다).
 */
export const loadForPage = async <T>(
  load: () => Promise<T>,
  { keepPrevious = true }: { keepPrevious?: boolean } = {}
): Promise<T | undefined> => {
  try {
    return await load();
  } catch (error) {
    if (keepPrevious && isRuntimeRegeneration()) throw error;
    console.error('[loadForPage]', error);
    return undefined;
  }
};
