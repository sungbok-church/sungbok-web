'use server';

import { HOME_HERO_TAG } from '@/domains/home/api/homeTags';
import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath, updateTag } from 'next/cache';

import { type ActionResult, parseInput } from '../../lib/actionResult';
import { homeHeroSaveSchema } from '../../lib/input/homeHeroInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { writeFileList } from '../server/fileList.server';
import { updateVersioned } from '../server/versionedUpdate.server';

// 홈 히어로 저장(패키지 C2, 설계 6.12) — 설정이라 저장하면 바로 공개된다. 대표 사진은 저장마다 새 묶음에 적고(폭별 파일 포함),
// 한 줄뿐인 설정 행(옮기기 스크립트가 만든다)을 고친다. 화면을 연 뒤 바뀌었으면 «충돌».

export const saveHomeHero = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('home-hero', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(homeHeroSaveSchema, raw);
  if (!input.ok) return input;
  const { kind, photo, videoId, updatedAt } = input.data;
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase.from('home_hero').select('id').maybeSingle();
  if (!row) return fail('NOT_FOUND');
  const list = await writeFileList(supabase, 'home-hero', photo);
  if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
  const res = await updateVersioned(supabase, 'home_hero', row.id, updatedAt, {
    kind,
    photo_list_id: list.data.listId,
    youtube_video_id: videoId,
  });
  if (res.ok) {
    revalidatePath('/admin/home-hero');
    updateTag(HOME_HERO_TAG);
  }
  return res;
};
