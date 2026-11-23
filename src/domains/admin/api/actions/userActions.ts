'use server';

import { type AppError, appError, fail } from '@/shared/api/result';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { loadMyGroups, loadSystemGroupIds } from '../server/myGroups.server';
import { type MyGroups, outsideGroups, touchesSystemGroup } from '../../lib/groupScope';
import { generateTempPassword } from '../../lib/tempPassword';
import { userCreateSchema, userUpdateSchema } from '../../lib/input/userInput';

const NO_SECRET =
  '계정 만들기 설정(SUPABASE_SECRET_KEY)이 되어 있지 않습니다. 개발 담당자에게 알려 주세요.';
const LIST = '/admin/users';
const DEPARTMENT_SCOPE = '부서는 내 담당 부서로만 정할 수 있습니다.';
const OWN_GROUPS_ONLY = '내가 속한 그룹에만 넣고 뺄 수 있습니다.';
const SYSTEM_LOCKED = '«전체 관리» 소속은 화면에서 바꿀 수 없습니다.';
const NOT_MANAGEABLE = '내가 관리할 수 없는 사용자는 바꾸지 않았습니다';

/**
 * «전체 관리» 소속은 화면에서 아무도 — «전체 관리» 도 — 넣고 빼지 않는다(설계 6.4 — DB 의 guard_user_groups 가 다시 막는다).
 * «전체 관리» 계정을 빼앗겨도 새 «전체 관리» 를 만들지 못하게. 소속은 운영자가 대시보드 SQL 편집기로만 바꾼다.
 */
const checkSystemGroup = (systemIds: readonly string[], before: string[], after: string[]) =>
  touchesSystemGroup(systemIds, before, after)
    ? fail('NOT_ALLOWED', { detail: SYSTEM_LOCKED, fields: { groupIds: [SYSTEM_LOCKED] } })
    : null;

/**
 * «전체 관리» 가 아니면 내가 속한 그룹에만 넣고 뺀다(설계 6.4 ② — DB 의 guard_user_groups 가 다시 막는다). before → after 에서
 * 바뀐 그룹 중 내 그룹이 아닌 것이 있으면 그 칸의 오류. 대상이 이미 속한 남의 그룹은 그대로 두면 괜찮다.
 */
const checkOwnGroups = (mine: MyGroups, before: string[], after: string[]) =>
  outsideGroups(mine, before, after).length > 0
    ? fail('NOT_ALLOWED', { detail: OWN_GROUPS_ONLY, fields: { groupIds: [OWN_GROUPS_ONLY] } })
    : null;

/**
 * 계정 만들기(설계 6.10 · 11-1). 계정 자체는 만능 키로만 만들 수 있고(가입이 막혀 있다), 그룹은 **로그인한 사람의 세션**으로
 * 넣는다 — 그래야 DB 가 «내가 속한 그룹에만 넣는다» 를 막는다. 계정을 만들었다가 되돌리지 않게 그 규칙은 Auth API 전에도 본다.
 * 그룹을 넣지 못하면 만든 계정을 지운다.
 * 임시 비밀번호는 이 응답으로 한 번만 돌려준다(어디에도 저장하지 않는다). 첫 로그인 때 바꾸게 된다.
 * 부서는 계정을 만들 때 함께 정한다(user_metadata.department — DB 가 사용자 정보를 만들며 넣고, 그 뒤 바뀐 metadata 는 보지 않는다).
 * 만능 키라 DB 가 거르지 못하므로, 부서 범위가 있는 사람(«전체 관리» 아님 · 담당 부서 있음)이 내 부서로만 만드는지는 Auth API 를
 * 부르기 전에 여기서 확인한다(설계 6.4 ⑤). 부서가 처음부터 정해져 있어 그 사람의 세션으로 바로 그룹을 넣는다.
 */
