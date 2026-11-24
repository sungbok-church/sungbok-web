'use server';

import { RESOURCES_TAG } from '@/domains/resources/api/resourceTags';
import { fail } from '@/shared/api/result';
import type { Database } from '@/shared/api/supabase/database.types';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { uuidV7 } from '../../lib/fileUpload';
import type { FileItem } from '../../lib/input/fileInput';
import { resourceCreateSchema, resourceUpdateSchema } from '../../lib/input/resourceInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { purgeRow, setTrashed } from '../server/contentState.server';
import { writeFileList } from '../server/fileList.server';
import { updateVersioned } from '../server/versionedUpdate.server';

// 설교 시트지의 Server Action(패키지 B4) — 원본(PDF · 한글 파일)과 쪽 그림은 각각 저장할 때마다 새 묶음에 적고(주보와 같다),
// 설교 영상(resource_videos)은 바뀐 것만 빼고 넣는다(이력이 «넣음 · 뺌» 만 남게). 저장하면 자료실 · 예배 영상의 시트지 카드(태그)를 갱신한다.

type Client = SupabaseClient<Database>;

const PATH = '/admin/resources';
const idSchema = z.object({ id: z.uuid() });
const VIDEO_DENIED = '저장했습니다. 설교 영상 연결은 수정 권한이 있어야 합니다.';
const VIDEO_FAILED = '저장했습니다. 설교 영상 연결은 저장하지 못했습니다 — 다시 고쳐 주세요.';

const changed = () => {
  revalidatePath(PATH, 'layout');
  updateTag(RESOURCES_TAG);
};

const newId = () => uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16)));

/** 원본(없으면 묶음 없음) · 쪽 그림(늘 — 비어도) 묶음 */
const writeLists = async (
  client: Client,
  file: FileItem[],
  pages: FileItem[]
): Promise<ActionResult<{ fileListId: string | null; pagesListId: string }>> => {
  const fileList = file.length > 0 ? await writeFileList(client, 'resources', file) : null;
  if (fileList && (!fileList.ok || !fileList.data))
    return fileList.ok ? fail('INTERNAL') : fileList;
  const pagesList = await writeFileList(client, 'resources', pages);
  if (!pagesList.ok || !pagesList.data) return pagesList.ok ? fail('INTERNAL') : pagesList;
  return {
    ok: true,
    data: { fileListId: fileList?.data?.listId ?? null, pagesListId: pagesList.data.listId },
  };
};

/** 설교 영상 연결을 ids 로 맞춘다 — 없어진 것만 빼고 새 것만 넣는다. 권한에 막히면 false */
const syncVideos = async (
  client: Client,
  resourceId: string,
  ids: string[]
): Promise<{ ok: true } | { ok: false; denied: boolean; error: unknown }> => {
  const { data: rows, error: readError } = await client
    .from('resource_videos')
    .select('video_id')
    .eq('resource_id', resourceId);
  // 못 읽었으면 있는 영상을 다시 넣다 겹친다 — 여기서 멈춘다
  if (readError) return { ok: false, denied: readError.code === '42501', error: readError };
  const before = (rows ?? []).map(r => r.video_id);
  const removed = before.filter(v => !ids.includes(v));
  const added = ids.filter(v => !before.includes(v));
  if (removed.length) {
    const { error } = await client
      .from('resource_videos')
      .delete()
      .eq('resource_id', resourceId)
      .in('video_id', removed);
    if (error) return { ok: false, denied: error.code === '42501', error };
  }
  if (added.length) {
    const { error } = await client
      .from('resource_videos')
      .insert(added.map(video_id => ({ resource_id: resourceId, video_id })));
    if (error) return { ok: false, denied: error.code === '42501', error };
  }
  return { ok: true };
};

