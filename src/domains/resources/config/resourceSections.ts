// 자료실의 세 분류 ↔ 주소. 메뉴(shared/config/siteNav 의 «자료실»)와 같은 순서·같은 이름 — 테스트가 잠근다.
import type { ResourceSection } from '../api/resource.types';

export const RESOURCE_SECTIONS = {
  sunday: { slug: 'sunday-sermon', title: '주일 설교 시트지' },
  series: { slug: 'series-sermon', title: '시리즈 설교 시트지' },
  seasonal: { slug: 'seasonal-sermon', title: '가정·명절·절기 설교 시트지' },
} as const satisfies Record<ResourceSection, { slug: string; title: string }>;

/** 자료실 주소 — id 가 없으면 그 분류의 목록, 있으면 자료 한 건(열람 화면). */
export const resourcePath = (section: ResourceSection, id?: string): string => {
  const base = `/resources/${RESOURCE_SECTIONS[section].slug}`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
};
