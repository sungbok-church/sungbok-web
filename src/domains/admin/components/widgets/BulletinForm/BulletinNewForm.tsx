'use client';

import { useArrived } from '@/domains/admin/hooks/useArrived';

import { BulletinForm } from './index';

/** 새 주보 폼이 서버에서 받는 것 — 사용자(임시 저장 칸) · 날짜(주소의 ?date= · 없으면 이번 주일 — 서버 시각 기준) */
export type BulletinNewData = { userId: string; date: string };

const INITIAL = { date: '', pages: [] };

/** 새 주보 폼 — 누르는 즉시 그려 바로 쓰게 하고(미리 만든 틀, ADR 0027), 날짜 · 사용자는 오는 대로 채운다(useArrived) */
export const BulletinNewForm = ({ data }: { data: Promise<BulletinNewData> }) => {
  const loaded = useArrived(data);
  return (
    <BulletinForm
      pending={!loaded}
      userId={loaded?.userId ?? ''}
      arrivedDate={loaded?.date}
      initial={INITIAL}
    />
  );
};