export const createResource = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('resources', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(resourceCreateSchema, raw);
  if (!input.ok) return input;
  const { section, seriesId, episode, title, date, year, passage, file, pages, videoIds, status } =
    input.data;
  // 영상 연결은 수정 권한이 있거나 자기 임시저장 글일 때만 된다(DB) — 반쯤 저장되지 않게 쓰기 전에 막는다
  if (
    status === 'PUBLISHED' &&
    videoIds.length > 0 &&
    !(await actionPermission('resources', 'UPDATE'))
  )
    return fail('INVALID_INPUT', {
      fields: {
        videos: [
          '설교 영상을 이어 공개하려면 수정 권한이 있어야 합니다. 임시저장으로 올려 주세요.',
        ],
      },
    });
  const supabase = await createSupabaseServerClient();
  const lists = await writeLists(supabase, file, pages);
  if (!lists.ok || !lists.data) return lists.ok ? fail('INTERNAL') : lists;
  const id = newId();
  const { error } = await supabase.from('resources').insert({
    id,
    section,
    series_id: seriesId,
    episode,
    title,
    date,
    year,
    passage,
    file_list_id: lists.data.fileListId,
    pages_list_id: lists.data.pagesListId,
    status,
  });
  if (error) return { ok: false, error: toActionError(error) };
  const videos = await syncVideos(supabase, id, videoIds);
  changed();
  if (!videos.ok) {
    // 시트지는 이미 저장됐다 — 실패로 돌려주면 다시 누를 때 같은 시트지가 또 생긴다
    if (!videos.denied) console.error('[resource videos]', videos.error);
    return { ok: true, data: { id }, message: videos.denied ? VIDEO_DENIED : VIDEO_FAILED };
  }
  return {
    ok: true,
    data: { id },
    message: status === 'PUBLISHED' ? '공개했습니다.' : '임시저장했습니다.',
  };
};

export const updateResource = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('resources', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(resourceUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, section, seriesId, episode, title, date, year, passage, file, pages } =
    input.data;
  const { videoIds, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const lists = await writeLists(supabase, file, pages);
  if (!lists.ok || !lists.data) return lists.ok ? fail('INTERNAL') : lists;
  const res = await updateVersioned(supabase, 'resources', id, updatedAt, {
    section,
    series_id: seriesId,
    episode,
    title,
    date,
    year,
    passage,
    file_list_id: lists.data.fileListId,
    pages_list_id: lists.data.pagesListId,
    status,
  });
  if (!res.ok) return res;
  const videos = await syncVideos(supabase, id, videoIds);
  changed();
  if (!videos.ok) {
    // 시트지는 이미 저장됐다 — 실패로 돌려주면 폼이 옛 수정 시각으로 남아 다시 누를 때 충돌이 난다
    if (!videos.denied) console.error('[resource videos]', videos.error);
    return { ...res, message: VIDEO_FAILED };
  }
  return status === 'DRAFT' ? { ...res, message: '임시저장했습니다.' } : res;
};

const trashOrRestore = async (raw: unknown, trashed: boolean): Promise<ActionResult> => {
  if (!(await actionPermission('resources', 'DELETE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const res = await setTrashed(
    await createSupabaseServerClient(),
    'resources',
    input.data.id,
    trashed,
    {},
    '같은 주소 번호의 자료가 있어 복구할 수 없습니다.'
  );
  if (res.ok) changed();
  return res;
};

export const trashResource = async (raw: unknown) => trashOrRestore(raw, true);
export const restoreResource = async (raw: unknown) => trashOrRestore(raw, false);

export const purgeResource = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('resources', 'PURGE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const res = await purgeRow(await createSupabaseServerClient(), 'resources', input.data.id, {});
  if (res.ok) revalidatePath(PATH, 'layout');
  return res;
};

/**
 * 복제해서 새로 쓰기 — 분류 · 묶음 · 제목 · 본문을 복사하고 회차는 다음 회. 날짜 · 파일 · 영상은 비운 임시저장
 * (시트지는 회차마다 내용 · 파일이 다르다).
 */
export const duplicateResource = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('resources', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: source } = await supabase
    .from('resources')
    .select('section, series_id, episode, title, passage')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!source) return fail('NOT_FOUND');
  const pages = await writeFileList(supabase, 'resources', []);
  if (!pages.ok || !pages.data) return pages.ok ? fail('INTERNAL') : pages;
  const id = newId();
  const { error } = await supabase.from('resources').insert({
    id,
    section: source.section,
    series_id: source.series_id,
    episode: source.episode ? source.episode + 1 : null,
    title: source.title,
    date: null,
    year: null,
    passage: source.passage,
    file_list_id: null,
    pages_list_id: pages.data.listId,
    status: 'DRAFT',
  });
  if (error) return { ok: false, error: toActionError(error) };
  revalidatePath(PATH, 'layout');
  return { ok: true, data: { id }, message: '복제했습니다.' };
};
