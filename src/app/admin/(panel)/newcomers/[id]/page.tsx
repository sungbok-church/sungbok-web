import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadNewcomer } from '@/domains/admin/api/server/newcomer.server';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { NewcomerStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import {
  NewcomerDetailActions,
  NewcomerHandleForm,
} from '@/domains/admin/components/widgets/NewcomerScreens';
import { can } from '@/domains/admin/lib/adminNav';
import { cleanupDay, formatAdminTime } from '@/domains/admin/lib/adminTime';
import { intentLabel } from '@/domains/admin/lib/newcomer';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Card, CardContent } from '@/shared/components/ui/card';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 새가족 접수 한 건(설계 6.11) — 접수 내용(사실 한 번씩) + 처리(상태 · 메모). 개인정보라 휴지통 없이 완전히 지운다.
export default async function AdminNewcomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, n] = await Promise.all([
    requirePermission('newcomers', 'READ'),
    loadNewcomer(supabase, id),
  ]);
  if (!n) notFound();
  const names = await actorNameMap(supabase, [n.handled_by]);
  const canUpdate = can(ctx.permissions, 'newcomers', 'UPDATE');

  return (
    <>
      <PageHeader
        title={n.name}
        badge={<NewcomerStatusBadge status={n.status} />}
        actions={
          <>
            <ListNav listPath="/admin/newcomers" id={n.id} />
            <NewcomerDetailActions
              id={n.id}
              name={n.name}
              canPurge={can(ctx.permissions, 'newcomers', 'PURGE')}
              canHistory={can(ctx.permissions, 'newcomers', 'HISTORY')}
            />
          </>
        }
      />
      <Card>
        <CardContent>
          <DetailList
            items={[
              { label: '종류', value: intentLabel(n.intent) },
              {
                label: '연락처',
                value: (
                  <a
                    href={`tel:${n.phone}`}
                    className="tabular-nums underline-offset-4 hover:underline"
                  >
                    {n.phone}
                  </a>
                ),
              },
              ...(n.visit_date ? [{ label: '방문 예정일', value: n.visit_date }] : []),
              ...(n.message
                ? [
                    {
                      label: '남기신 말',
                      value: <span className="whitespace-pre-wrap">{n.message}</span>,
                    },
                  ]
                : []),
              { label: '접수 시각', value: formatAdminTime(n.created_at) },
              // 접수한 날부터 1년 — 예약 작업이 처리 상태와 상관없이 지운다(동의 문구에 적은 기간)
              { label: '보관 기한', value: cleanupDay(n.created_at, { years: 1 }) },
              ...(n.handled_at
                ? [
                    {
                      label: '처리',
                      value: `${formatAdminTime(n.handled_at)}${n.handled_by && names[n.handled_by] ? ` · ${names[n.handled_by]}` : ''}`,
                    },
                  ]
                : []),
            ]}
          />
        </CardContent>
      </Card>
      {canUpdate ? (
        <NewcomerHandleForm
          key={n.updated_at}
          id={n.id}
          updatedAt={n.updated_at}
          initial={{ status: n.status, note: n.note ?? '' }}
        />
      ) : (
        n.note && (
          <Card>
            <CardContent>
              <DetailList
                items={[
                  { label: '메모', value: <span className="whitespace-pre-wrap">{n.note}</span> },
                ]}
              />
            </CardContent>
          </Card>
        )
      )}
    </>
  );
}
