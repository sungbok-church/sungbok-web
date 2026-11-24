'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { ALBUMS_TAG } from '@/domains/news/api/newsTags';
import { RESOURCES_TAG } from '@/domains/resources/api/resourceTags';
import { revalidatePath, updateTag } from 'next/cache';

import { type ActionResult, parseInput } from '../../lib/actionResult';
import { NEWS_FEEDS } from '../../lib/newsFeed';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import {
  categoryCreateSchema,
  codeCreateSchema,
  itemUpdateSchema,
} from '../../lib/input/itemInput';
import { addRowLast, saveRow, saveRowOrder } from '../server/rowActions.server';

// 분류 관리 · 코드(공통코드) 관리의 Server Action — 두 화면은 «묶음 안의 이름 목록» 으로 같다.
// 더하기만 조금 다르다: 분류는 영문 이름(slug), 코드는 코드 값(code)을 넣고, 코드는 잠긴 묶음에 더하지 않는다.
// 묶음(category_groups · code_groups)은 변경 파일로만 생긴다. 줄은 지우지 않고 끈다(글 · 프로그램이 가리킨다).
// 고친 뒤에는 그 화면을 다시 그린다. 관리자 드롭다운 · 조건은 그릴 때마다 DB 를 읽으므로 지울 캐시가 없다(ADR 0023).
// 분류 이름은 공개 화면(앨범 분류 · 시트지 묶음 · 영상 분류)의 서버 캐시에도 들어가므로 그 태그도 지운다 — 드물게 고치니 한꺼번에.

const PUBLIC_TAGS = [
  ALBUMS_TAG,
  RESOURCES_TAG,
  NEWS_FEEDS.announcements.cacheTag,
  NEWS_FEEDS.garden.cacheTag,
];

const categories = {
  table: 'categories',
  menuKey: 'categories',
  revalidate: () => {
    revalidatePath('/admin/categories');
    for (const tag of PUBLIC_TAGS) updateTag(tag);
  },
} as const;

const codes = {
  table: 'codes',
  menuKey: 'codes',
  revalidate: () => revalidatePath('/admin/codes'),
} as const;

/** 분류 더하기 — 묶음의 맨 뒤 순서로. */
export const createCategory = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission(categories.menuKey, 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(categoryCreateSchema, raw);
  if (!input.ok) return input;
  const { groupKey, slug, label } = input.data;
  const supabase = await createSupabaseServerClient();
  return addRowLast(
    supabase,
    categories.table,
    { group_key: groupKey, slug, label },
    { message: '분류를 더했습니다.', revalidate: categories.revalidate }
  );
};

/**
 * 공통코드 더하기 — 묶음의 맨 뒤 순서로, 코드 값은 대문자. 잠긴 묶음(enum 과 같은 값)에는 더하지 않는다
 * (DB 의 guard_codes 도 막는다).
 */
export const createCode = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission(codes.menuKey, 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(codeCreateSchema, raw);
  if (!input.ok) return input;
  const { groupKey, code, label } = input.data;
  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from('code_groups')
    .select('is_locked')
    .eq('key', groupKey)
    .maybeSingle();
  if (!group) return fail('NOT_FOUND');
  if (group.is_locked) return fail('LOCKED_CODE');
  return addRowLast(
    supabase,
    codes.table,
    { group_key: groupKey, code, label },
    { message: '코드를 더했습니다.', revalidate: codes.revalidate }
  );
};

/** 이름 · 사용 여부. */
export const updateCategory = async (raw: unknown) =>
  saveRow({ ...categories, schema: itemUpdateSchema }, raw);

/** 이름 · 사용 여부(잠긴 코드는 이름만 — 끄기는 DB 가 막는다). */
export const updateCode = async (raw: unknown) =>
  saveRow({ ...codes, schema: itemUpdateSchema }, raw);

/** 같은 묶음 안에서 끌어서 옮긴 순서를 한 번에. */
export const reorderCategories = async (raw: unknown) => saveRowOrder(categories, raw);

/** 같은 묶음 안에서 끌어서 옮긴 순서를 한 번에(잠긴 묶음도 순서는 바꾼다). */
export const reorderCodes = async (raw: unknown) => saveRowOrder(codes, raw);
