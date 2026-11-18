import { NotFoundMessage } from '@/shared/components/features/NotFoundMessage';
import SiteLayout from './(site)/layout';

// 어느 라우트에도 맞지 않는 주소 — 루트 레이아웃에는 헤더·푸터가 없으므로 사이트 틀로 직접 감싼다.
export default function NotFound() {
  return (
    <SiteLayout>
      <NotFoundMessage />
    </SiteLayout>
  );
}
