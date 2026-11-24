'use server';

import { ALBUMS_TAG } from '@/domains/news/api/newsTags';
import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { uuidV7 } from '../../lib/fileUpload';
import { albumCreateSchema, albumUpdateSchema } from '../../lib/input/albumInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { purgeRow, setTrashed } from '../server/contentState.server';
import { copyFileList, writeFileList } from '../server/fileList.server';
import { updateVersioned } from '../server/versionedUpdate.server';

// 교회앨범의 Server Action(패키지 B3) — 주보와 같은 방식: 그림은 저장할 때마다 새 묶음에 적고(writeFileList) 앨범이 그 묶음을
// 가리키게 바꾼다. 공개 주소 번호(slug)는 DB 가 매긴다(새 글은 1000 부터). 저장하면 관리자 화면과 공개 앨범(태그)을 갱신한다.

const PATH = '/admin/album';
const idSchema = z.object({ id: z.uuid() });

const changed = () => {
  revalidatePath(PATH, 'layout');
  updateTag(ALBUMS_TAG);
};

const newId = () => uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16)));

export const createAlbum = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('album', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(albumCreateSchema, raw);
  if (!input.ok) return input;
  const { title, categoryId, images, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const list = await writeFileList(supabase, 'album', images);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const id = newId();
  const { error } = await supabase.from('albums').insert({
    id,
    title,
    category_id: categoryId,
    images_list_id: list.data.listId,
    status,
  });
  if (error) return { ok: false, error: toActionError(error) };
  changed();
  return {
    ok: true,
    data: { id },
    message: status === 'PUBLISHED' ? '공개했습니다.' : '임시저장했습니다.',
  };
};

export const updateAlbum = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('album', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(albumUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, title, categoryId, images, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const list = await writeFileList(supabase, 'album', images);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const res = await updateVersioned(supabase, 'albums', id, updatedAt, {
    title,
    category_id: categoryId,
    images_list_id: list.data.listId,
    status,
  });
  if (!res.ok) return res;
  changed();
  return status === 'DRAFT' ? { ...res, message: '임시저장했습니다.' } : res;
};

const trashOrRestore = async (raw: unknown, trashed: boolean): Promise<ActionResult> => {
  if (!(await actionPermission('album', 'DELETE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const res = await setTrashed(
    await createSupabaseServerClient(),
    'albums',
    input.data.id,
    trashed,
    {},
    '같은 주소 번호의 앨범이 있어 복구할 수 없습니다.'
  );
  if (res.ok) changed();
  return res;
};

export const trashAlbum = async (raw: unknown) => trashOrRestore(raw, true);
export const restoreAlbum = async (raw: unknown) => trashOrRestore(raw, false);

export const purgeAlbum = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('album', 'PURGE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const res = await purgeRow(await createSupabaseServerClient(), 'albums', input.data.id, {});
  if (res.ok) revalidatePath(PATH, 'layout');
  return res;
};

/** 복제해서 새로 쓰기 — 제목 · 분류 · 그림(같은 Storage 파일을 가리키는 새 묶음)을 복사한 임시저장 */
export const duplicateAlbum = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('album', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: source } = await supabase
    .from('albums')
    .select('title, category_id, images_list_id')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!source) return fail('NOT_FOUND');
  const list = await copyFileList(supabase, source.images_list_id);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const id = newId();
  const { error } = await supabase.from('albums').insert({
    id,
    title: source.title,
    category_id: source.category_id,
    images_list_id: list.data.listId,
    status: 'DRAFT',
  });
  if (error) return { ok: false, error: toActionError(error) };
  revalidatePath(PATH, 'layout');
  return { ok: true, data: { id }, message: '복제했습니다.' };
};
