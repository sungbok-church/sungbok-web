import { describe, expect, it } from 'vitest';

import { RESOURCE_SECTION_KEYS, SECTION_CONFIG, sectionOf } from './resourceSection';

describe('SECTION_CONFIG', () => {
  it('세 분류 — 분류 묶음 · 공개 분류(자료실 주소)', () => {
    expect(RESOURCE_SECTION_KEYS).toEqual(['SUNDAY', 'SERIES', 'SEASONAL']);
    expect(SECTION_CONFIG.SUNDAY).toMatchObject({
      group: 'RESOURCE_SUNDAY',
      publicSection: 'sunday',
    });
    expect(SECTION_CONFIG.SEASONAL).toMatchObject({
      group: 'RESOURCE_SEASONAL',
      publicSection: 'seasonal',
    });
  });
  it('sectionOf — 모르는 값은 null', () => {
    expect(sectionOf('SERIES')).toBe('SERIES');
    expect(sectionOf('x')).toBeNull();
  });
});
