// 교회소식의 공개 자료 읽기 — 주일광고·성복의 뜰(영상), 주보, 교회앨범. 주보 · 주일광고 · 성복의 뜰 · 교회앨범 모두 DB(관리자에서 올린다 — 기존 글도 옮겼다).
// 관리자 화면이 생기는 대로 load 만 DB 조회로 바꾼다(부르는 쪽은 그대로). 서버에서만 부른다(DB 읽기가 server-only).
// 임시저장과 보여 줄 것이 없는 글(영상 id·그림이 빈 글)은 여기서 걸러 공개 화면에 나가지 않는다.
import { loadAlbums } from './albumLoad.server';
import { loadIssues } from './bulletinLoad.server';
import { loadNewsVideos } from './newsVideosLoad.server';
import type { Album, BulletinIssue, NewsVideo, NewsVideoFeed } from './news.types';

type Loaders = {
  videos: () => Promise<readonly NewsVideo[]>;
  issues: () => Promise<readonly BulletinIssue[]>;
  albums: () => Promise<readonly Album[]>;
};

export const createNewsRepository = (load: Loaders) => ({
  /** 주일광고·성복의 뜰 — 최신 날짜부터. 영상이 연결되지 않은 글은 싣지 않는다(글만 있는 화면으로 바꾸지 않는다) */
  videos: async (feed: NewsVideoFeed): Promise<NewsVideo[]> =>
    (await load.videos())
      .filter(v => v.status === 'published' && v.feed === feed && v.videoId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  /** 주보 — 최신 주일부터 */
  issues: async (): Promise<BulletinIssue[]> =>
    (await load.issues())
      .filter(i => i.status === 'published' && i.pages.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date)),
  /** 교회앨범 — 등록된 순서 그대로 */
  albums: async (): Promise<Album[]> =>
    (await load.albums()).filter(a => a.status === 'published' && a.images.length > 0),
});

export const newsRepository = createNewsRepository({
  videos: loadNewsVideos,
  issues: loadIssues,
  albums: loadAlbums,
});