export const createUser = async (
  raw: unknown
): Promise<ActionResult<{ id: string; tempPassword: string }>> => {
  const ctx = await actionPermission('users', 'CREATE');
  if (!ctx) return NO_PERMISSION;
  const input = parseInput(userCreateSchema, raw);
  if (!input.ok) return input;
  const { groupIds } = input.data;
  const withGroups = groupIds.length > 0;
  const supabase = await createSupabaseServerClient();
  // 서로 기대지 않는 확인 재료 — 함께 읽는다(그룹을 고르지 않았으면 그룹 쪽은 읽지 않는다)
  const [scope, canUpdate, systemIds, mine] = await Promise.all([
    supabase.rpc('my_department_limit'),
    withGroups ? actionPermission('users', 'UPDATE') : null,
    withGroups ? loadSystemGroupIds() : [],
    withGroups ? loadMyGroups(ctx.user.id) : null,
  ]);
  if (scope.error) return { ok: false, error: toActionError(scope.error) };
  if (scope.data && input.data.department !== scope.data)
    return fail('NOT_ALLOWED', {
      detail: DEPARTMENT_SCOPE,
      fields: { department: [DEPARTMENT_SCOPE] },
    });
  // 그룹 넣기는 DB 가 «사용자 수정» 권한 · 내 그룹인지로 판정한다(user_groups 행 권한 · guard_user_groups) — 계정을 만들었다가
  // 되돌리지 않게 먼저 같은 판정을 한다. 그룹 없이 만들면 «등록» 만으로 된다(부서는 계정과 함께 생긴다)
  if (withGroups) {
    if (!canUpdate || !mine) return NO_PERMISSION;
    const system = checkSystemGroup(systemIds, [], groupIds);
    if (system) return system;
    const outside = checkOwnGroups(mine, [], groupIds);
    if (outside) return outside;
  }
  const admin = createSupabaseAdminClient();
  if (!admin) return fail('NOT_CONFIGURED', { detail: NO_SECRET });

  const tempPassword = generateTempPassword();
  const created = await admin.auth.admin.createUser({
    email: input.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: input.data.name, department: input.data.department },
  });
  const id = created.data.user?.id;
  if (created.error || !id) {
    // 이메일이 이미 있으면 그 칸의 문장으로(중복), 그 밖은 INTERNAL(원인은 서버 로그에)
    if (created.error?.code === 'email_exists')
      return fail('DUPLICATE', { fields: { email: ['이미 있는 이메일입니다.'] } });
    console.error('[createUser] Auth API', created.error);
    return { ok: false, error: toActionError(null) };
  }

  if (withGroups) {
    const { error } = await supabase
      .from('user_groups')
      .insert(groupIds.map(group_id => ({ user_id: id, group_id })));
    if (error) {
      const removed = await admin.from('profiles').delete().eq('id', id);
      const deleted = await admin.auth.admin.deleteUser(id);
      if (removed?.error || deleted?.error)
        console.error(
          '[createUser] 되돌리기 실패 — 계정이 남았을 수 있다',
          id,
          removed?.error,
          deleted?.error
        );
      return { ok: false, error: toActionError(error) };
    }
  }

  revalidatePath(LIST);
  return { ok: true, data: { id, tempPassword }, message: '계정을 만들었습니다.' };
};

/**
 * 사용자 고치기 — 이름 · 부서 · 사용 여부 · 그룹을 한 번에, 한 트랜잭션으로(save_user). 로그인한 사람의 권한으로 돈다
 * (권한 올리기 방지는 DB 가 한다) — 하나라도 막히면 아무것도 저장하지 않는다. 화면을 열었을 때의 updated_at 과 그룹 목록이
 * 지금과 다르면(다른 사람이 먼저 고침) 저장하지 않는다(CONFLICT).
 */
export const updateUser = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  const ctx = await actionPermission('users', 'UPDATE');
  if (!ctx) return NO_PERMISSION;
  const input = parseInput(userUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, name, department, isActive, groupIds, seenGroupIds } = input.data;
  // 화면을 열었을 때의 그룹(seenGroupIds)에서 바뀐 것만 본다 — 그 사이 바뀌었으면 save_user 가 «충돌» 로 막는다
  const [systemIds, mine, supabase] = await Promise.all([
    loadSystemGroupIds(),
    loadMyGroups(ctx.user.id),
    createSupabaseServerClient(),
  ]);
  const system = checkSystemGroup(systemIds, seenGroupIds, groupIds);
  if (system) return system;
  const outside = checkOwnGroups(mine, seenGroupIds, groupIds);
  if (outside) return outside;
  const { data, error } = await supabase.rpc('save_user', {
    p_id: id,
    p_updated_at: updatedAt,
    p_name: name,
    // 생성 타입은 null 을 모르지만 SQL 은 받는다(부서 없음 = 모든 부서)
    p_department: department as NonNullable<typeof department>,
    p_is_active: isActive,
    p_group_ids: groupIds,
    p_seen_group_ids: seenGroupIds,
  });
  if (error) return { ok: false, error: toActionError(error) };
  if (!data) return fail('CONFLICT');
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, data: { updatedAt: data }, message: '저장했습니다.' };
};

