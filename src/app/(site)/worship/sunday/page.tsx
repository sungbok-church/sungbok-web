import SermonLibrary from '@/domains/worship-video/components/widgets/SermonLibrary';

// 미리 그려 두고, 영상 목록의 서버 캐시(worshipVideo.server — 10분마다 확인)가 바뀌면 다시 그린다(ADR 0024).
// 새 영상은 대개 20분 안에 보인다(재생목록 받기 10분 + 페이지 확인 10분, 방문이 있을 때). 열어 둔 페이지는 자동 갱신하지 않는다 — 다른 페이지에 갔다 오면 최신으로 보인다.

// 설교 목록 — 최신 설교 한 편 + 검색·시리즈·정렬이 되는 목록. 설교를 누르면 그 설교 페이지(./[videoId])로 넘어간다.
// 영상은 유튜브 «주일 예배 설교» 재생목록에서 온다(config/worshipPages). 옛 주소 /worship-video 와 홈 설교 링크가 여기로 온다.
export default function Page() {
  return <SermonLibrary page="sunday" />;
}
