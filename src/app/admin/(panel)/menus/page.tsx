import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can, screenLabel } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { type SortableRow, SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

type MenuRow = {
  id: string;
  key: string;
  parent_id: string | null;
  label: string | null;
  default_label: string;
  path: string | null;
  is_active: boolean;
  is_locked: boolean;
  updated_at: string;
};

const toRow = (m: MenuRow): SortableRow => ({
  id: m.id,
  label: m.label ?? '',
  defaultLabel: m.default_label,
  detail: m.path ?? '대메뉴(묶음)',
  isActive: m.is_active,
  locked: m.is_locked,
  updatedAt: m.updated_at,
});

// 메뉴 관리(설계 6.5) — 관리자 메뉴의 이름 · 사용 여부 · 순서. 홈페이지 메뉴 탭은 패키지 D 에서 더한다.
export default async function AdminMenusPage() {
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [ctx, { data }] = await Promise.all([
    requirePermission('menus', 'READ'),
    supabase
      .from('menus')
      .select('id, key, parent_id, label, default_label, path, is_active, is_locked, updated_at')
      .eq('area', 'ADMIN')
      .order('sort')
      .order('created_at'),
  ]);
  const menus = (data ?? []) as MenuRow[];
  const tops = menus.filter(m => m.parent_id === null);
  const headers = tops.filter(m => m.path === null);
  const editable = can(ctx.permissions, 'menus', 'UPDATE');

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'menus', '메뉴 관리')}
        description={SCREEN_DESCRIPTIONS.menus}
        actions={
          can(ctx.permissions, 'menus', 'HISTORY') && (
            <HistorySheet table="menus" subject={screenLabel(ctx.nav, 'menus', '메뉴 관리')} />
          )
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>대메뉴</CardTitle>
            <CardDescription>
              왼쪽 메뉴 맨 위 칸의 순서입니다. 대메뉴를 끄면 그 아래 메뉴가 모두 숨겨집니다. 이름을
              비우면 기본 이름으로 돌아갑니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SortableRows
              kind="menus"
              caption="대메뉴"
              detailHeader="주소"
              rows={tops.map(toRow)}
              editable={editable}
            />
          </CardContent>
        </Card>
        {headers.map(header => (
          <Card key={header.id}>
            <CardHeader>
              <CardTitle>{header.label ?? header.default_label}</CardTitle>
            </CardHeader>
            <CardContent>
              <SortableRows
                kind="menus"
                caption={`${header.label ?? header.default_label} 메뉴`}
                detailHeader="주소"
                rows={menus.filter(m => m.parent_id === header.id).map(toRow)}
                editable={editable}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
