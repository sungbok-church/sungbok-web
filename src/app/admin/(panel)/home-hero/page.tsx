import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadAdminHomeHero } from '@/domains/admin/api/server/homeHero.server';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { HomeHeroForm } from '@/domains/admin/components/widgets/HomeHeroForm';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { ExternalLinkIcon } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 홈 히어로(설계 6.12) — 한 줄뿐인 설정을 바로 고친다(저장하면 바로 공개). 줄은 옮기기 스크립트가 만든다. 조회만이면 공개 홈.
export default async function AdminHomeHeroPage() {
  const supabase = await createSupabaseServerClient();
  const [ctx, hero] = await Promise.all([
    requirePermission('home-hero', 'READ'),
    loadAdminHomeHero(supabase),
  ]);
  // 조회만 있으면 고칠 것이 없다 — 공개 홈을 연다(다음세대 부서와 같은 규칙)
  if (!can(ctx.permissions, 'home-hero', 'UPDATE')) redirect('/');
  if (!hero) notFound();
  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'home-hero', '홈 히어로')}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="/" target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              사이트에서 보기
            </Button>
            {can(ctx.permissions, 'home-hero', 'HISTORY') && (
              <HistorySheet table="home_hero" rowId={hero.id} subject="홈 히어로" />
            )}
          </>
        }
      />
      <HomeHeroForm
        key={hero.updatedAt}
        userId={ctx.user.id}
        updatedAt={hero.updatedAt}
        initial={{
          kind: hero.kind,
          photo: hero.photo,
          video: hero.videoId ? `https://youtu.be/${hero.videoId}` : '',
        }}
      />
    </>
  );
}
