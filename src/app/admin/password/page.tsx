import { loadAdminContext } from '@/domains/admin/api/server/adminContext.server';
import { AuthFrame } from '@/domains/admin/components/features/AuthFrame';
import { PasswordForm } from '@/domains/admin/components/widgets/PasswordForm';
import { LogoutButton } from '@/domains/admin/components/widgets/PasswordForm/LogoutButton';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 비밀번호 바꾸기. (panel) 묶음 밖에 둔다 — 그 레이아웃은 «비밀번호를 바꿔야 함» 이면 여기로 보내기 때문이다.
// 꼭 바꿔야 하는 사람은 관리자 첫 화면으로 갈 수 없으니(다시 여기로 온다) 나가는 길로 «로그아웃» 을 둔다.
export default async function AdminPasswordPage() {
  const { user, profile } = await loadAdminContext();
  const who = profile.name || user.email;
  return (
    <AuthFrame
      title="비밀번호 바꾸기"
      description={
        who ? `${who} 계정의 새 비밀번호를 정합니다.` : '로그인한 계정의 새 비밀번호를 정합니다.'
      }
      footer={
        profile.mustChangePassword ? (
          <LogoutButton userId={user.id} />
        ) : (
          <Button variant="link" nativeButton={false} render={<Link href="/admin" />}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden />
            관리자 첫 화면으로
          </Button>
        )
      }
    >
      <PasswordForm forced={profile.mustChangePassword} email={user.email} />
    </AuthFrame>
  );
}
