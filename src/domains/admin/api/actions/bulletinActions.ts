'use server';

import { BULLETINS_TAG } from '@/domains/news/api/newsTags';
import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { addDays, seoulToday, upcomingSunday } from '../../lib/content';
import { uuidV7 } from '../../lib/fileUpload';
import { bulletinCreateSchema, bulletinUpdateSchema } from '../../lib/input/bulletinInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { copyFileList, writeFileList } from '../server/fileList.server';
import { updateVersioned } from '../server/versionedUpdate.server';

// 주보의 Server Action(설계 6.6 · 6.8 · 6.10). 쓰기는 로그인한 사람의 세션 — RLS 와 guard_content(휴지통은 «삭제» 권한)가 다시 막는다.
// 쪽은 저장할 때마다 새 묶음에 적고(writeFileList) 주보가 그 묶음을 가리키게 바꾼다 — 저장 전에는 공개 화면이 그대로다.
// 저장하면 관리자 화면과 공개 주보(태그)를 갱신한다 — 공개 화면의 다음 요청은 새 값을 기다려 받는다(updateTag).

const PATH = '/admin/bulletin';
const DUPLICATE_DATE = '그 날짜의 주보가 이미 있습니다.';
const idSchema = z.object({ id: z.uuid() });

const changed = () => {
  revalidatePath(PATH, 'layout');
  updateTag(BULLETINS_TAG);
};

const newId = () => uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16)));

const saveError = (error: { code?: string; message?: string } | null, duplicate: string) =>
  error?.code === '23505'
    ? fail('DUPLICATE', { detail: duplicate })
    : { ok: false as const, error: toActionError(error) };

/** 새 주보 — 등록 권한. 임시저장 · 공개 둘 다 여기서 */
export const createBulletin = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('bulletin', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(bulletinCreateSchema, raw);
  if (!input.ok) return input;
  const { date, pages, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const list = await writeFileList(supabase, 'bulletin', pages);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  // id 를 여기서 만든다 — 돌려받지 않아도 상세로 갈 수 있게
  const id = newId();
  const { error } = await supabase
    .from('bulletins')
    .insert({ id, date, pages_list_id: list.data.listId, status });
  if (error) return saveError(error, DUPLICATE_DATE);
  changed();
  return {
    ok: true,
    data: { id },
    message: status === 'PUBLISHED' ? '공개했습니다.' : '임시저장했습니다.',
  };
};

/** 고치기 — 수정 권한. 화면이 열었을 때의 updated_at 이 그대로일 때만(동시 수정 막기) */
export const updateBulletin = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('bulletin', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(bulletinUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, date, pages, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const list = await writeFileList(supabase, 'bulletin', pages);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const res = await updateVersioned(supabase, 'bulletins', id, updatedAt, {
    date,
    pages_list_id: list.data.listId,
    status,
  });
  if (!res.ok)
    return res.error.code === 'DUPLICATE' ? fail('DUPLICATE', { detail: DUPLICATE_DATE }) : res;
  changed();
  return status === 'DRAFT' ? { ...res, message: '임시저장했습니다.' } : res;
};

/** 휴지통 · 복구 — «삭제» 권한(guard_content 도 막는다). 바뀐 줄이 없으면 그사이 누가 먼저 한 것 */
const setTrashed = async (raw: unknown, trashed: boolean): Promise<ActionResult> => {
  if (!(await actionPermission('bulletin', 'DELETE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from('bulletins')
    .update({ deleted_at: trashed ? new Date().toISOString() : null })
    .eq('id', input.data.id);
  const { data, error } = await (
    trashed ? base.is('deleted_at', null) : base.not('deleted_at', 'is', null)
  ).select('id');
  if (error) return saveError(error, '그 날짜의 주보가 이미 있어 복구할 수 없습니다.');
  if (!data?.length) return fail('NOT_FOUND');
  changed();
  return { ok: true, message: trashed ? '휴지통으로 보냈습니다.' : '복구했습니다.' };
};

export const trashBulletin = async (raw: unknown) => setTrashed(raw, true);
export const restoreBulletin = async (raw: unknown) => setTrashed(raw, false);

/** 완전 삭제 — «완전 삭제» 권한, 휴지통에 든 것만(RLS 도 같다). 쪽 묶음은 주인 없는 묶음이 되어 예약 작업이 지운다 */
export const purgeBulletin = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('bulletin', 'PURGE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('bulletins')
    .delete()
    .eq('id', input.data.id)
    .not('deleted_at', 'is', null)
    .select('id');
  if (error) return { ok: false, error: toActionError(error) };
  if (!data?.length) return fail('NOT_FOUND');
  revalidatePath(PATH, 'layout');
  return { ok: true, message: '완전히 지웠습니다.' };
};

/** 빈 날짜를 찾을 때 몇 주까지 넘겨 보는가 */
const MAX_WEEKS = 52;

/**
 * 복제해서 새로 쓰기(설계 6.10) — 쪽 묶음을 복사해(같은 Storage 파일) 임시저장으로 만든다. 날짜는 이번 주일과
 * 원본 다음 주일 중 늦은 날, 그 날짜에 이미 주보가 있으면 비는 주일까지 넘긴다(같은 날짜에 하나).
 */
export const duplicateBulletin = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('bulletin', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: source } = await supabase
    .from('bulletins')
    .select('date, pages_list_id')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!source) return fail('NOT_FOUND');
  const thisWeek = upcomingSunday(seoulToday(Date.now()));
  // 원본 다음 주일(평일 호 — 성탄절 등 — 를 복제해도 주일로)
  const next = upcomingSunday(addDays(source.date, 1));
  const start = next > thisWeek ? next : thisWeek;
  const { data: rows } = await supabase
    .from('bulletins')
    .select('date')
    .gte('date', start)
    .is('deleted_at', null);
  const taken = new Set((rows ?? []).map(r => r.date));
  let date = start;
  for (let i = 0; i < MAX_WEEKS && taken.has(date); i++) date = addDays(date, 7);

  const list = await copyFileList(supabase, source.pages_list_id);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const id = newId();
  const { error } = await supabase
    .from('bulletins')
    .insert({ id, date, pages_list_id: list.data.listId, status: 'DRAFT' });
  if (error) return saveError(error, DUPLICATE_DATE);
  revalidatePath(PATH, 'layout');
  return { ok: true, data: { id }, message: '복제했습니다.' };
};
