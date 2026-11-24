import 'server-only';

import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';

import {
  RESOURCE_SECTION_KEYS,
  type ResourceSectionKey,
  SECTION_CONFIG,
} from '../../lib/resourceSection';

/** 설교 시트지 폼 — 분류마다 묶음 선택지(selected 는 꺼진 묶음이어도 보인다) */
export const loadSeriesBySection = async (selected?: string) => {
  const book = await getCategoryBook();
  return Object.fromEntries(
    RESOURCE_SECTION_KEYS.map(k => [k, categoryOptions(book, SECTION_CONFIG[k].group, selected)])
  ) as Record<ResourceSectionKey, { value: string; label: string }[]>;
};
