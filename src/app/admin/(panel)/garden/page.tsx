import { NewsVideoListScreen } from '@/domains/admin/components/widgets/NewsVideoScreens';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 성복의 뜰 목록 — 화면은 주일광고 · 성복의 뜰이 같이 쓴다(NewsVideoScreens)
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <NewsVideoListScreen feed="garden" searchParams={searchParams} />;
}
