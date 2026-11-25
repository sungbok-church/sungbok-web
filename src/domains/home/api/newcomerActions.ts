'use server';

import type { Result } from '@/shared/api/result';
import { headers } from 'next/headers';

import { submitNewcomer } from './newcomerSubmit.server';

// 홈 «새가족 등록 · 문의» 의 보내기(설계 6.11) — 요청에서 접속 IP(횟수 제한용, 해시만 남긴다)와 사이트 주소(알림 메일의
// 관리자 링크)를 읽어 접수 로직에 넘긴다. 검증 · 넣기는 newcomerSubmit.server.
export const submitNewcomerForm = async (raw: unknown): Promise<Result> => {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return submitNewcomer(raw, { ip, origin: `${proto}://${host}` });
};
