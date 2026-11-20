import { documentTitle } from '@/domains/resources/api/resourceList';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import ResourceDocument from '@/domains/resources/components/widgets/ResourceDocument';
import { oneBuildParam } from '@/shared/lib/buildParams';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

// «설교 영상 보기» 의 주소를 예배 페이지 목록(서버 캐시, 10분마다 확인)에서 찾는다 — 그 목록이 바뀌면 다시 그린다(ADR 0024).
// 빌드 때는 최신 자료 한 건만 만든다(Cache Components 는 빈 목록이 안 된다 — oneBuildParam). 나머지는 처음 열릴 때 만든다.
export const generateStaticParams = () =>
  oneBuildParam('id', async () => (await resourceRepository.list('seasonal'))[0]?.id);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resource = await resourceRepository.get(id);
  return {
    title: documentTitle('seasonal', resource?.section === 'seasonal' ? resource : undefined),
  };
}

// 문서 열람 — 미리보기 쪽 넘김·확대, 원본 내려받기, 연결된 설교 영상으로 가기.
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ResourceDocument section="seasonal" id={id} />;
}
