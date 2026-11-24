import { NewsVideoDetailScreen } from '@/domains/admin/components/widgets/NewsVideoScreens';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 성복의 뜰 상세
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <NewsVideoDetailScreen feed="garden" params={params} />;
}
