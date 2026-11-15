import { videoPageTitle } from '@/domains/worship-video/api/videoMetadata.server';
import SermonWatch from '@/domains/worship-video/components/widgets/SermonWatch';
import type { Metadata } from 'next';

type Props = { params: Promise<{ videoId: string }> };

// 목록 페이지(../page.tsx)와 같은 주기
export const revalidate = 600;
// 처음 열릴 때 만들어 두고 그 뒤로는 저장된 것을 준다(예배 설교 페이지와 같은 방식)
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { videoId } = await params;
  return { title: await videoPageTitle('announcements', videoId, '주일광고') };
}

// 주일광고 영상 한 편 — 유튜브 플레이어·이전/목록/다음·주일광고 목록. 목록에서 누르면 여기로 와 바로 재생된다.
export default async function Page({ params }: Props) {
  const { videoId } = await params;
  return <SermonWatch page="announcements" videoId={videoId} />;
}
