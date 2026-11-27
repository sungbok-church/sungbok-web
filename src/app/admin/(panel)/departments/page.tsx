import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadDepartmentList } from '@/domains/admin/api/server/department.server';
import { ScreenHeader } from '@/domains/admin/components/features/AdminSession';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { can } from '@/domains/admin/lib/adminNav';
import { formatAdminTime } from '@/domains/admin/lib/adminTime';
import { DEPARTMENT_INFO } from '@/domains/next-generation/config/departmentInfo';
import { DEPARTMENT_SLUGS, fromDbSlug } from '@/domains/next-generation/config/departmentSlug';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { redirect } from 'next/navigation';

// 머리(제목)는 미리 만든 틀로 누르는 즉시, 부서 표는 서버에서 오는 대로(Deferred — ADR 0027)
export const instant = true;

// 다음세대 부서(설계 6.13) — 8곳 고정. 부서 이름을 누르면 그 부서 고치기(조회만 있으면 공개 페이지). 담당 부서가 정해진 사람은 그 부서로 바로.
export default function AdminDepartmentsPage() {
  return (
    <>
      <ScreenHeader menuKey="departments" fallback="다음세대 부서" />
      <Deferred content={departmentTable()} fallback={<DepartmentTableSkeleton />} />
    </>
  );
}

/** 부서 표 — 권한을 확인하고(없으면 «없음», 담당 부서가 정해졌으면 그 부서로) 부서마다 요약을 읽어 그린다 */
const departmentTable = async () => {
  const supabase = await createSupabaseServerClient();
  const [ctx, limit, list] = await Promise.all([
    requirePermission('departments', 'READ'),
    supabase.rpc('my_department_limit'),
    loadDepartmentList(supabase),
  ]);
  // 고칠 수 없으면(조회만) 공개 페이지를 연다
  const canEdit = can(ctx.permissions, 'departments', 'UPDATE');
  const mine = limit.data ? fromDbSlug(limit.data) : null;
  if (mine && canEdit) redirect(`/admin/departments/${mine}`);
  const bySlug = new Map(list.map(d => [d.slug, d]));

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>부서</TableHead>
              <TableHead>대상</TableHead>
              <TableHead className="text-right">사진</TableHead>
              <TableHead className="text-right">담당자</TableHead>
              <TableHead className="hidden sm:table-cell">마지막 수정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEPARTMENT_SLUGS.map(slug => {
              const d = bySlug.get(slug);
              return (
                <TableRow key={slug}>
                  <TableCell>
                    {canEdit ? (
                      <Link
                        href={`/admin/departments/${slug}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {DEPARTMENT_INFO[slug].name}
                      </Link>
                    ) : (
                      <a
                        href={`/next-generation/${slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {DEPARTMENT_INFO[slug].name}
                        <span className="sr-only"> (새 탭)</span>
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d?.ages ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d ? `${d.photos}장` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d ? `${d.staff}명` : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {d ? formatAdminTime(d.updatedAt) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/** 부서 표를 읽는 동안의 뼈대 — 표 머리 · 부서 8줄 */
const DepartmentTableSkeleton = () => (
  <Card role="status" aria-label="불러오는 중">
    <CardContent className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      {DEPARTMENT_SLUGS.map(slug => (
        <Skeleton key={slug} className="h-10 w-full" />
      ))}
    </CardContent>
  </Card>
);
