import { safeNextPath } from '@/domains/admin/api/authRedirect';
import { LoginForm } from '@/domains/admin/components/widgets/LoginForm';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

type Props = { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> };

// 로그인 화면. 관리자 화면은 색을 의미 토큰으로만 쓴다(ADR 0017 — 나중에 다크 모드를 켤 수 있게).
// 이미 로그인한 사람은 proxy 가 `next` 로 보낸다(src/proxy.ts).
export default async function AdminLoginPage({ searchParams }: Props) {
  const { next, reason } = await searchParams;
  return (
    <main className="bg-background flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            성복교회 관리자 로그인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm
            next={safeNextPath(typeof next === 'string' ? next : null)}
            configured={readSupabaseEnv() !== null}
            reason={reason === 'idle' || reason === 'inactive' ? reason : undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}
