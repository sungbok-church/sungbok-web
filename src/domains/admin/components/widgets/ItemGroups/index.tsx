import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { can } from '@/domains/admin/lib/adminNav';
import {
  IfCan,
  ScreenHeader,
  ScreenHistory,
} from '@/domains/admin/components/features/AdminSession';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { LockIcon } from 'lucide-react';

import { GroupPanels } from './GroupPanels';
import { ItemCreateForm } from './ItemCreateForm';
import { ITEM_KINDS, type ItemKind } from './itemKinds';

type Client = SupabaseClient<Database>;
type Group = { key: string; name: string; description: string | null; locked: boolean };
type Item = { id: string; label: string; detail: string; isActive: boolean; updatedAt: string };

/** 왼쪽 묶음 — 코드 묶음만 설명 · 잠금이 있다 */
const readGroups = async (supabase: Client, kind: ItemKind): Promise<Group[]> => {
  if (kind === 'codes') {
    const { data } = await supabase
      .from('code_groups')
      .select('key, name, description, is_locked')
      .order('sort');
    return (data ?? []).map(g => ({
      key: g.key,
      name: g.name,
      description: g.description,
      locked: g.is_locked,
    }));
  }
  const { data } = await supabase.from('category_groups').select('key, name').order('sort');
  return (data ?? []).map(g => ({ ...g, description: null, locked: false }));
};

/** 모든 묶음의 줄을 한 번에(묶음마다 순서대로) — 줄이 몇십 개라 묶음을 누를 때마다 서버에 묻지 않게 처음에 다 받는다.
 *  둘째 칸(detail)은 영문 값(분류: slug · 코드: code) */
const readItems = async (supabase: Client, kind: ItemKind): Promise<Map<string, Item[]>> => {
  const { data } =
    kind === 'codes'
      ? await supabase
          .from('codes')
          .select('id, group_key, detail:code, label, is_active, updated_at')
          .order('sort')
          .order('created_at')
      : await supabase
          .from('categories')
          .select('id, group_key, detail:slug, label, is_active, updated_at')
          .order('sort')
          .order('created_at');
  const byGroup = new Map<string, Item[]>();
  for (const r of data ?? []) {
    const list = byGroup.get(r.group_key) ?? [];
    list.push({
      id: r.id,
      label: r.label,
      detail: r.detail,
      isActive: r.is_active,
      updatedAt: r.updated_at,
    });
    byGroup.set(r.group_key, list);
  }
  return byGroup;
};

/**
 * 분류 관리(콘텐츠 › 분류 관리) · 코드 관리(시스템 › 코드 관리)의 화면 — 두 화면은 «묶음 안의 이름 목록» 으로 같다.
 * 왼쪽 묶음(분류: 주일광고 분류 · 앨범 분류 … / 코드: 직분 · 콘텐츠 상태 · 새가족 구분 …), 오른쪽 그 묶음의 줄.
 * 더하고 · 이름을 바꾸고 · 순서를 바꾸고 · 끈다. 영문 값(분류 slug · 코드 값)은 공개 주소 · 프로그램이 쓰므로 바꾸지 않는다.
 * 잠긴 코드 묶음은 프로그램이 쓰는 값(enum)이라 더하거나 끌 수 없고 이름 · 순서만 바꾼다. 다른 점은 ITEM_KINDS.
 */
export const ItemGroupsScreen = ({ kind }: { kind: ItemKind }) => {
  const k = ITEM_KINDS[kind];
  return (
    <>
      <ScreenHeader
        menuKey={kind}
        fallback={k.title}
        actions={
          <IfCan menuKey={kind} action="HISTORY">
            <ScreenHistory menuKey={kind} fallback={k.title} table={kind} />
          </IfCan>
        }
      />
      <Deferred content={itemGroups(kind)} fallback={<GroupsBodySkeleton />} />
    </>
  );
};

/** 몸통의 뼈대 — 왼쪽 묶음 목록 + 오른쪽 그 묶음(GroupPanels 와 같은 칸 나눔) */
const GroupsBodySkeleton = () => (
  <div
    role="status"
    aria-label="불러오는 중"
    className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]"
  >
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-80 w-full" />
  </div>
);

/** 왼쪽 묶음 · 오른쪽 표 — 권한을 확인하고(없으면 «없음») 모든 묶음의 줄을 읽어 그린다 */
const itemGroups = async (kind: ItemKind) => {
  const k = ITEM_KINDS[kind];
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [ctx, groups, itemsByGroup] = await Promise.all([
    requirePermission(kind, 'READ'),
    readGroups(supabase, kind),
    readItems(supabase, kind),
  ]);
  const canCreate = can(ctx.permissions, kind, 'CREATE');
  const editable = can(ctx.permissions, kind, 'UPDATE');

  // 묶음마다 오른쪽 표를 미리 그린다 — 화면은 고른 묶음의 것만 보인다(GroupPanels)
  const panels = Object.fromEntries(
    groups.map(group => {
      const items = itemsByGroup.get(group.key) ?? [];
      return [
        group.key,
        // key 가 묶음마다 달라 묶음을 바꾸면 카드를 새로 그린다 — 더하기 칸에 쓰던 글 · 줄 상태가 다른 묶음으로 넘어가지 않게(지우지 말 것)
        <Card key={group.key}>
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
            {/* 코드 묶음의 설명(DB 의 값)만 — 화면 설명 문장은 달지 않는다 */}
            {group.description && <CardDescription>{group.description}</CardDescription>}
            {group.locked && (
              <CardAction>
                <Badge variant="neutral">
                  <LockIcon aria-hidden />
                  이름 · 순서만 바꿈
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* 잠긴 묶음은 머리의 «이름 · 순서만 바꿈» 표가 알린다 — 더하기 칸을 그리지 않는다 */}
            {!group.locked && canCreate && <ItemCreateForm kind={kind} groupKey={group.key} />}
            {items.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>아직 {k.noun}가 없습니다</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <SortableRows
                kind={kind}
                caption={`${group.name} ${k.noun}`}
                detailHeader={k.fieldLabel}
                editable={editable}
                rows={items.map(item =>
                  group.locked
                    ? {
                        ...item,
                        locked: true,
                        lockedNote: '프로그램이 쓰는 값이라 끌 수 없습니다.',
                      }
                    : item
                )}
              />
            )}
          </CardContent>
        </Card>,
      ];
    })
  );

  return (
    <>
      {groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>아직 묶음이 없습니다</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <GroupPanels
          title={k.groupsTitle}
          label={k.groupsLabel}
          groups={groups.map(g => ({
            key: g.key,
            name: g.name,
            locked: g.locked,
            count: itemsByGroup.get(g.key)?.length ?? 0,
          }))}
          basePath={`/admin/${kind}`}
          panels={panels}
        />
      )}
    </>
  );
};
