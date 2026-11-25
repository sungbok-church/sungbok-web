import { sectionLandingRoute } from '@/shared/api/sectionLanding.server';

// 상위 메뉴 주소 — 켜진 첫 하위로 넘긴다(관리자에서 끄거나 순서를 바꾸면 따라간다, ADR 0026)
export const GET = sectionLandingRoute('next-generation');
