import { issueLabel } from '@/domains/news/api/bulletinList';
import { newsRepository } from '@/domains/news/api/newsRepository';
import { BulletinPage } from '@/domains/news/components/widgets/BulletinPage';
import type { Metadata } from 'next';
import { oneBuildParam } from '@/shared/lib/buildParams';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ date: string }> };

// 주보 화면에서 다른 호를 고르면 주소가 여기로 맞춰진다(공유·새로고침용). 빌드 때는 최신 호 한 장만 만들고
// 나머지는 처음 열릴 때 만든다(ADR 0024 — Cache Components 는 빈 목록이 안 된다, oneBuildParam)
export const generateStaticParams = () =>
  oneBuildParam('date', async () => (await newsRepository.issues())[0]?.id);

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
