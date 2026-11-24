import type { ResourceSection } from '@/domains/resources/api/resource.types';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import { ResourceListPage } from '@/domains/resources/components/features/ResourceListPage';

// 자료 목록 페이지 — 그 분류의 공개 자료를 저장소에서 읽어 화면에 실어 보낸다(검색·칩·정렬은 화면에서).
// 자료는 DB 에서 읽고(서버 캐시 — 관리자가 저장하면 태그로 바로 갱신), 자세한 것은 .md/domains/resources.md.
export default async function ResourceLibrary({ section }: { section: ResourceSection }) {
  return <ResourceListPage section={section} resources={await resourceRepository.list(section)} />;
}
