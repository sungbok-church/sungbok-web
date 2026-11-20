'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import { type ActionResult, parseInput } from './actionResult';
import { passwordInputSchema } from './passwordInput';
import { requireAdminUser } from './session.server';

const AUTH_ERRORS: Record<string, string> = {
  same_password: '지금 비밀번호와 다른 비밀번호로 정해 주세요.',
  weak_password: '더 길거나 쉽게 짐작하기 어려운 비밀번호로 정해 주세요.',
};

/**
 * 로그인한 사람이 자기 비밀번호를 바꾼다. 첫 로그인 · 비밀번호 초기화 뒤에는 이것부터 해야 한다(설계 11-1).
 * 바꾸면 «비밀번호를 바꿔야 함» 표시를 끈다 — 자기 행의 이 칸만은 사용자 수정 권한 없이도 DB 가 허용한다.
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
  await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
  return { ok: true, message: '비밀번호를 바꿨습니다.' };
};
