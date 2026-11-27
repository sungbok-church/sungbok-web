import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { can } from '@/domains/admin/lib/adminNav';
import {
  IfCan,
  ScreenHeader,
  ScreenHistory,
} from '@/domains/admin/components/features/AdminSession';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { type SortableRow, SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { SITE_CHILD_MAX, SITE_TOP_MAX } from '@/domains/admin/lib/siteMenuLimits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LockIcon } from 'lucide-react';

// 머리(제목 · 변경 이력)는 미리 만든 틀로 누르는 즉시, 안내 · 두 탭의 메뉴 줄은 서버에서 오는 대로(Deferred — ADR 0027)
export const instant = true;

type MenuRow = {
  id: string;
  area: 'ADMIN' | 'SITE';
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
  isActive: m.is_active,
  locked: m.is_locked,
  updatedAt: m.updated_at,
  ...(m.area === 'SITE' && {
    lockedNote: '홈 화면이 가리키는 메뉴라 끌 수 없습니다.',
    // 대메뉴는 한 줄에 여섯 개가 로고와 함께 놓인다(DB check 와 같다)
    maxLength: m.parent_id === null ? SITE_TOP_MAX : SITE_CHILD_MAX,
  }),
});

// 메뉴 관리(설계 6.5) — 관리자 메뉴 · 홈페이지 메뉴의 이름 · 사용 여부 · 순서(두 탭). 홈페이지 메뉴는 저장하면 공개 사이트의
// 헤더 · 휴대폰 메뉴 · 페이지 제목에 바로 반영되고, 끈 메뉴의 주소는 없는 페이지가 된다.
export default function AdminMenusPage() {
  return (
    <>
      <ScreenHeader
        menuKey="menus"
        fallback="메뉴 관리"
        actions={
          <IfCan menuKey="menus" action="HISTORY">
            <ScreenHistory menuKey="menus" fallback="메뉴 관리" table="menus" />
          </IfCan>
        }
      />
      <Deferred content={menuBody()} fallback={<MenusBodySkeleton />} />
    </>
  );
}

/** 안내 · 두 탭의 메뉴 줄 — 권한을 확인하고(없으면 «없음») 메뉴를 읽어 그린다 */
const menuBody = async () => {
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  // 켜기 · 끄기는 «전체 관리» 만(guard_menus) — 권한 확인 뒤 이어서 읽되 메뉴 읽기와는 함께
  const context = requirePermission('menus', 'READ');
  const [ctx, { fullAdmin }, { data }] = await Promise.all([
    context,
    context.then(c => loadMyGroups(c.user.id)),
    supabase
      .from('menus')
      .select(
        'id, area, key, parent_id, label, default_label, path, is_active, is_locked, updated_at'
      )
      .order('sort')
      .order('created_at'),
  ]);
  const rows = (data ?? []) as MenuRow[];
  const editable = can(ctx.permissions, 'menus', 'UPDATE');
  const toggleable = editable && fullAdmin;

  return (
    <div className="flex flex-col gap-6">
      {editable && !fullAdmin && (
        <Alert>
          <LockIcon aria-hidden />
          <AlertDescription>메뉴 켜기 · 끄기는 «전체 관리» 만 합니다.</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="ADMIN">
        <TabsList>
          <TabsTrigger value="ADMIN">관리자</TabsTrigger>
          <TabsTrigger value="SITE">홈페이지</TabsTrigger>
        </TabsList>
        {(['ADMIN', 'SITE'] as const).map(area => (
          <TabsContent key={area} value={area} className="flex flex-col gap-6">
            <AreaMenus
              area={area}
              menus={rows.filter(m => m.area === area)}
              editable={editable}
              toggleable={toggleable}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

/** 탭 · 메뉴 줄을 읽는 동안의 뼈대 — 탭 머리, 대메뉴 카드(이름 · 한 줄 안내 · 줄) */
const MenusBodySkeleton = () => (
  <div role="status" aria-label="불러오는 중" className="flex flex-col gap-6">
    <Skeleton className="h-9 w-44" />
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  </div>
);

/**
 * 하위 메뉴 줄 — 홈페이지 메뉴는 켜진 하위가 하나 남으면 그것을 끌 수 없게 한다(다 끄면 공개 화면에서 대메뉴도 빠지는데
 * 대메뉴 스위치는 켜진 채로 보여 화면과 공개 결과가 어긋난다 — 대메뉴를 끄면 된다).
 */
const childRows = (area: 'ADMIN' | 'SITE', children: MenuRow[]): SortableRow[] => {
  const lastOn = area === 'SITE' && children.filter(c => c.is_active).length === 1;
  return children.map(c =>
    lastOn && c.is_active
      ? { ...toRow(c), locked: true, lockedNote: '하나 남은 하위 메뉴는 끌 수 없습니다.' }
      : toRow(c)
  );
};

/**
 * 한 영역의 메뉴 — 대메뉴 한 카드 + 하위가 있는 대메뉴마다 한 카드(같은 상위 안에서만 옮긴다).
 * 관리자 메뉴의 대메뉴는 묶음 머리(주소 없음), 홈페이지 메뉴의 대메뉴는 주소가 있다(하위가 있으면 켜진 첫 하위로 넘어간다).
 */
function AreaMenus({
  area,
  menus,
  editable,
  toggleable,
}: {
  area: 'ADMIN' | 'SITE';
  menus: MenuRow[];
  editable: boolean;
  toggleable: boolean;
}) {
  const tops = menus.filter(m => m.parent_id === null);
  const groups = tops.filter(t => menus.some(m => m.parent_id === t.id));
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>대메뉴</CardTitle>
          {/* 실수를 막는 한 줄만 — 이름을 비우면 기본 이름(입력칸의 흐린 글자)으로 돌아간다 */}
          <CardDescription>
            {area === 'SITE'
              ? '끄면 그 아래 메뉴와 페이지도 함께 닫힙니다.'
              : '끄면 그 아래 메뉴도 모두 숨겨집니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SortableRows
            kind="menus"
            caption="대메뉴"
            rows={tops.map(toRow)}
            editable={editable}
            toggleable={toggleable}
          />
        </CardContent>
      </Card>
      {groups.map(group => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{group.label ?? group.default_label}</CardTitle>
          </CardHeader>
          <CardContent>
            <SortableRows
              kind="menus"
              caption={`${group.label ?? group.default_label} 메뉴`}
              rows={childRows(
                area,
                menus.filter(m => m.parent_id === group.id)
              )}
              editable={editable}
              toggleable={toggleable}
            />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
