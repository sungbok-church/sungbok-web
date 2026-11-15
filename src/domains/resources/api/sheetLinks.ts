// 예배 영상 화면의 «설교 시트지» 카드 정보 — 자료실 자료에서 만든다(순수). 카드는 자료실의 그 자료 열람 화면으로 간다.
import { RESOURCE_SECTIONS, resourcePath } from '../config/resourceSections';
import type { Resource } from './resource.types';

export type SheetLink = {
  id: string;
  /** 자료실의 그 자료(열람 화면) 주소 */
  href: string;
  title: string;
  /** 자료 분류 이름(«주일 설교 시트지») */
  label: string;
};

export const toSheetLinks = (resources: readonly Resource[]): SheetLink[] =>
  resources.map(r => ({
    id: r.id,
    href: resourcePath(r.section, r.id),
    title: r.title,
    label: RESOURCE_SECTIONS[r.section].title,
  }));
