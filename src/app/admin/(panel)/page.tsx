import { loadAdminContext } from '@/domains/admin/api/server/adminContext.server';
import { can, SCREENS_READY } from '@/domains/admin/lib/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/lib/screenDescriptions';
import { periodStart } from '@/domains/admin/lib/adminTime';
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
import { CircleIcon } from 'lucide-react';
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
    title: '처리 안 된 새가족',
    description: '아직 연락하지 않은 새가족 등록 건수를 보여 줍니다.',
  },
];

// 관리자 첫 화면(스타터의 overview 와 같은 배치) — 위: 숫자 카드, 가운데: 이번 주 할 일, 아래: 바로 가기.
export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  // 요청마다 지금 시각 기준(서버 컴포넌트)
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = periodStart('7d', Date.now()) ?? '';
  const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;
  const active = (table: 'profiles' | 'groups' | 'categories') =>
    count(supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_active', true));

  // 숫자는 권한 확인(loadAdminContext)을 기다리지 않고 함께 센다 — DB 를 한 번 덜 기다린다. 막는 것은 어차피 DB(RLS)이고,
  // 권한이 없는 숫자는 아래에서 버린다.
  const [{ profile, permissions, nav }, users, groups, categories, changes] = await Promise.all([
    loadAdminContext(),
    active('profiles'),
    active('groups'),
    active('categories'),
    count(
      supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('at', weekAgo)
    ),
  ]);
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

  const todos = TODOS.filter(t => SCREENS_READY.has(t.key) && can(permissions, t.key, 'READ'));
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
            {todos.map(todo => (
              <li key={todo.key}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{todo.title}</CardTitle>
                    <CardDescription>{todo.description}</CardDescription>
                    <CardAction>
                      <Badge variant="neutral">준비 중</Badge>
                    </CardAction>
                  </CardHeader>
                </Card>
              </li>
            ))}
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
