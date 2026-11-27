import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadDepartment, loadStaffRoles } from '@/domains/admin/api/server/department.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { DepartmentForm } from '@/domains/admin/components/widgets/DepartmentForm';
import { can } from '@/domains/admin/lib/adminNav';
import { DEPARTMENT_INFO } from '@/domains/next-generation/config/departmentInfo';
import {
  DEPARTMENT_SLUGS,
  type DepartmentSlug,
  toDbSlug,
} from '@/domains/next-generation/config/departmentSlug';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { ExternalLinkIcon } from 'lucide-react';
import { notFound } from 'next/navigation';

// 제목 · 변경 이력이 주소의 부서와 그 줄(id)을 알아야 해 화면 전체가 서버에서 오는 대로(Deferred — ADR 0027), 오기 전에는 폼 뼈대
export const instant = true;

type Params = Promise<{ slug: string }>;

const isSlug = (s: string): s is DepartmentSlug =>
  (DEPARTMENT_SLUGS as readonly string[]).includes(s);

// 다음세대 부서 고치기(설계 6.13) — 설정이라 상세 없이 바로 고친다(저장하면 바로 공개). 담당 부서가 정해진 사람은 그 부서만.
export default function AdminDepartmentPage({ params }: { params: Params }) {
  return <Deferred content={departmentScreen(params)} fallback={<FormScreenSkeleton />} />;
}

/** 머리 · 폼 — 권한을 확인하고(없으면 «없음», 맡은 부서가 아니면 없는 주소) 부서를 읽어 그린다 */
const departmentScreen = async (params: Params) => {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, limit, dept] = await Promise.all([
    requirePermission('departments', 'UPDATE'),
    supabase.rpc('my_department_limit'),
    loadDepartment(supabase, slug),
  ]);
  if ((limit.data && limit.data !== toDbSlug(slug)) || !dept) notFound();
  const roles = await loadStaffRoles(
    supabase,
    dept.staff.map(s => s.roleId)
  );
  const name = DEPARTMENT_INFO[slug].name;

  return (
    <>
      <PageHeader
        title={name}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/next-generation/${slug}`} target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              사이트에서 보기
            </Button>
            {can(ctx.permissions, 'departments', 'HISTORY') && (
              <HistorySheet table="departments" rowId={dept.id} subject={name} />
            )}
          </>
        }
      />
      <DepartmentForm
        key={dept.updatedAt}
        userId={ctx.user.id}
        slug={slug}
        updatedAt={dept.updatedAt}
        roles={roles}
        cancelHref={limit.data ? '/admin' : '/admin/departments'}
        initial={{
          ages: dept.ages,
          tagline: dept.tagline,
          intro: dept.intro,
          extra: dept.extra,
          photos: dept.photos,
          staff: dept.staff.map(s => ({ key: s.id, ...s })),
        }}
      />
    </>
  );
};
