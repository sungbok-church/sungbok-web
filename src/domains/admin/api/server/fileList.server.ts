import 'server-only';

import { fail } from '@/shared/api/result';
import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type ActionResult, toActionError } from '../../lib/actionResult';
import { MEDIA_BUCKET, uuidV7 } from '../../lib/fileUpload';
import type { ContentMenu, FileItem } from '../../lib/input/fileInput';

// 글의 파일 묶음 쓰기(설계 6.8) — 저장할 때마다 **새 묶음**을 만들어 파일 줄을 주어진 순서로 한 번에 적는다.
// 글은 저장이 끝날 때 새 묶음을 가리키게 바뀐다 — 저장 전에는 공개 화면이 바뀌지 않고, 다시 시도해도 안전하다.
// 앞 묶음은 주인 없는 묶음이 되어 예약 작업이 지운다(Storage 파일은 가리키는 줄이 하나도 없을 때만).
// 로그인한 사람의 세션으로 쓴다 — 새 묶음은 주인이 없으므로 그 메뉴의 등록 · 수정 권한이면 된다(can_write_list).

type Client = SupabaseClient<Database>;

export const writeFileList = async (
  client: Client,
  menuKey: ContentMenu,
  items: readonly FileItem[]
): Promise<ActionResult<{ listId: string }>> => {
  // 메뉴 key 는 영역(관리자 · 홈페이지) 안에서만 유일하다 — 관리자 메뉴로 찾는다
  const { data: menu } = await client
    .from('menus')
    .select('id')
    .eq('area', 'ADMIN')
    .eq('key', menuKey)
    .maybeSingle();
  if (!menu) return fail('NOT_FOUND');
  // id 를 여기서 만들고 돌려받지 않는다 — 넣는 문장 안에서는 읽기 규칙(can_read_list)이 새 묶음을 아직 못 봐서
  // «넣고 돌려받기» 가 권한 오류가 된다(로컬 Storage 로 확인, 2026-11-24)
  const list = { id: uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16))) };
  const { error } = await client.from('file_lists').insert({ id: list.id, menu_id: menu.id });
  if (error) return { ok: false, error: toActionError(error) };
  if (items.length > 0) {
    const { error: filesError } = await client.from('files').insert(
      items.map((f, i) => ({
        list_id: list.id,
        sort: i + 1,
        bucket: MEDIA_BUCKET,
        path: f.path,
        kind: f.kind,
        width: f.width,
        height: f.height,
        bytes: f.bytes,
        original_name: f.originalName,
        alt: f.alt,
      }))
    );
    if (filesError) return { ok: false, error: toActionError(filesError) };
  }
  return { ok: true, data: { listId: list.id } };
};

/** 묶음 복사(복제해서 새로 쓰기) — 같은 Storage 파일을 가리키는 줄로 새 묶음을 만든다. 원본을 지워도 복사본은 깨지지 않는다 */
export const copyFileList = async (
  client: Client,
  sourceListId: string
): Promise<ActionResult<{ listId: string }>> => {
  const { data: source } = await client
    .from('file_lists')
    .select('menus(key)')
    .eq('id', sourceListId)
    .maybeSingle();
  const menuKey = (source?.menus as { key: string } | null)?.key;
  if (!menuKey) return fail('NOT_FOUND');
  const { data: rows, error } = await client
    .from('files')
    .select('path, kind, width, height, bytes, original_name, alt')
    .eq('list_id', sourceListId)
    .order('sort');
  if (error) return { ok: false, error: toActionError(error) };
  return writeFileList(
    client,
    menuKey as ContentMenu,
    (rows ?? []).map(r => ({
      path: r.path,
      kind: r.kind,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      originalName: r.original_name,
      alt: r.alt,
    }))
  );
};
