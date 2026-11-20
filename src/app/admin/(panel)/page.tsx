import { loadAdminContext } from '@/domains/admin/api/adminContext.server';
import { can } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { periodStart } from '@/domains/admin/api/adminTime';
import { MENU_ICONS } from '@/domains/admin/components/features/MenuIcon';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { CircleIcon } from 'lucide-react';
import Link from 'next/link';

type Stat = { label: string; value: number; note: string; href: string };

type Todo = { key: string; title: string; description: string };

// 이번 주 할 일 — 그 메뉴 권한이 있는 사람에게만. 값(올렸는지 · 몇 건인지)은 그 화면이 생기는 패키지 B · C 에서 채운다.
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
  const { profile, permissions, nav } = await loadAdminContext();
  const supabase = await createSupabaseServerClient();
  // 요청마다 지금 시각 기준(서버 컴포넌트)
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = periodStart('7d', Date.now()) ?? '';

  const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count ?? 0;
  const stats: Stat[] = (
    await Promise.all([
      can(permissions, 'users', 'READ') &&
        count(
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
        ).then(value => ({
          label: '사용 중인 계정',
          value,
          note: '로그인할 수 있는 계정',
          href: '/admin/users',
        })),
      can(permissions, 'groups', 'READ') &&
        count(
          supabase.from('groups').select('id', { count: 'exact', head: true }).eq('is_active', true)
        ).then(value => ({ label: '그룹', value, note: '사용 중인 그룹', href: '/admin/groups' })),
      can(permissions, 'categories', 'READ') &&
        count(
          supabase
            .from('categories')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
        ).then(value => ({
          label: '분류(칩)',
          value,
          note: '사용 중인 분류',
          href: '/admin/categories',
        })),
      can(permissions, 'audit', 'READ') &&
        count(
          supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('at', weekAgo)
        ).then(value => ({
          label: '최근 7일 변경',
          value,
          note: '변경 이력에 남은 건수',
          href: '/admin/audit',
        })),
    ])
  ).filter((s): s is Stat => Boolean(s));

  const todos = TODOS.filter(t => can(permissions, t.key, 'READ'));
  const screens = nav.flatMap(group =>
    group.items
      .filter(item => item.key !== 'dashboard' && item.ready !== false)
      .map(item => ({ ...item, group: group.label }))
  );

  return (
    <>
      <PageHeader
        title={profile.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'}
        description="왼쪽 메뉴에서 고르거나 ⌘K(Ctrl+K)로 메뉴를 찾아 바로 갈 수 있습니다."
      />

      {stats.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
            <li key={stat.label}>
              <Link href={stat.href} className="block rounded-xl focus-visible:outline-none">
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardHeader>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                      {stat.value.toLocaleString('ko-KR')}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="text-muted-foreground text-sm">{stat.note}</CardFooter>
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
                    className="block h-full rounded-xl focus-visible:outline-none"
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
