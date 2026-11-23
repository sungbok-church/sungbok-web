// 사용자 상세의 [수정] · 수정 화면을 열지(설계 6.4). 다른 사람은 관리할 수 있을 때만(can_manage_user — 대상의 그룹이 모두 내 그룹이고
// 내 부서 범위 안, «전체 관리» 는 누구든) — DB 의 guard_profiles 가 같은 기준으로 막는다. 자기 자신은 이름을 고칠 수 있다
// (끄기 · 부서 · 그룹은 DB 가 막는다).

export const canEditUser = ({
  canUpdate,
  isSelf,
  canManage,
}: {
  /** 사용자 메뉴의 «수정» 권한 */
  canUpdate: boolean;
  /** 대상이 로그인한 사람 자신인가 */
  isSelf: boolean;
  /** can_manage_user(대상) — 자기 자신에게는 늘 거짓 */
  canManage: boolean;
}): boolean => canUpdate && (isSelf || canManage);
