import { AppProvider } from '@/app/_provider';
import { AdminWarmup } from '@/shared/components/features/AdminWarmup';
import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';

// 공개 사이트의 틀(헤더·푸터·부드러운 스크롤). 관리자(`/admin`)에는 나오면 안 돼서 루트 레이아웃에서 여기로 내렸다.
// `(site)` 는 묶음 폴더라 주소에 나타나지 않는다. `app/not-found.tsx` 도 이 틀을 import 해서 쓴다.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProvider>
      <Header />
      {/* 본문이 짧아도 푸터가 바닥에 붙도록 남는 높이를 main 이 차지한다(body = flex-col min-h-dvh) */}
      <main className="flex-1">{children}</main>
      <Footer />
      {/* 관리자로 로그인했던 브라우저면 관리자 서버를 미리 깨운다(주소줄로 /admin 에 들어올 때 기다리지 않게) */}
      <AdminWarmup />
    </AppProvider>
  );
}
