import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadNewcomer } from '@/domains/admin/api/server/newcomer.server';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { DetailScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
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

// 머리(제목 · 상태 · 단추)부터 항목마다 달라 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 상세 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 새가족 접수 한 건(설계 6.11) — 접수 내용(사실 한 번씩) + 처리(상태 · 메모). 개인정보라 휴지통 없이 완전히 지운다.
export default function AdminNewcomerPage({ params }: { params: Params }) {
  return <Deferred content={newcomerDetail(params)} fallback={<DetailScreenSkeleton />} />;
}

/** 화면 전체(머리 · 상세) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const newcomerDetail = async (params: Params) => {
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
              // 접수한 날부터 1년 — 예약 작업이 처리 상태와 상관없이 지운다(동의 문구에 적은 기간). 휴지통 표시와 같은 말
              { label: '완전 삭제', value: cleanupDay(n.created_at, { years: 1 }) },
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
};
