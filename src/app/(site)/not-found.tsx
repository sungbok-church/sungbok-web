import { NotFoundMessage } from '@/shared/components/features/NotFoundMessage';

// 공개 페이지가 notFound() 를 부를 때 — 이미 사이트 틀(layout.tsx) 안이다.
export default function SiteNotFound() {
  return <NotFoundMessage />;
}
