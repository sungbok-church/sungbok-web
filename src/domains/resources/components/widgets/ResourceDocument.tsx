import type { ResourceSection } from '@/domains/resources/api/resource.types';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import { ResourceViewPage } from '@/domains/resources/components/features/ResourceViewPage';
import { sermonLinkFor } from '@/domains/worship-video/api/sermonLink.server';
import { notFound } from 'next/navigation';

// 문서 열람 페이지 — 자료 한 건과, 연결된 설교 영상을 볼 주소를 서버에서 찾아 넘긴다.
// 자료와 영상은 유튜브 영상 id 로만 이어져 있다 — 그 영상이 사이트의 어느 예배 페이지에 있는지는 sermonLinkFor 가 찾는다
// (사이트에 있으면 같은 창의 설교 페이지, 없으면 유튜브). 없는 자료·다른 분류의 자료·임시저장은 404.
export default async function ResourceDocument({
  section,
  id,
}: {
  section: ResourceSection;
  id: string;
}) {
  const resource = await resourceRepository.get(id);
  if (!resource || resource.section !== section) notFound();
  const videoLinks = await Promise.all(resource.videoIds.map(sermonLinkFor));
  return <ResourceViewPage resource={resource} videoLinks={videoLinks} />;
}
