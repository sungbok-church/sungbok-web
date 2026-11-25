import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { mayWriteSharedDb } from './sharedDbWrites.server';

afterEach(() => vi.unstubAllEnvs());

describe('mayWriteSharedDb — 운영 DB 를 바꾸는 일(유튜브 받기 · 예약 작업)을 해도 되는 곳(허용 목록)', () => {
  it('운영에만 둔 표시(PRODUCTION_WRITES=on)가 있으면 된다', () => {
    vi.stubEnv('PRODUCTION_WRITES', 'on');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
    expect(mayWriteSharedDb()).toBe(true);
  });

  it('표시가 없으면 안 된다 — preview 배포 · 운영 키로 띄운 로컬 서버(Vercel 시스템 변수에 기대지 않는다)', () => {
    vi.stubEnv('PRODUCTION_WRITES', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
    expect(mayWriteSharedDb()).toBe(false);
  });

  it('로컬 DB 를 보는 로컬 개발은 된다', () => {
    vi.stubEnv('PRODUCTION_WRITES', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    expect(mayWriteSharedDb()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    expect(mayWriteSharedDb()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost.evil.example');
    expect(mayWriteSharedDb()).toBe(false);
  });
});
