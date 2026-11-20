import 'server-only';

import { cookies } from 'next/headers';

export const LIST_SIZE_COOKIE = 'admin_list_size';

/** 목록의 사용자 기본값 — 마지막에 고른 쪽당 개수(AdminTable 이 쿠키에 적는다). 맞는 값인지는 parseListQuery 가 본다. */
export const readListDefaults = async (): Promise<{ size?: number }> => {
  const raw = (await cookies()).get(LIST_SIZE_COOKIE)?.value;
  const size = Number(raw);
  return raw !== undefined && Number.isInteger(size) ? { size } : {};
};
