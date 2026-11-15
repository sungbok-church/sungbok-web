import { describe, expect, it } from 'vitest';

import { stepZoom, ZOOM_FIT, ZOOM_MAX, zoomLabel } from './zoomSteps';

describe('zoomSteps — 문서·그림 열람기의 확대 단계', () => {
  it('50% 단위로 100%~300%', () => {
    expect(stepZoom(ZOOM_FIT, 1)).toBe(1.5);
    expect(stepZoom(1.5, 1)).toBe(2);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(1.5, -1)).toBe(ZOOM_FIT);
    expect(stepZoom(ZOOM_FIT, -1)).toBe(ZOOM_FIT);
    expect(ZOOM_MAX).toBe(3);
  });

  it('배율 표시는 «150%»', () => {
    expect(zoomLabel(ZOOM_FIT)).toBe('100%');
    expect(zoomLabel(1.5)).toBe('150%');
  });
});
