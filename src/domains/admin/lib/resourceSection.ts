// 설교 시트지의 세 분류(패키지 B4) — DB 값(SUNDAY · SERIES · SEASONAL) ↔ 분류 묶음 · 공개 자료실의 분류(sunday …). 순수 데이터.
import type { ResourceSection } from '@/domains/resources/api/resource.types';

export const SECTION_CONFIG = {
  SUNDAY: { label: '주일 강해', group: 'RESOURCE_SUNDAY', publicSection: 'sunday' },
  SERIES: { label: '시리즈', group: 'RESOURCE_SERIES', publicSection: 'series' },
  SEASONAL: { label: '가정 · 명절 · 절기', group: 'RESOURCE_SEASONAL', publicSection: 'seasonal' },
} as const satisfies Record<
  string,
  { label: string; group: string; publicSection: ResourceSection }
>;

export type ResourceSectionKey = keyof typeof SECTION_CONFIG;

export const RESOURCE_SECTION_KEYS = Object.keys(SECTION_CONFIG) as ResourceSectionKey[];

export const sectionOf = (v: unknown): ResourceSectionKey | null =>
  typeof v === 'string' && Object.hasOwn(SECTION_CONFIG, v) ? (v as ResourceSectionKey) : null;
