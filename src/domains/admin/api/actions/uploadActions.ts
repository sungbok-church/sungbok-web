'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import { type ActionResult, parseInput } from '../../lib/actionResult';
import {
  type FileKind,
  MEDIA_BUCKET,
  storagePath,
  uploadMimeOf,
  uploadTypeOf,
  uuidV7,
} from '../../lib/fileUpload';
import { CONTENT_MENUS, type ContentMenu, uploadRequestSchema } from '../../lib/input/fileInput';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { writeFileList } from '../server/fileList.server';

// 파일 올리기 통로의 Server Action(설계 6.8). 파일 바이트는 서버를 거치지 않는다 — 서버가 로그인한 사람의 세션으로
// «한 번 쓰는 올리기 주소» 를 만들면(Storage 권한 규칙 media_insert 가 이때 경로의 묶음 · 메뉴를 본다), 브라우저가 그 주소로
// 직접 올린다(진행 표시가 되게 XHR). 파일 줄은 글을 저장할 때 writeFileList 가 한 번에 적는다.

/** 그 메뉴에 파일을 올릴 수 있는가 — 등록 또는 수정 권한 */
const canUpload = async (menuKey: ContentMenu) =>
  (await actionPermission(menuKey, 'CREATE')) ?? (await actionPermission(menuKey, 'UPDATE'));

/** 올리는 자리(빈 묶음) — 등록 · 수정 화면에서 처음 파일을 고를 때 한 번 만든다 */
export const createUploadList = async (
  menuKey: ContentMenu
): Promise<ActionResult<{ listId: string }>> => {
  if (!(CONTENT_MENUS as readonly string[]).includes(menuKey)) return fail('INVALID_INPUT');
  if (!(await canUpload(menuKey))) return NO_PERMISSION;
  return writeFileList(await createSupabaseServerClient(), menuKey, []);
};

export type SignedUpload = {
  fileId: string;
  path: string;
  /** PUT 으로 파일을 보낼 주소(토큰 포함, 2시간) */
  signedUrl: string;
  /** 올릴 때 Content-Type */
  contentType: string;
  kind: FileKind;
};

/** 파일 한 개를 올릴 한 번 쓰는 주소 — 파일 id(uuid v7)와 경로를 여기서 정한다 */
export const signUpload = async (raw: unknown): Promise<ActionResult<SignedUpload>> => {
  const input = parseInput(uploadRequestSchema, raw);
  if (!input.ok) return input;
  const { menuKey, listId, type, name } = input.data;
  if (!(await canUpload(menuKey))) return NO_PERMISSION;
  const upload = uploadTypeOf(type, name);
  if (!upload) return fail('NOT_ALLOWED', { detail: '올릴 수 없는 파일입니다.' });
  const fileId = uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(16)));
  const path = storagePath(menuKey, listId, fileId, upload.ext);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    // 경로의 묶음에 쓰기 권한이 없으면 Storage 가 막는다(403) — 원문은 서버 로그에만
    console.error('[upload]', error?.message);
    return fail(
      String((error as { statusCode?: string } | null)?.statusCode) === '403'
        ? 'NO_PERMISSION'
        : 'INTERNAL'
    );
  }
  return {
    ok: true,
    data: {
      fileId,
      path,
      signedUrl: data.signedUrl,
      contentType: uploadMimeOf(upload.kind, type),
      kind: upload.kind,
    },
  };
};
