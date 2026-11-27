import { AuthFrame } from '@/domains/admin/components/features/AuthFrame';
import { ForgotPasswordForm } from '@/domains/admin/components/widgets/ForgotPasswordForm';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PASSWORD_RESET_ENABLED } from '@/domains/admin/lib/passwordReset';

// 주소줄 · 링크로 여는 화면이라(관리자 틀 밖) 요청 때 그려도 된다(ADR 0027)
export const instant = false;

// 비밀번호 찾기. 로그인 화면 아래(/admin/login/*)라 proxy 가 로그인 없이 열어 둔다 — 로그인한 사람은 proxy 가 첫 화면으로 보낸다.
// 메일의 링크는 /admin/login/confirm(route handler)으로 온다. 흐름은 passwordReset.ts.
export default function AdminForgotPasswordPage() {
  // 메일 서비스를 붙이기 전까지는 없는 화면(PASSWORD_RESET_ENABLED)
  if (!PASSWORD_RESET_ENABLED) notFound();
  return (
    <AuthFrame
      title="비밀번호 찾기"
      footer={
        <Button variant="link" nativeButton={false} render={<Link href="/admin/login" />}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          로그인으로 돌아가기
        </Button>
      }
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
