'use client';

// 로그아웃 — 왼쪽 메뉴(UserMenu)와 비밀번호를 꼭 바꿔야 하는 화면(LogoutButton)이 같이 쓴다.
// 쓰던 내용 임시 보관 · 최근 검색 조건은 공용 PC 에 남지 않게 먼저 지운다(설계 6.10).
import { useTransition } from 'react';

import { signOut as signOutAction } from '../api/actions/authActions';
import { clearDrafts } from '../lib/formDraft';
import { clearRecentSearches } from '../lib/recentSearches';

export const useSignOut = (userId: string) => {
  const [pending, startTransition] = useTransition();
  const signOut = () =>
    startTransition(() => {
      clearDrafts(window.localStorage, userId);
      clearRecentSearches(window.localStorage, userId);
      return signOutAction();
    });
  return { pending, signOut };
};
