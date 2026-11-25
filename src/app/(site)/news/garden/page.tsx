import SermonLibrary from '@/domains/worship-video/components/widgets/SermonLibrary';

// 영상 목록은 예배 페이지와 같은 서버 캐시(10분)에 든다 — 관리자가 저장하면 updateTag('video-page-…') 로 바로 다시 읽는다.

// 성복의 뜰 — 교회 행사·소식 영상. 주일광고·예배 설교와 같은 영상 화면(목록 + 한 편)을 쓴다.
// 영상은 관리자가 등록한 게시글(게시글 하나 = 유튜브 영상 하나)에서 온다(domains/news).
export default function Page() {
  return <SermonLibrary page="garden" />;
}
