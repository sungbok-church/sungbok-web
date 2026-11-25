import { loadAdminContext } from '@/domains/admin/api/server/adminContext.server';
import { can } from '@/domains/admin/lib/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/lib/screenDescriptions';
import { periodStart } from '@/domains/admin/lib/adminTime';
import { seoulToday, upcomingSunday } from '@/domains/admin/lib/content';
import { issueLongDate } from '@/domains/news/api/bulletinList';
import { MENU_ICONS } from '@/domains/admin/components/features/MenuIcon';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { ContentStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { CircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

type Stat = { label: string; value: number; href: string };

type Todo = { key: string; title: string; description: string };

// 이번 주 할 일 — 그 화면이 생겼고 권한이 있는 사람에게만(화면이 없는 «준비 중» 카드는 늘어놓지 않는다). 값(올렸는지 · 몇 건인지)은
// 그 화면이 생기는 패키지 B · C 에서 채운다.
const TODOS: Todo[] = [
  { key: 'bulletin', title: '이번 주 주보', description: '이번 주일 주보를 올렸는지 보여 줍니다.' },
  {
    key: 'announcements',
    title: '이번 주 주일광고',
    description: '이번 주일 광고 영상을 연결했는지 보여 줍니다.',
  },
  {
    key: 'newcomers',
    title: '연락 전 새가족',
    description: '아직 연락하지 않은 새가족 접수 건수를 보여 줍니다.',
  },
];

// 관리자 첫 화면(스타터의 overview 와 같은 배치) — 위: 숫자 카드, 가운데: 이번 주 할 일, 아래: 바로 가기.
export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  // 요청마다 지금 시각 기준(서버 컴포넌트)
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const weekAgo = periodStart('7d', now) ?? '';
  const sunday = upcomingSunday(seoulToday(now));
  const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;
  const active = (table: 'profiles' | 'groups' | 'categories') =>
    count(supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_active', true));

  // 숫자는 권한 확인(loadAdminContext)을 기다리지 않고 함께 센다 — DB 를 한 번 덜 기다린다. 막는 것은 어차피 DB(RLS)이고,
  // 권한이 없는 숫자는 아래에서 버린다.
  const [{ profile, permissions, nav }, users, groups, categories, changes, thisWeek, thisAd] =
    await Promise.all([
      loadAdminContext(),
      active('profiles'),
      active('groups'),
      active('categories'),
      count(
        supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('at', weekAgo)
      ),
      // 이번 주일 주보(휴지통 아닌 것) — 주보 조회 권한이 없으면 RLS 가 비워 준다
      supabase
        .from('bulletins')
        .select('id, status')
        .eq('date', sunday)
        .is('deleted_at', null)
        .maybeSingle(),
      // 이번 주일 주일광고 — 여럿이면 공개된 것부터
      supabase
        .from('news_videos')
        .select('id, status')
        .eq('feed', 'ANNOUNCEMENTS')
        .eq('date', sunday)
        .is('deleted_at', null)
        .order('status', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  // 연락 전 새가족 — 왼쪽 메뉴의 숫자(loadAdminContext 가 센다)와 같은 값을 쓴다
  const newcomers = nav.flatMap(g => g.items).find(item => item.key === 'newcomers')?.badge ?? 0;
  const stats: Stat[] = [
    can(permissions, 'users', 'READ') && {
      label: '사용 중인 계정',
      value: users,
      href: '/admin/users',
    },
    can(permissions, 'groups', 'READ') && {
      label: '사용 중인 그룹',
      value: groups,
      href: '/admin/groups',
    },
    can(permissions, 'categories', 'READ') && {
      label: '사용 중인 분류',
      value: categories,
      href: '/admin/categories',
    },
    can(permissions, 'audit', 'READ') && {
      label: '최근 7일 변경',
      value: changes,
      href: '/admin/audit',
    },
  ].filter((s): s is Stat => Boolean(s));

  // 왼쪽 메뉴에 있는 화면만(만들었고 · 켜져 있고 · 권한이 있는) — 메뉴를 끄면 카드도 빠진다
  const onNav = new Set(nav.flatMap(g => g.items).map(item => item.key));
  const todos = TODOS.filter(t => onNav.has(t.key) && can(permissions, t.key, 'READ'));
  // 할 일 카드의 값 — 화면이 생긴 것만(주보 · 주일광고). 누르면 그 글로, 없으면 날짜를 채운 등록 화면으로(등록 권한이 있을 때)
  const weekly = (
    menu: string,
    row: { id: string; status: 'DRAFT' | 'PUBLISHED' } | null
  ): { detail: string; badge: ReactNode; href?: string } => ({
    detail: issueLongDate(sunday),
    badge: row ? (
      <ContentStatusBadge status={row.status} />
    ) : (
      <Badge variant="warning">아직 없음</Badge>
    ),
    href: row
      ? `/admin/${menu}/${row.id}`
      : can(permissions, menu, 'CREATE')
        ? `/admin/${menu}/new?date=${sunday}`
        : undefined,
  });
  const todoState: Record<string, { detail: string; badge: ReactNode; href?: string }> = {
    bulletin: weekly('bulletin', thisWeek.data),
    announcements: weekly('announcements', thisAd.data),
    newcomers: {
      detail: '상태 «접수»',
      badge:
        newcomers > 0 ? (
          <Badge variant="warning">{newcomers}건</Badge>
        ) : (
          <Badge variant="success">없음</Badge>
        ),
      href: '/admin/newcomers?status=NEW',
    },
  };
  const screens = nav.flatMap(group =>
    group.items
      .filter(item => item.key !== 'dashboard')
      .map(item => ({ ...item, group: group.label }))
  );

  return (
    <>
      <PageHeader title={profile.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'} />

      {stats.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
            <li key={stat.label}>
              <Link
                href={stat.href}
                className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
              >
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardHeader>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                      {stat.value.toLocaleString('ko-KR')}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <section aria-labelledby="todos" className="flex flex-col gap-3">
          <h2 id="todos" className="m-0 text-base font-medium">
            이번 주 할 일
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {todos.map(todo => {
              const state = todoState[todo.key];
              const card = (
                <Card
                  className={state?.href ? 'hover:bg-muted/40 h-full transition-colors' : 'h-full'}
                >
                  <CardHeader>
                    <CardTitle>{todo.title}</CardTitle>
                    <CardDescription className="tabular-nums">
                      {state?.detail ?? todo.description}
                    </CardDescription>
                    <CardAction>
                      {state?.badge ?? <Badge variant="neutral">준비 중</Badge>}
                    </CardAction>
                  </CardHeader>
                </Card>
              );
              return (
                <li key={todo.key}>
                  {state?.href ? (
                    <Link
                      href={state.href}
                      className="focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-[3px]"
                    >
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="shortcuts" className="flex flex-col gap-3">
        <h2 id="shortcuts" className="m-0 text-base font-medium">
          바로 가기
        </h2>
        {screens.length === 0 ? (
          <p className="text-muted-foreground m-0 text-sm">
            아직 쓸 수 있는 메뉴가 없습니다. 관리 담당자에게 권한을 요청해 주세요.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {screens.map(screen => {
              const Icon = MENU_ICONS[screen.key] ?? CircleIcon;
              return (
                <li key={screen.key}>
                  <Link
                    href={screen.href}
                    className="focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-[3px]"
                  >
                    <Card className="hover:bg-muted/40 h-full transition-colors">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <Icon aria-hidden className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <CardTitle>{screen.label}</CardTitle>
                            {screen.group && <CardDescription>{screen.group}</CardDescription>}
                          </div>
                        </div>
                        {SCREEN_DESCRIPTIONS[screen.key] && (
                          <CardDescription className="mt-2">
                            {SCREEN_DESCRIPTIONS[screen.key]}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
