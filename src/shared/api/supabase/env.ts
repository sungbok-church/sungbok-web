// Supabase 연결 값 읽기. 프로젝트 주소와 키는 환경변수로만 받는다(코드에 적지 않는다 — 프로젝트를 교회 계정으로 옮길 수 있어야 한다).
// 모듈을 import 하는 것만으로는 던지지 않는다 — 값이 없는 로컬·미리보기에서도 공개 사이트는 빌드되고 열려야 한다.

export type SupabaseEnv = { url: string; publishableKey: string };

const URL_NAME = 'NEXT_PUBLIC_SUPABASE_URL';
const KEY_NAME = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

/**
 * 둘 중 하나라도 비어 있으면 null.
 * 기본값은 `process.env.NEXT_PUBLIC_*` 를 글자 그대로 읽는다 — 그래야 빌드 때 값이 채워진다(동적으로 읽으면 브라우저 번들에 들어가지 않는다).
 */
export const readSupabaseEnv = (
  raw: { url?: string; publishableKey?: string } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
): SupabaseEnv | null => {
  const url = raw.url?.trim();
  const publishableKey = raw.publishableKey?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
};

/** 없으면 던진다 — 메시지에는 빠진 변수의 이름만 넣는다(값은 넣지 않는다). */
export const requireSupabaseEnv = (): SupabaseEnv => {
  const env = readSupabaseEnv();
  if (env) return env;
  const missing = [
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? null : URL_NAME,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ? null : KEY_NAME,
  ].filter(Boolean);
  throw new Error(`Supabase 환경변수가 없습니다: ${missing.join(', ')}`);
};
