import { newsRepository } from '@/domains/news/api/newsRepository';
import { AlbumPage } from '@/domains/news/components/widgets/AlbumPage';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

// 공개된 앨범마다 한 장 — 앨범 화면에서 항목을 고르면 주소가 여기로 맞춰진다(공유·새로고침용)
export const generateStaticParams = async () =>
  (await newsRepository.albums()).map(a => ({ id: a.id }));

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
