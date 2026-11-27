import { safeNextPath } from '@/domains/admin/lib/authRedirect';
import { AuthFrame } from '@/domains/admin/components/features/AuthFrame';
import { type LoginReason, LoginForm } from '@/domains/admin/components/widgets/LoginForm';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

// 주소줄 · 넘겨 보내기로 여는 화면이라(관리자 틀 밖) 주소 값(next · reason)을 읽는 동안 기다려도 된다(ADR 0027)
export const instant = false;

const REASONS: readonly LoginReason[] = ['idle', 'inactive', 'reset_expired'];
const isReason = (v: unknown): v is LoginReason => REASONS.includes(v as LoginReason);

type Props = { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> };

// 로그인 화면. 관리자 화면은 색을 의미 토큰으로만 쓴다(ADR 0017 — 나중에 다크 모드를 켤 수 있게).
// 이미 로그인한 사람은 proxy 가 `next` 로 보낸다(src/proxy.ts).
export default async function AdminLoginPage({ searchParams }: Props) {
  const { next, reason } = await searchParams;
  return (
    <AuthFrame
      title="관리자 로그인"
      footer={
        <Button variant="link" nativeButton={false} render={<Link href="/" prefetch={false} />}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          홈페이지로 돌아가기
        </Button>
      }
    >
      <LoginForm
        next={safeNextPath(typeof next === 'string' ? next : null)}
        configured={readSupabaseEnv() !== null}
        reason={isReason(reason) ? reason : undefined}
      />
    </AuthFrame>
  );
}
