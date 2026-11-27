import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadAdminHomeHero } from '@/domains/admin/api/server/homeHero.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { HomeHeroForm } from '@/domains/admin/components/widgets/HomeHeroForm';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { ExternalLinkIcon } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

// 변경 이력 단추가 그 줄(id)을 알아야 해 화면 전체가 서버에서 오는 대로(Deferred — ADR 0027), 오기 전에는 폼 뼈대
export const instant = true;

// 홈 히어로(설계 6.12) — 한 줄뿐인 설정을 바로 고친다(저장하면 바로 공개). 줄은 옮기기 스크립트가 만든다. 조회만이면 공개 홈.
export default function AdminHomeHeroPage() {
  return <Deferred content={homeHeroScreen()} fallback={<FormScreenSkeleton />} />;
}

/** 머리 · 폼 — 권한을 확인하고(없으면 «없음», 조회만이면 공개 홈) 설정 한 줄을 읽어 그린다 */
const homeHeroScreen = async () => {
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
};
