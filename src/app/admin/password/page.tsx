import { loadAdminContext } from '@/domains/admin/api/adminContext.server';
import { PasswordForm } from '@/domains/admin/components/widgets/PasswordForm';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import Link from 'next/link';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 비밀번호 바꾸기. (panel) 묶음 밖에 둔다 — 그 레이아웃은 «비밀번호를 바꿔야 함» 이면 여기로 보내기 때문이다.
export default async function AdminPasswordPage() {
  const { profile } = await loadAdminContext();
  return (
    <main className="bg-background flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>
            비밀번호 바꾸기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm forced={profile.mustChangePassword} />
        </CardContent>
        {!profile.mustChangePassword && (
          <CardFooter>
            <Button variant="link" nativeButton={false} render={<Link href="/admin" />}>
              관리자 첫 화면으로
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
