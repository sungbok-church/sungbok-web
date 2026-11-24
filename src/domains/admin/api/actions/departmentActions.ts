'use server';

import { DEPARTMENTS_TAG } from '@/domains/next-generation/api/departmentTags';
import { toDbSlug } from '@/domains/next-generation/config/departmentSlug';
import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath, updateTag } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { departmentSaveSchema } from '../../lib/input/departmentInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { writeFileList } from '../server/fileList.server';

// 다음세대 부서 저장(패키지 C1, 설계 6.13) — 글이 아니라 설정이라 저장하면 바로 공개된다(휴지통 · 임시저장 없음).
// 사진 · 담당자 사진은 저장할 때마다 새 묶음에 적고(writeFileList), 부서 칸 · 담당자는 DB 함수 하나로 한 번에 바꾼다
// (save_department — 하나라도 막히면 전부 되돌리고, 화면을 연 뒤 바뀌었으면 null). 담당 부서가 정해진 사람은 그 부서만.

export const saveDepartment = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('departments', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(departmentSaveSchema, raw);
  if (!input.ok) return input;
  const d = input.data;
  const supabase = await createSupabaseServerClient();
  // DB 도 막지만(RLS) 0줄이면 «충돌» 로 보이므로, 묶음을 만들기 전에 범위를 먼저 본다
  const { data: limit } = await supabase.rpc('my_department_limit');
  if (limit && limit !== toDbSlug(d.slug)) return NO_PERMISSION;

  const photos = await writeFileList(supabase, 'departments', d.photos);
  if (!photos.ok || !photos.data) return photos.ok ? fail('INTERNAL') : photos;
  const staff = [];
  for (const s of d.staff) {
    let photoListId: string | null = null;
    if (s.photo.length > 0) {
      const list = await writeFileList(supabase, 'departments', s.photo);
      if (!list.ok || !list.data) return list.ok ? fail('INTERNAL') : list;
      photoListId = list.data.listId;
    }
    staff.push({
      id: s.id,
      name: s.name,
      role_id: s.roleId,
      greeting: s.greeting,
      photo_list_id: photoListId,
    });
  }

  const { data: saved, error } = await supabase.rpc('save_department', {
    p_slug: toDbSlug(d.slug),
    p_updated_at: d.updatedAt,
    p_ages: d.ages,
    p_tagline: d.tagline,
    p_intro: d.intro,
    p_extra: d.extra,
    p_photos_list_id: photos.data.listId,
    p_staff: staff,
  });
  if (error) return { ok: false, error: toActionError(error) };
  if (!saved) return fail('CONFLICT');
  revalidatePath('/admin/departments', 'layout');
  updateTag(DEPARTMENTS_TAG);
  return { ok: true, data: { updatedAt: saved }, message: '저장했습니다.' };
};
