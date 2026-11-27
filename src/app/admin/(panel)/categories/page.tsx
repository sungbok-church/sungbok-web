import { ItemGroupsScreen } from '@/domains/admin/components/widgets/ItemGroups';

// 머리(제목 · 변경 이력)는 미리 만든 틀로 누르는 즉시, 묶음 · 줄은 서버에서 오는 대로(ItemGroupsScreen — ADR 0027)
export const instant = true;

// 분류 관리(콘텐츠 › 분류 관리). 화면은 코드 관리와 같다(ItemGroupsScreen — 묶음은 주소 ?group= 을 화면 안에서 읽는다).
export default function AdminCategoriesPage() {
  return <ItemGroupsScreen kind="categories" />;
}
