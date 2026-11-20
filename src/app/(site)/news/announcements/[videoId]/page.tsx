import { videoPageTitle } from '@/domains/worship-video/api/videoMetadata.server';
import { fetchSermonLibrary } from '@/domains/worship-video/api/worshipVideo.server';
import { oneBuildParam } from '@/shared/lib/buildParams';
import SermonWatch from '@/domains/worship-video/components/widgets/SermonWatch';
import type { Metadata } from 'next';

type Props = { params: Promise<{ videoId: string }> };

// 빌드 때는 최신 영상 한 편만 만든다(Cache Components 는 빈 목록이 안 된다 — oneBuildParam). 나머지는 처음 열릴 때
// 만들어 두고 그 뒤로는 저장된 것을 준다. 목록 페이지(../page.tsx)와 같은 서버 캐시(10분마다 확인)를 쓴다(ADR 0024).
export const generateStaticParams = () =>
  oneBuildParam('videoId', async () => (await fetchSermonLibrary('announcements'))[0]?.id);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { videoId } = await params;
  return { title: await videoPageTitle('announcements', videoId, '주일광고') };
}

// 주일광고 영상 한 편 — 유튜브 플레이어·이전/목록/다음·주일광고 목록. 목록에서 누르면 여기로 와 바로 재생된다.
export default async function Page({ params }: Props) {
  const { videoId } = await params;
  return <SermonWatch page="announcements" videoId={videoId} />;
}
