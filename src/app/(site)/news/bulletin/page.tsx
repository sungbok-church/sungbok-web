import { newsRepository } from '@/domains/news/api/newsRepository';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';

// 주보(B안 «바로 읽기») — 최신 주보가 바로 펼쳐진다. 다른 호를 고르면 주소만 ./날짜 로 바뀐다(페이지 이동 없음).
export default async function Page() {
  return <BulletinPage issues={await newsRepository.issues()} basePath="/news/bulletin" />;
}
