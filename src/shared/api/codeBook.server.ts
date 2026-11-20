import 'server-only';

import { cache } from 'react';

import { type Book, type CategoryRow, type CodeRow, groupRows } from './codeBook';
import { readSupabaseEnv } from './supabase/env';
import { createSupabaseReadClient } from './supabase/readClient.server';

/**
 * 공통코드 · 분류 읽기(ADR 0023) — 캐시에 두지 않고 그릴 때마다 DB 에서 읽는다.
 * 두 표는 몇 KB 라 읽기가 가볍고, 그러면 고친 값이 다음 화면에 바로 보인다(서버가 여러 대여도 어긋나지 않는다).
 * 한 요청 안에서 여러 부품이 불러도 DB 는 한 번만 부른다(React cache — 요청이 끝나면 버린다).
 * 공개 페이지가 쓰게 되면 캐시 없는 읽기는 미리 그리기에서 «요청 때의 빈칸» 이 된다(Cache Components) —
 * 그 페이지 쪽에서 'use cache' 로 감싸 HTML 에 넣거나, <Suspense> 안에서 요청 때 읽는다(ADR 0024).
 * 로그인 쿠키를 쓰지 않는 읽기 전용 연결(공개 키)로 읽는다 — 두 표는 누구나 읽는다.
 */

/** 공통코드 전부(묶음별, 꺼진 코드 포함 — 선택지는 codeOptions 가 거른다) */
export const getCodeBook = cache(async (): Promise<Book<CodeRow>> => {
  const client = readSupabaseEnv() ? createSupabaseReadClient() : null;
  if (!client) return {};
  const { data, error } = await client
    .from('codes')
    .select('group_key, code, label, is_active')
    .order('sort')
    .order('created_at');
  if (error) throw new Error(`공통코드를 읽지 못했습니다: ${error.message}`);
  return groupRows(data ?? []);
});

/** 분류 전부(묶음별, 꺼진 분류 포함 — 선택지는 categoryOptions 가 거른다) */
export const getCategoryBook = cache(async (): Promise<Book<CategoryRow>> => {
  const client = readSupabaseEnv() ? createSupabaseReadClient() : null;
  if (!client) return {};
  const { data, error } = await client
    .from('categories')
    .select('group_key, id, slug, label, is_active')
    .order('sort')
    .order('created_at');
  if (error) throw new Error(`분류를 읽지 못했습니다: ${error.message}`);
  return groupRows(data ?? []);
});
