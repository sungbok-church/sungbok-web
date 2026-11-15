import type { ResourceSection } from '@/domains/resources/api/resource.types';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import { ResourceListPage } from '@/domains/resources/components/features/ResourceListPage';

// 자료 목록 페이지 — 그 분류의 공개 자료를 저장소에서 읽어 화면에 실어 보낸다(검색·칩·정렬은 화면에서).
// 지금은 시드라 빌드 때 만들어 두고, 관리자·DB 가 붙으면 저장소의 load 만 바뀐다(.md/domains/resources.md).
export default async function ResourceLibrary({ section }: { section: ResourceSection }) {
  return <ResourceListPage section={section} resources={await resourceRepository.list(section)} />;
}
