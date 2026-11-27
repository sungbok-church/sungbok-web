'use client';

import { useArrived } from '@/domains/admin/hooks/useArrived';
import type { NewsFeedKey } from '@/domains/admin/lib/newsFeed';

import { NewsVideoForm } from './index';

/** 새 주일광고 · 성복의 뜰 폼이 서버에서 받는 것 — 사용자 · 분류 · 분류 더하기 권한 · 날짜(?date= · 없으면 기본 날짜) */
export type NewsVideoNewData = {
  userId: string;
  categories: { value: string; label: string }[];
  canAddCategory: boolean;
  date: string;
};

const INITIAL = { title: '', categoryId: '', date: '', video: '', description: '' };

/** 새 글 폼 — 누르는 즉시 그려 바로 쓰게 하고(미리 만든 틀, ADR 0027), 서버에서 받을 것은 오는 대로 같은 폼에 채운다(useArrived) */
export const NewsVideoNewForm = ({
  feed,
  data,
}: {
  feed: NewsFeedKey;
  data: Promise<NewsVideoNewData>;
}) => {
  const loaded = useArrived(data);
  return (
    <NewsVideoForm
      feed={feed}
      pending={!loaded}
      userId={loaded?.userId ?? ''}
      categories={loaded?.categories ?? []}
      canAddCategory={loaded?.canAddCategory ?? false}
      arrivedDate={loaded?.date}
      initial={INITIAL}
    />
  );
};
