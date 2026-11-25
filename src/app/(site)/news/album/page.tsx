import { newsRepository } from '@/domains/news/api/newsRepository';
import { AlbumPage } from '@/domains/news/components/widgets/AlbumPage';

// 교회앨범(C안 «목록 + 미리보기») — 행사를 고르면 화보가 옆에 보인다. 고른 항목은 주소만 ./id 로 바뀐다(페이지 이동 없음).
export default async function Page() {
  return <AlbumPage albums={await newsRepository.albums()} basePath="/news/album" />;
}
