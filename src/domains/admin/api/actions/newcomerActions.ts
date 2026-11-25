'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { newcomerUpdateSchema } from '../../lib/input/newcomerAdminInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { updateVersioned } from '../server/versionedUpdate.server';

// 새가족 접수함의 Server Action(패키지 C3, 설계 6.11) — 처리 상태 · 메모만 고친다. 상태가 바뀌면 처리한 사람 · 시각을 남긴다
// («접수» 로 되돌리면 비운다). 개인정보라 휴지통 없이 «완전 삭제» 권한으로 바로 지운다(1년이 지나면 예약 작업이 지운다).

const PATH = '/admin/newcomers';

export const updateNewcomer = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  const ctx = await actionPermission('newcomers', 'UPDATE');
  if (!ctx) return NO_PERMISSION;
  const input = parseInput(newcomerUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, status, note } = input.data;
  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from('newcomers')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!current) return fail('NOT_FOUND');
  const handled =
    status === 'NEW'
      ? { handled_by: null, handled_at: null }
      : status !== current.status
        ? { handled_by: ctx.user.id, handled_at: new Date().toISOString() }
        : {};
  const res = await updateVersioned(supabase, 'newcomers', id, updatedAt, {
    status,
    note: note || null,
    ...handled,
  });
  if (res.ok) revalidatePath(PATH, 'layout');
  return res;
};

export const purgeNewcomer = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('newcomers', 'PURGE'))) return NO_PERMISSION;
  const input = parseInput(z.object({ id: z.uuid() }), raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('newcomers')
    .delete()
    .eq('id', input.data.id)
    .select('id');
  if (error) return { ok: false, error: toActionError(error) };
  if (!data?.length) return fail('NOT_FOUND');
  revalidatePath(PATH, 'layout');
  return { ok: true, message: '완전히 지웠습니다.' };
};
