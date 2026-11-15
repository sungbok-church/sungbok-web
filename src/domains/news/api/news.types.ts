// 교회소식(주일광고·성복의 뜰·주보·교회앨범)의 자료 모양. 관리자 등록 → 공개 구조는 자료실과 같다(.md/domains/news.md).
import type { ContentStatus } from '@/shared/api/content.types';

export type NewsImage = { src: string; width: number; height: number };

/** 영상으로 올리는 소식 — 주일광고·성복의 뜰. 게시글 하나 = 유튜브 영상 하나. */
export type NewsVideoFeed = 'announcements' | 'garden';

export type NewsVideo = {
  id: string;
  status: ContentStatus;
  feed: NewsVideoFeed;
  title: string;
  /** 분류 — 주일광고는 «주일광고», 성복의 뜰은 «부흥집회»·«교회소식» 등 */
  category: string;
  /** 달력 날짜 YYYY-MM-DD */
  date: string;
  /** 날짜의 출처 — event: 광고한 주일·행사 날짜, upload: 유튜브 업로드 날짜(행사 날짜를 모를 때) */
  dateFrom: 'event' | 'upload';
  /** 유튜브 영상 id — 비어 있는 게시글은 공개 목록에 싣지 않는다 */
  videoId: string;
  /** 목록 썸네일 · 큰 표지(등록할 때 확인해 둔 주소) */
  thumbnail: string;
  poster: string;
  description?: string;
};

/** 주보 한 호 — 그림 한 장이 펼친 두 면(왼쪽·오른쪽)이다. */
export type BulletinIssue = {
  id: string;
  status: ContentStatus;
  /** 주일 날짜 YYYY-MM-DD */
  date: string;
  pages: readonly NewsImage[];
};

/** 교회앨범 한 건 — 사진과 글을 편집한 세로 화보·포스터. 전체 비율 그대로 보여 준다. */
export type Album = {
  id: string;
  status: ContentStatus;
  title: string;
  category: string;
  images: readonly NewsImage[];
};
