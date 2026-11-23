import { describe, expect, it } from 'vitest';

import { canEditUser } from './userAccess';

describe('canEditUser — 사용자 상세의 [수정] · 수정 화면을 열지', () => {
  it('사용자 수정 권한이 없으면 아무도 고치지 못한다', () => {
    expect(canEditUser({ canUpdate: false, isSelf: true, canManage: true })).toBe(false);
  });

  it('다른 사람은 관리할 수 있을 때만(can_manage_user — 대상의 그룹이 모두 내 그룹 · 내 부서 범위)', () => {
    expect(canEditUser({ canUpdate: true, isSelf: false, canManage: true })).toBe(true);
    expect(canEditUser({ canUpdate: true, isSelf: false, canManage: false })).toBe(false);
  });

  it('자기 자신은 이름을 고칠 수 있다(can_manage_user 는 자기 자신에게 늘 거짓)', () => {
    expect(canEditUser({ canUpdate: true, isSelf: true, canManage: false })).toBe(true);
  });
});
