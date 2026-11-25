import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { readSupabaseEnv } from './env';

/**
 * 만능 키(SUPABASE_SECRET_KEY) 클라이언트 — 행 권한(RLS)을 건너뛴다. 설계 6.1 의 네 곳과 유튜브 동기화(묶음 E)에서만 쓴다:
 * 계정 만들기 · 비밀번호 초기화(관리자), 예약 작업, 기존 자료 가져오기, 새가족 접수.
 * 관리자 코드 밖에서는 lint 가 import 를 막는다. 값이 없으면 null — 부르는 쪽이 «설정되지 않았습니다» 를 보여 준다.
 * 일상적인 쓰기는 이것이 아니라 로그인한 사람의 세션(serverClient.server)으로 한다 — 누가 했는지 남고 권한 검사를 지난다.
 */
export const createSupabaseAdminClient = () => {
  const env = readSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!env || !secret) return null;
  return createClient<Database>(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};
