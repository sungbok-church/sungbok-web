import { NewsVideoNewScreen } from '@/domains/admin/components/widgets/NewsVideoScreens';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027 — NewsVideoNewScreen)
export const instant = true;

// 새 주일광고
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <NewsVideoNewScreen feed="announcements" searchParams={searchParams} />;
}
