import { newsRepository } from '@/domains/news/api/newsRepository';
import { AlbumPage } from '@/domains/news/components/widgets/AlbumPage';
import type { Metadata } from 'next';
import { oneBuildParam } from '@/shared/lib/buildParams';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

// 앨범 화면에서 항목을 고르면 주소가 여기로 맞춰진다(공유·새로고침용). 빌드 때는 최신 한 건만 만들고 나머지는
// 처음 열릴 때 만든다(ADR 0024 — Cache Components 는 빈 목록이 안 된다, oneBuildParam)
export const generateStaticParams = () =>
  oneBuildParam('id', async () => (await newsRepository.albums())[0]?.id);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const album = (await newsRepository.albums()).find(a => a.id === id);
  return { title: album ? `${album.title} | 교회앨범 | 성복교회` : '교회앨범 | 성복교회' };
}

// 앨범 한 건 — 별도 상세 화면이 아니라 같은 화면(AlbumPage)에서 주소의 id 를 읽어 그 항목을 고른다. 없는 id 는 404.
export default async function Page({ params }: Props) {
  const { id } = await params;
  const albums = await newsRepository.albums();
  if (!albums.some(a => a.id === id)) notFound();
  return <AlbumPage albums={albums} basePath="/news/album" />;
}
