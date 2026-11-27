import { NewsVideoEditScreen } from '@/domains/admin/components/widgets/NewsVideoScreens';

// 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(NewsVideoEditScreen 의 Deferred — ADR 0027)
export const instant = true;

// 주일광고 수정
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <NewsVideoEditScreen feed="announcements" params={params} />;
}
