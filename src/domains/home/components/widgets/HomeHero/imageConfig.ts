// 히어로·변형 레이어·착지 사진이 같은 응답을 재사용한다. 크기별 중복 다운로드를 막는다.
export const HERO_IMAGE_SIZES = '(max-width:768px) 96vw, 74vw';

/**
 * 히어로 종류에 따른 sizes — 유튜브면 대표 사진이 화면 전체(100vw)를 덮으므로 변형 레이어 · 착지 칸도 같은 값을 써서
 * 같은 파일을 한 번만 받는다.
 */
export const heroImageSizes = (kind: 'photo' | 'youtube') =>
  kind === 'youtube' ? '100vw' : HERO_IMAGE_SIZES;
