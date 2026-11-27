import { NewsVideoListScreen } from '@/domains/admin/components/widgets/NewsVideoScreens';

// 머리는 미리 만든 틀로 누르는 즉시, 검색 막대 · 줄은 서버에서 오는 대로(NewsVideoListScreen — ADR 0027)
export const instant = true;

// 주일광고 목록 — 화면은 주일광고 · 성복의 뜰이 같이 쓴다(NewsVideoScreens)
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <NewsVideoListScreen feed="announcements" searchParams={searchParams} />;
}
