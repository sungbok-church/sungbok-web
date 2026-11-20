// 마지막으로 본 목록(설계 6.10 «상세에서 목록으로 돌아오면 조건 · 쪽 유지», «이전 · 다음 항목»).
// 목록이 그릴 때 주소(조건 · 쪽)와 그 쪽의 줄 순서를 탭 저장소(sessionStorage)에 두고, 상세가 읽는다.
// 다른 목록의 주소나 바깥 주소는 받지 않는다(그 목록 주소로 시작해야 한다).

type MemoryStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type ListMemory = { href: string; ids: string[] };

const keyOf = (listPath: string) => `admin-list:${listPath}`;

export const saveListMemory = (storage: MemoryStorage, listPath: string, memory: ListMemory) => {
  try {
    storage.setItem(keyOf(listPath), JSON.stringify(memory));
  } catch {
    // 저장소를 못 쓰면 기본 목록으로 돌아간다
  }
};

export const readListMemory = (storage: MemoryStorage, listPath: string): ListMemory => {
  const fallback = { href: listPath, ids: [] };
  try {
    const raw = storage.getItem(keyOf(listPath));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ListMemory>;
    const href = typeof parsed.href === 'string' ? parsed.href : '';
    const sameList = href === listPath || href.startsWith(`${listPath}?`);
    return {
      href: sameList ? href : listPath,
      ids: Array.isArray(parsed.ids)
        ? parsed.ids.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return fallback;
  }
};

export const neighbors = (ids: readonly string[], id: string) => {
  const index = ids.indexOf(id);
  if (index < 0) return { prev: null, next: null };
  return { prev: ids[index - 1] ?? null, next: ids[index + 1] ?? null };
};
