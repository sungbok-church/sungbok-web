import { requireAdminUser } from '@/domains/admin/api/session.server';

// 관리자 첫 화면(제목은 틀의 위쪽 막대가 그린다). 이번 주 할 일(주보·주일광고 등록 여부, 새가족 접수 건수)은 뒤 패키지에서 채운다.
export default async function AdminHomePage() {
  const user = await requireAdminUser();
  return (
    <p className="text-muted-foreground m-0 text-sm">
      로그인한 계정: {user.email || '(이메일 없음)'}
    </p>
  );
}
