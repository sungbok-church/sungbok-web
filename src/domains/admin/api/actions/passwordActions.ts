'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import { type ActionResult, parseInput } from '../../lib/actionResult';
import { passwordInputSchema } from '../../lib/input/passwordInput';
import { requireAdminUser } from '../server/session.server';

const AUTH_ERRORS: Record<string, string> = {
  same_password: '지금 비밀번호와 다른 비밀번호로 정해 주세요.',
  weak_password: '더 길거나 쉽게 짐작하기 어려운 비밀번호로 정해 주세요.',
};

/**
 * 로그인한 사람이 자기 비밀번호를 바꾼다. 첫 로그인 · 비밀번호 초기화 뒤에는 이것부터 해야 한다(설계 11-1).
 * 바꾸면 «비밀번호를 바꿔야 함» 표시를 끈다 — 자기 행의 이 칸만은 사용자 수정 권한 없이도 DB 가 허용한다.
 * 지금 비밀번호는 묻지 않는다 — 로그인한 세션이 곧 본인 확인이다. 비밀번호 찾기 메일의 링크로 들어온 사람도 이 세션으로 바꾼다
 * (Supabase 의 secure_password_change 를 켜도 링크 로그인은 «방금 로그인» 이라 통과한다).
 * 바꾼 뒤 같은 계정의 다른 기기 로그인을 끊는다(scope 'others' — 이 기기는 남는다). 잃어버린 비밀번호로 누가 들어와 있었다면 여기서 끊긴다.
 */
export const changePassword = async (raw: unknown): Promise<ActionResult> => {
  const user = await requireAdminUser();
  const input = parseInput(passwordInputSchema, raw);
  if (!input.ok) return input;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: input.data.password });
  if (error) {
    const reason = AUTH_ERRORS[error.code ?? ''];
    // 비밀번호 규칙에 걸린 것은 그 칸의 문장으로, 그 밖(연결 · 서버)은 INTERNAL
    return reason ? fail('INVALID_INPUT', { fields: { password: [reason] } }) : fail('INTERNAL');
  }
  // 비밀번호가 바뀐 바로 뒤에 다른 기기 로그인을 끊는다 — 아래 표시 끄기가 실패해도 옛 비밀번호로 들어와 있던 기기는 끊겨야 한다
  try {
    await supabase.auth.signOut({ scope: 'others' });
  } catch {
    // 비밀번호는 이미 바뀌었다 — 끊기에 실패했다고 실패로 알리지 않는다
  }
  const marked = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);
  if (marked?.error) {
    // 비밀번호는 이미 바뀌었다 — 성공으로 알리면 다음 화면에서 다시 이 화면으로 돌아와 같은 비밀번호로 막힌다
    console.error('[changePassword] «바꿔야 함» 표시를 끄지 못함', marked.error);
    return fail('INTERNAL', {
      detail:
        '비밀번호는 바꿨지만 마무리하지 못했습니다. 잠시 뒤 지금과 다른 새 비밀번호로 한 번 더 바꿔 주세요.',
    });
  }
  return { ok: true, message: '비밀번호를 바꿨습니다.' };
};
