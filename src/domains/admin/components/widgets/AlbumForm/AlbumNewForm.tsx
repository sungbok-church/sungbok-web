'use client';

import { useArrived } from '@/domains/admin/hooks/useArrived';

import { AlbumForm } from './index';

/** 새 앨범 폼이 서버에서 받는 것 — 사용자(임시 저장 칸) · 앨범 분류 · 그 자리에서 분류를 더할 수 있는가 */
export type AlbumNewData = {
  userId: string;
  categories: { value: string; label: string }[];
  canAddCategory: boolean;
};

const INITIAL = { title: '', categoryId: '', images: [] };

/** 새 앨범 폼 — 누르는 즉시 그려 바로 쓰게 하고(미리 만든 틀, ADR 0027), 서버에서 받을 것은 오는 대로 같은 폼에 채운다(useArrived) */
export const AlbumNewForm = ({ data }: { data: Promise<AlbumNewData> }) => {
  const loaded = useArrived(data);
  return (
    <AlbumForm
      pending={!loaded}
      userId={loaded?.userId ?? ''}
      categories={loaded?.categories ?? []}
      canAddCategory={loaded?.canAddCategory ?? false}
      initial={INITIAL}
    />
  );
};
