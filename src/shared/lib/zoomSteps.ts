// 문서·그림 열람기의 확대 단계(순수) — 자료실 열람기와 주보·앨범의 «크게 보기» 가 같이 쓴다.

/** «맞춤» — 종이가 창 폭에 꼭 맞는 배율 */
export const ZOOM_FIT = 1;
export const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

/** 한 단계(50%) 확대·축소 — 100%~300% 를 벗어나지 않는다. */
export const stepZoom = (zoom: number, dir: 1 | -1): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_FIT, zoom + dir * ZOOM_STEP));

export const zoomLabel = (zoom: number): string => `${Math.round(zoom * 100)}%`;
