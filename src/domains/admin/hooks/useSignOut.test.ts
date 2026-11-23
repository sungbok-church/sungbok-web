import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { draftKey, writeDraft } from '../lib/formDraft';
import { pushRecentSearch, recentKey } from '../lib/recentSearches';
import { useSignOut } from './useSignOut';

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../api/actions/authActions', () => ({ signOut }));

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('useSignOut — 로그아웃(왼쪽 메뉴 · 비밀번호 변경 화면이 같이 쓴다)', () => {
  it('그 사용자의 임시 보관 · 최근 검색을 지우고 로그아웃한다 — 다른 사람 것은 남긴다', async () => {
    writeDraft(window.localStorage, draftKey('u1', 'groups:new'), { name: '가' }, Date.now());
    writeDraft(window.localStorage, draftKey('u2', 'groups:new'), { name: '나' }, Date.now());
    pushRecentSearch(window.localStorage, recentKey('u1', '/admin/users'), {
      query: 'q=a',
      label: '검색: a',
    });
    const { result } = renderHook(() => useSignOut('u1'));
    await act(async () => result.current.signOut());
    expect(window.localStorage.getItem(draftKey('u1', 'groups:new'))).toBeNull();
    expect(window.localStorage.getItem(recentKey('u1', '/admin/users'))).toBeNull();
    expect(window.localStorage.getItem(draftKey('u2', 'groups:new'))).not.toBeNull();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
