import { documentTitle } from '@/domains/resources/api/resourceList';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import ResourceDocument from '@/domains/resources/components/widgets/ResourceDocument';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

// «설교 영상 보기» 의 주소를 예배 페이지 목록(유튜브, 1시간 캐시)에서 찾는다 — 예배 페이지와 같은 주기로 다시 만든다.
export const revalidate = 600;
// 빌드 때 만들지 않는다(빌드가 유튜브 응답에 묶이지 않게) — 처음 열릴 때 만들어 두고 그 뒤로는 저장된 것을 준다.
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resource = await resourceRepository.get(id);
  return { title: documentTitle('sunday', resource?.section === 'sunday' ? resource : undefined) };
}

// 문서 열람 — 미리보기 쪽 넘김·확대, 원본 내려받기, 연결된 설교 영상으로 가기.
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ResourceDocument section="sunday" id={id} />;
}
