'use client';

import { useSignOut } from '@/domains/admin/hooks/useSignOut';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { LogOutIcon } from 'lucide-react';

/**
 * 비밀번호를 꼭 바꿔야 하는 사람의 나가는 길 — 왼쪽 메뉴의 «로그아웃»(UserMenu)과 같은 Server Action(signOut)이다.
 * 쓰던 내용 임시 보관 · 최근 검색 조건도 UserMenu 처럼 지운다(설계 6.10 — 공용 PC 에 남기지 않는다).
 */
export const LogoutButton = ({ userId }: { userId: string }) => {
  const { pending, signOut } = useSignOut(userId);
  return (
    <Button variant="link" disabled={pending} onClick={signOut}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <LogOutIcon data-icon="inline-start" aria-hidden />
      )}
      로그아웃
    </Button>
  );
};
