// 공개 자료 읽기 — 자료실 화면과 예배 영상의 «설교 시트지» 가 이 한곳으로 읽는다(같은 자료를 두 번 등록하지 않는다).
// 지금은 시드(data/resourcesSeed)를 읽는다. 관리자·DB 가 생기면 load 만 DB 조회로 바꾼다 — 부르는 쪽은 그대로다
// (그래서 지금도 async). 임시저장은 여기서 걸러 어느 공개 화면에도 나가지 않는다.
import { RESOURCES_SEED } from '../data/resourcesSeed';
import type { Resource, ResourceSection } from './resource.types';
import { dateKey } from './resourceList';

const newestFirst = (list: readonly Resource[]) =>
  [...list].sort((a, b) => dateKey(b).localeCompare(dateKey(a)));

export const createResourceRepository = (load: () => Promise<readonly Resource[]>) => {
  const published = async () => (await load()).filter(r => r.status === 'published');
  return {
    /** 그 분류의 공개 자료 — 최신 날짜부터 */
    list: async (section: ResourceSection): Promise<Resource[]> =>
      newestFirst((await published()).filter(r => r.section === section)),
    /** 공개 자료 한 건. 임시저장·없는 id 는 undefined */
    get: async (id: string): Promise<Resource | undefined> =>
      (await published()).find(r => r.id === id),
    /** 그 유튜브 영상에 연결된 공개 자료 — 예배 영상의 시트지 카드가 쓴다 */
    forVideo: async (videoId: string): Promise<Resource[]> =>
      videoId ? newestFirst((await published()).filter(r => r.videoIds.includes(videoId))) : [],
  };
};

export const resourceRepository = createResourceRepository(async () => RESOURCES_SEED);
