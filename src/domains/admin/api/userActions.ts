'use server';

import { type AppError, appError, fail } from '@/shared/api/result';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import { generateTempPassword } from './tempPassword';
import { userCreateSchema, userUpdateSchema } from './userInput';

const NO_SECRET =
  '계정 만들기 설정(SUPABASE_SECRET_KEY)이 되어 있지 않습니다. 개발 담당자에게 알려 주세요.';
const LIST = '/admin/users';

/**
 * 계정 만들기(설계 6.10 · 11-1). 계정 자체는 만능 키로만 만들 수 있고(가입이 막혀 있다), 그룹은 **로그인한 사람의 세션**으로
 * 넣는다 — 그래야 DB 가 «자기 권한보다 많은 그룹에는 넣을 수 없다» 를 막는다. 그룹을 넣지 못하면 만든 계정을 지운다.
 * 임시 비밀번호는 이 응답으로 한 번만 돌려준다(어디에도 저장하지 않는다). 첫 로그인 때 바꾸게 된다.
 */
export const createUser = async (
  raw: unknown
): Promise<ActionResult<{ id: string; tempPassword: string }>> => {
  if (!(await actionPermission('users', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(userCreateSchema, raw);
  if (!input.ok) return input;
  // 그룹 넣기 · 부서 지정은 DB 가 «사용자 수정» 권한으로 판정한다(user_groups · profiles 행 권한) —
  // 계정을 만들었다가 되돌리지 않게 먼저 같은 판정을 한다
  const assigns = input.data.groupIds.length > 0 || input.data.department !== null;
  if (assigns && !(await actionPermission('users', 'UPDATE'))) return NO_PERMISSION;
  const admin = createSupabaseAdminClient();
  if (!admin) return fail('NOT_CONFIGURED', { detail: NO_SECRET });

  const tempPassword = generateTempPassword();
  const created = await admin.auth.admin.createUser({
    email: input.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: input.data.name },
  });
  const id = created.data.user?.id;
  if (created.error || !id) {
    // 이메일이 이미 있으면 그 칸의 문장으로(중복), 그 밖은 INTERNAL(원인은 서버 로그에)
    if (created.error?.code === 'email_exists')
      return fail('DUPLICATE', { fields: { email: ['이미 있는 이메일입니다.'] } });
    console.error('[createUser] Auth API', created.error);
    return { ok: false, error: toActionError(null) };
  }

  const supabase = await createSupabaseServerClient();
  const rollback = async (error: AppError) => {
    const removed = await admin.from('profiles').delete().eq('id', id);
    const deleted = await admin.auth.admin.deleteUser(id);
    if (removed?.error || deleted?.error)
      console.error(
        '[createUser] 되돌리기 실패 — 계정이 남았을 수 있다',
        id,
        removed?.error,
        deleted?.error
      );
    return { ok: false as const, error };
  };
  if (input.data.groupIds.length > 0) {
    const { error } = await supabase
      .from('user_groups')
      .insert(input.data.groupIds.map(group_id => ({ user_id: id, group_id })));
    if (error) return rollback(toActionError(error));
  }
  if (input.data.department) {
    // 행 권한이 거르면 오류 없이 0줄이다 — 조용히 부서 없이 «만들었습니다» 로 끝나지 않게 바뀐 줄을 받아 본다
    const { data, error } = await supabase
      .from('profiles')
      .update({ department: input.data.department })
      .eq('id', id)
      .select('id');
    if (error) return rollback(toActionError(error));
    if (!data?.length) return rollback(appError('NO_PERMISSION'));
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
  if (!(await actionPermission('users', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(userUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, name, department, isActive, groupIds, seenGroupIds } = input.data;
  const supabase = await createSupabaseServerClient();
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
 * 목록에서 고른 사용자를 한꺼번에 끄거나 켠다(설계 6.10 «줄 체크 일괄 처리»). 한 명씩 로그인한 사람의 세션으로 고치므로
 * 자기 계정 · «전체 관리» 구성원(전체 관리가 아닐 때) · 마지막 관리자는 DB 가 막는다 — 막힌 건수와 첫 사유를 알린다.
 */
export const setUsersActive = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('users', 'UPDATE'))) return NO_PERMISSION;
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
    if (error) firstError ??= toActionError(error);
    else done += 1;
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
