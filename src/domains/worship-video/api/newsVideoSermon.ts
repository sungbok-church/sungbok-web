// 교회소식에 등록한 영상 게시글(주일광고·성복의 뜰) → 영상 화면이 쓰는 모양(Sermon). 순수.
// 예배 설교는 유튜브 제목에서 시리즈·회차를 읽지만, 이쪽은 등록할 때 적은 분류·날짜를 그대로 쓴다.
import type { NewsVideo } from '@/domains/news/api/news.types';

import type { Sermon } from './worshipVideo.types';

/** 순서는 그대로(저장소가 최신순으로 준다). 같은 영상을 두 번 등록했으면 앞의 것만 — 영상 id 가 주소다. */
export const newsVideosToSermons = (videos: readonly NewsVideo[]): Sermon[] => {
  const seen = new Set<string>();
  const out: Sermon[] = [];
  for (const v of videos) {
    if (seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    out.push({
      id: v.videoId,
      title: v.title,
      series: v.category,
      date: v.date,
      // 행사 날짜를 몰라 업로드 날짜를 쓴 글은 화면에 «업로드» 가 붙는다(dateLabel)
      dateFrom: v.dateFrom === 'upload' ? 'upload' : 'sermon',
      thumbnail: v.thumbnail,
      poster: v.poster,
    });
  }
  return out;
};
