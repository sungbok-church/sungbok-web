import { issueLabel } from '@/domains/news/api/bulletinList';
import { newsRepository } from '@/domains/news/api/newsRepository';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ date: string }> };

// 공개된 호마다 한 장 — 주보 화면에서 다른 호를 고르면 주소가 여기로 맞춰진다(공유·새로고침용)
export const generateStaticParams = async () =>
  (await newsRepository.issues()).map(i => ({ date: i.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const issue = (await newsRepository.issues()).find(i => i.id === date);
  return { title: issue ? `${issueLabel(issue.date)} | 주보 | 성복교회` : '주보 | 성복교회' };
}

// 주보 한 호 — 같은 화면(BulletinPage)이 주소의 날짜를 읽어 그 호를 펼친다. 없는 날짜는 404.
export default async function Page({ params }: Props) {
  const { date } = await params;
  const issues = await newsRepository.issues();
  if (!issues.some(i => i.id === date)) notFound();
  return <BulletinPage issues={issues} basePath="/news/bulletin" />;
}
