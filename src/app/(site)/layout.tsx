import { AppProvider } from '@/app/_provider';
import { AdminWarmup } from '@/shared/components/features/AdminWarmup';
import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';
import { SiteNavProvider } from '@/shared/components/layout/SiteNavProvider';
import { loadSiteNav } from '@/shared/api/siteNavLoad.server';

// 공개 사이트의 틀(헤더·푸터·부드러운 스크롤). 관리자(`/admin`)에는 나오면 안 돼서 루트 레이아웃에서 여기로 내렸다.
// `(site)` 는 묶음 폴더라 주소에 나타나지 않는다. `app/not-found.tsx` 도 이 틀을 import 해서 쓴다.
// 홈페이지 메뉴(코드 + DB 덮어쓰기)는 여기서 한 번 읽어 헤더 · 휴대폰 메뉴 · 섹션 머리에 넘긴다(캐시 — 관리자가 저장하면 바로 바뀐다).
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nav = await loadSiteNav();
  return (
    <AppProvider>
      <SiteNavProvider nav={nav}>
        <Header />
        {/* 본문이 짧아도 푸터가 바닥에 붙도록 남는 높이를 main 이 차지한다(body = flex-col min-h-dvh) */}
        <main className="flex-1">{children}</main>
        <Footer />
        {/* 관리자로 로그인했던 브라우저면 관리자 서버를 미리 깨운다(주소줄로 /admin 에 들어올 때 기다리지 않게) */}
        <AdminWarmup />
      </SiteNavProvider>
    </AppProvider>
  );
}
