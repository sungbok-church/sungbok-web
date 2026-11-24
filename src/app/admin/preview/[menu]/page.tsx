import { AppProvider } from '@/app/_provider';
import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { PreviewFrame } from '@/domains/admin/components/features/PreviewFrame';
import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';
import { SectionShell } from '@/shared/components/layout/SectionShell';
import { notFound } from 'next/navigation';

// 콘텐츠 미리보기 틀(설계 6.10) — 등록 · 수정 화면의 [미리보기] 창이 iframe 으로 연다. 공개 사이트의 틀(헤더 · 푸터 · 섹션 머리)과
// 공개 화면 부품을 그대로 그리고, 내용은 부모 화면이 보낸 저장 전 값이다(서버에 아무것도 남기지 않는다).
// 로그인한 그 메뉴의 조회 권한자만, 검색 제외(관리자 레이아웃). 이 주소만 이 사이트의 iframe 안에 들어갈 수 있다(proxy 의 CSP).
// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const MENUS = {
  bulletin: { section: 'news', path: '/news/bulletin' },
  announcements: { section: 'news', path: '/news/announcements' },
  garden: { section: 'news', path: '/news/garden' },
  album: { section: 'news', path: '/news/album' },
} as const;

export default async function AdminPreviewPage({ params }: { params: Promise<{ menu: string }> }) {
  const { menu } = await params;
  if (!Object.hasOwn(MENUS, menu)) notFound();
  const target = MENUS[menu as keyof typeof MENUS];
  await requirePermission(menu, 'READ');
  return (
    <AppProvider>
      <Header />
      <main className="flex-1">
        <SectionShell section={target.section} pathname={target.path}>
          <PreviewFrame menu={menu as keyof typeof MENUS} />
        </SectionShell>
      </main>
      <Footer />
    </AppProvider>
  );
}
