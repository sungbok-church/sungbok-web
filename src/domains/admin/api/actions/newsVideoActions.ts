'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { addDays, seoulToday, upcomingSunday } from '../../lib/content';
import { uuidV7 } from '../../lib/fileUpload';
import { newsVideoCreateSchema, newsVideoUpdateSchema } from '../../lib/input/newsVideoInput';
import {
  defaultNewsDate,
  NEWS_FEED_KEYS,
  NEWS_FEEDS,
  type NewsFeedKey,
  youtubeImages,
} from '../../lib/newsFeed';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { purgeRow, setTrashed } from '../server/contentState.server';
import { updateVersioned } from '../server/versionedUpdate.server';
import { hasMaxresThumbnail } from '../server/youtubeThumb.server';

// 주일광고 · 성복의 뜰의 Server Action(패키지 B2) — 한 표(news_videos)를 두 메뉴가 feed 로 나눠 쓴다. 입력의 feed(메뉴 key)로
// 그 메뉴의 권한을 보고, 쓰기 · 고치기 · 지우기는 그 feed 의 글에만 건다(다른 메뉴의 글 id 를 보내면 0줄). RLS 도 feed 로 다시 막는다.
// 저장하면 관리자 화면과 공개 영상 화면(태그 video-page-<메뉴>)을 갱신한다.

const feedSchema = z.object({ feed: z.enum(NEWS_FEED_KEYS as [NewsFeedKey, ...NewsFeedKey[]]) });
const idSchema = feedSchema.extend({ id: z.uuid() });
const DUPLICATE_VIDEO = '이미 등록된 영상입니다.';

const changed = (key: NewsFeedKey) => {
  revalidatePath(NEWS_FEEDS[key].adminPath, 'layout');
  updateTag(NEWS_FEEDS[key].cacheTag);
};

const newId = () => uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16)));

/** 입력의 메뉴 — 모르는 값이면 null */
const feedOf = (raw: unknown): NewsFeedKey | null => {
  const parsed = feedSchema.safeParse(raw);
  return parsed.success ? parsed.data.feed : null;
};

/** 영상 id 로 썸네일 · 표지(큰 표지가 있는지 한 번 묻는다). 영상이 없으면 그림도 없다 */
const imagesFor = async (videoId: string | null) =>
  videoId
    ? youtubeImages(videoId, await hasMaxresThumbnail(videoId))
    : { thumbnail: null, poster: null };

const saveError = (error: { code?: string; message?: string } | null) =>
  error?.code === '23505'
    ? fail('DUPLICATE', { detail: DUPLICATE_VIDEO })
    : { ok: false as const, error: toActionError(error) };

export const createNewsVideo = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  const key = feedOf(raw);
  if (!key) return fail('INVALID_INPUT');
  if (!(await actionPermission(NEWS_FEEDS[key].menuKey, 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(newsVideoCreateSchema, raw);
  if (!input.ok) return input;
  const { title, categoryId, date, videoId, description, status } = input.data;
  const id = newId();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('news_videos').insert({
    id,
    feed: NEWS_FEEDS[key].feed,
    title,
    category_id: categoryId,
    date,
    video_id: videoId,
    ...(await imagesFor(videoId)),
    description,
    status,
  });
  if (error) return saveError(error);
  changed(key);
  return {
    ok: true,
    data: { id },
    message: status === 'PUBLISHED' ? '공개했습니다.' : '임시저장했습니다.',
  };
};

export const updateNewsVideo = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  const key = feedOf(raw);
  if (!key) return fail('INVALID_INPUT');
  if (!(await actionPermission(NEWS_FEEDS[key].menuKey, 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(newsVideoUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, title, categoryId, date, videoId, description, status } = input.data;
  const supabase = await createSupabaseServerClient();
  const res = await updateVersioned(
    supabase,
    'news_videos',
    id,
    updatedAt,
    {
      title,
      category_id: categoryId,
      date,
      video_id: videoId,
      ...(await imagesFor(videoId)),
      description,
      status,
    },
    { feed: NEWS_FEEDS[key].feed }
  );
  if (!res.ok)
    return res.error.code === 'DUPLICATE' ? fail('DUPLICATE', { detail: DUPLICATE_VIDEO }) : res;
  changed(key);
  return status === 'DRAFT' ? { ...res, message: '임시저장했습니다.' } : res;
};

const trashOrRestore = async (raw: unknown, trashed: boolean): Promise<ActionResult> => {
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const { feed: key, id } = input.data;
  if (!(await actionPermission(NEWS_FEEDS[key].menuKey, 'DELETE'))) return NO_PERMISSION;
  const res = await setTrashed(
    await createSupabaseServerClient(),
    'news_videos',
    id,
    trashed,
    { feed: NEWS_FEEDS[key].feed },
    '같은 영상이 이미 있어 복구할 수 없습니다.'
  );
  if (res.ok) changed(key);
  return res;
};

export const trashNewsVideo = async (raw: unknown) => trashOrRestore(raw, true);
export const restoreNewsVideo = async (raw: unknown) => trashOrRestore(raw, false);

export const purgeNewsVideo = async (raw: unknown): Promise<ActionResult> => {
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const { feed: key, id } = input.data;
  if (!(await actionPermission(NEWS_FEEDS[key].menuKey, 'PURGE'))) return NO_PERMISSION;
  const res = await purgeRow(await createSupabaseServerClient(), 'news_videos', id, {
    feed: NEWS_FEEDS[key].feed,
  });
  if (res.ok) revalidatePath(NEWS_FEEDS[key].adminPath, 'layout');
  return res;
};

/**
 * 복제해서 새로 쓰기 — 제목 · 분류 · 설명을 복사한 임시저장. 영상은 비운다(같은 메뉴에 같은 영상은 하나).
 * 날짜: 주일광고는 이번 주일과 원본 다음 주일 중 늦은 날, 성복의 뜰은 오늘.
 */
export const duplicateNewsVideo = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  const input = parseInput(idSchema, raw);
  if (!input.ok) return input;
  const { feed: key, id } = input.data;
  if (!(await actionPermission(NEWS_FEEDS[key].menuKey, 'CREATE'))) return NO_PERMISSION;
  const supabase = await createSupabaseServerClient();
  const { data: source } = await supabase
    .from('news_videos')
    .select('title, category_id, description, date')
    .eq('id', id)
    .eq('feed', NEWS_FEEDS[key].feed)
    .maybeSingle();
  if (!source) return fail('NOT_FOUND');
  const today = seoulToday(Date.now());
  const thisWeek = defaultNewsDate(key, today);
  const next = upcomingSunday(addDays(source.date, 1));
  const date = key === 'announcements' && next > thisWeek ? next : thisWeek;
  const copyId = newId();
  const { error } = await supabase.from('news_videos').insert({
    id: copyId,
    feed: NEWS_FEEDS[key].feed,
    title: source.title,
    category_id: source.category_id,
    description: source.description,
    date,
    video_id: null,
    status: 'DRAFT',
  });
  if (error) return saveError(error);
  revalidatePath(NEWS_FEEDS[key].adminPath, 'layout');
  return { ok: true, data: { id: copyId }, message: '복제했습니다.' };
};
