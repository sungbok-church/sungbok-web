import { ItemGroupsScreen } from '@/domains/admin/components/widgets/ItemGroups';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 분류 관리(콘텐츠 › 분류 관리). 화면은 코드 관리와 같다(ItemGroupsScreen — 묶음은 주소 ?group= 을 화면 안에서 읽는다).
export default function AdminCategoriesPage() {
  return <ItemGroupsScreen kind="categories" />;
}
