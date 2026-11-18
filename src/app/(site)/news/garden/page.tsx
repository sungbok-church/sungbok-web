import SermonLibrary from '@/domains/worship-video/components/widgets/SermonLibrary';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '성복의 뜰 | 성복교회' };
// 예배 페이지와 같은 주기(10분). 지금은 시드라 다시 만들어도 같지만, 관리자 등록이 붙으면 이 주기로 새 글이 보인다
// (등록 직후 바로 보이게 하려면 그때 revalidateTag 를 더한다).
export const revalidate = 600;

// 성복의 뜰 — 교회 행사·소식 영상. 주일광고·예배 설교와 같은 영상 화면(목록 + 한 편)을 쓴다.
// 영상은 관리자가 등록한 게시글(게시글 하나 = 유튜브 영상 하나)에서 온다(domains/news).
export default function Page() {
  return <SermonLibrary page="garden" />;
}