/**
 * 비밀번호 초기화 — 새 임시 비밀번호를 만들어 한 번 돌려주고, 다음 로그인 때 바꾸게 한다.
 * 비밀번호 자체는 만능 키(Auth API)로 바꾸므로 DB 트리거가 막지 못한다 — 먼저 `can_manage_user` 로 확인한다
 * («전체 관리» 구성원은 «전체 관리» 만, 자기 자신은 이 화면이 아니라 «비밀번호 바꾸기» 로).
 */
export const resetPassword = async (
  userId: string
): Promise<ActionResult<{ tempPassword: string }>> => {
  if (!(await actionPermission('users', 'UPDATE'))) return NO_PERMISSION;
  if (!z.uuid().safeParse(userId).success) return fail('NOT_FOUND');
  const supabase = await createSupabaseServerClient();
  const { data: allowed, error: checkError } = await supabase.rpc('can_manage_user', {
    p_target: userId,
  });
  if (checkError || allowed !== true) return fail('NO_PERMISSION');
  const admin = createSupabaseAdminClient();
  if (!admin) return fail('NOT_CONFIGURED', { detail: NO_SECRET });

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) {
    console.error('[resetPassword] Auth API', error);
    return { ok: false, error: toActionError(null) };
  }
  // 로그인한 사람의 세션으로 — 변경 이력에 «누가 초기화했는지» 가 남는다. 실패하면 첫 로그인 때 바꾸라는 안내만 빠진다(로그만)
  const marked = await supabase
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', userId);
  if (marked?.error) console.error('[resetPassword] 비밀번호 바꾸기 표시 실패', marked.error);

  revalidatePath(`${LIST}/${userId}`);
  return { ok: true, data: { tempPassword }, message: '비밀번호를 초기화했습니다.' };
};

const bulkSchema = z.object({ ids: z.array(z.uuid()).min(1).max(100), active: z.boolean() });

/**
 * 목록에서 고른 사용자를 한꺼번에 끄거나 켠다(설계 6.10 «줄 체크 일괄 처리»). 한 명씩 로그인한 사람의 세션으로 고친다.
 * 관리할 수 있는지(can_manage_user — 남의 그룹 사람 · 내 부서 범위 밖 · «전체 관리» 구성원은 아니다)는 DB 의 guard_profiles 가
 * 줄마다 본다 — 다른 사람의 줄이 막히면(42501) «내가 관리할 수 없는 사용자» 로 건너뛴다. 자기 계정 · 마지막 관리자도 DB 가 막는다
 * (그 문장 그대로) — 막힌 건수와 첫 사유를 알린다.
 */
export const setUsersActive = async (raw: unknown): Promise<ActionResult> => {
  const ctx = await actionPermission('users', 'UPDATE');
  if (!ctx) return NO_PERMISSION;
  const input = parseInput(bulkSchema, raw);
  if (!input.ok) return fail('NOT_FOUND');
  const supabase = await createSupabaseServerClient();
  let done = 0;
  let firstError: AppError | null = null;
  // 한 명씩 차례로 고친다 — 한꺼번에 보내면 최대 100건이 동시에 나간다(«전체 관리» 가 한 명은 남는지는 DB 가 잠금을 걸고 차례로 본다)
  for (const id of input.data.ids) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: input.data.active })
      .eq('id', id);
    if (!error) done += 1;
    // 자기 자신은 DB 의 문장 그대로(«자기 계정은 끌 수 없습니다»)
    else if (error.code === '42501' && id !== ctx.user.id)
      firstError ??= appError('NOT_ALLOWED', { detail: NOT_MANAGEABLE });
    else firstError ??= toActionError(error);
  }
  // 목록에서도, 상세의 [끄기] · [켜기] 에서도 부른다 — 화면이 router.refresh 없이 바뀌게 둘 다 다시 그린다
  // 실패했어도 다시 그린다 — 실패는 대개 그 사이 바뀐 상태(다른 관리자가 먼저 끔 등) 때문이라 지금 값을 보여 줘야 한다
  revalidatePath(LIST);
  for (const id of input.data.ids) revalidatePath(`${LIST}/${id}`);
  const verb = input.data.active ? '켰습니다' : '껐습니다';
  const failed = input.data.ids.length - done;
  if (done === 0) return { ok: false, error: firstError ?? appError('INTERNAL') };
  return {
    ok: true,
    message:
      failed > 0
        ? `${done}명을 ${verb}. ${failed}명은 바꾸지 못했습니다(${firstError?.message}).`
        : `${done}명을 ${verb}.`,
  };
};
