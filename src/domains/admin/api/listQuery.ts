// 관리자 목록의 상태(검색 · 필터 · 정렬 · 페이지 · 휴지통)를 주소 쿼리에 둔다(설계 6.10 «편의 기능»).
// 새로고침 · 뒤로 가기에도 그대로이고, 서버 컴포넌트가 이 값으로 다시 조회한다.
// 주소는 브라우저 기록과 서버 로그에 남으므로 개인정보 검색어를 싣지 않는 목록(새가족)은 searchInUrl: false.

/** 쪽당 개수 선택지와 기본값(설계 6.10 «목록 편의 기능») */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const PAGE_SIZE = 20;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MAX_PAGE = 10_000;
const MAX_Q = 100;
/** 값을 정해 두지 않은 필터(그룹 id 등)가 받는 모양 */
const FREE_VALUE = /^[\w-]{1,100}$/;

export type ListSpec = {
  /** 정렬할 수 있는 칸 */
  sorts: readonly string[];
  defaultSort: string;
  defaultDir: 'asc' | 'desc';
  /** 필터 이름 → 받을 값(null 이면 영문 · 숫자 · `-` · `_` 100자 안의 아무 값) */
  filters: Record<string, readonly string[] | null>;
  /** false 면 검색어를 주소에 싣지도 읽지도 않는다(개인정보 목록) */
  searchInUrl?: boolean;
  /** 기간 조건(from · to, YYYY-MM-DD)을 쓰는 목록 */
  dateRange?: boolean;
};

export type ListQuery = {
  q: string;
  page: number;
  /** 쪽당 개수(PAGE_SIZES 중 하나) */
  size: number;
  sort: string;
  dir: 'asc' | 'desc';
  filters: Record<string, string>;
  trash: boolean;
  /** 기간(YYYY-MM-DD, 비면 제한 없음) */
  from: string;
  to: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const isSize = (n: number) => (PAGE_SIZES as readonly number[]).includes(n);

/**
 * 주소 쿼리 → 목록 상태. 틀린 값은 버리고 기본값을 쓴다(던지지 않는다).
 * defaults.size: 주소에 쪽당 개수가 없을 때 쓸 값(사용자가 마지막에 고른 값 — 쿠키).
 */
export const parseListQuery = (
  sp: SearchParams,
  spec: ListSpec,
  defaults: { size?: number } = {}
): ListQuery => {
  const page = Number.parseInt(first(sp.page) ?? '', 10);
  const size = Number.parseInt(first(sp.size) ?? '', 10);
  const date = (v: string | undefined) => (spec.dateRange && v && DATE.test(v) ? v : '');
  const sort = first(sp.sort);
  const dir = first(sp.dir);
  const filters: Record<string, string> = {};
  for (const [name, allowed] of Object.entries(spec.filters)) {
    const value = first(sp[name]);
    if (value === undefined) continue;
    if (allowed ? allowed.includes(value) : FREE_VALUE.test(value)) filters[name] = value;
  }
  return {
    q: spec.searchInUrl === false ? '' : (first(sp.q) ?? '').trim().slice(0, MAX_Q),
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
    size: isSize(size) ? size : defaults.size && isSize(defaults.size) ? defaults.size : PAGE_SIZE,
    sort: sort && spec.sorts.includes(sort) ? sort : spec.defaultSort,
    dir: dir === 'asc' || dir === 'desc' ? dir : spec.defaultDir,
    filters,
    trash: first(sp.trash) === '1',
    from: date(first(sp.from)),
    to: date(first(sp.to)),
  };
};

/**
 * 목록 상태 → 주소. 기본값은 싣지 않는다. 검색 · 필터 · 정렬 · 휴지통이 바뀌면 1쪽으로 돌아간다
 * (patch 에 page 가 없을 때).
 */
export const listQueryHref = (
  pathname: string,
  query: ListQuery,
  patch: Partial<ListQuery>,
  spec: ListSpec
): string => {
  const next: ListQuery = {
    ...query,
    ...patch,
    filters: patch.filters ?? query.filters,
    page: patch.page ?? (Object.keys(patch).length > 0 ? 1 : query.page),
  };
  const params = new URLSearchParams();
  if (spec.searchInUrl !== false && next.q) params.set('q', next.q);
  for (const [name, value] of Object.entries(next.filters)) if (value) params.set(name, value);
  if (next.sort !== spec.defaultSort) params.set('sort', next.sort);
  if (next.dir !== spec.defaultDir) params.set('dir', next.dir);
  if (next.trash) params.set('trash', '1');
  if (spec.dateRange && next.from) params.set('from', next.from);
  if (spec.dateRange && next.to) params.set('to', next.to);
  if (next.size !== PAGE_SIZE) params.set('size', String(next.size));
  if (next.page > 1) params.set('page', String(next.page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
};

/** 쪽 번호 → Supabase `.range(from, to)` 값(0 부터, 끝 포함) */
export const rangeOf = (page: number, size: number = PAGE_SIZE): [number, number] => [
  (page - 1) * size,
  page * size - 1,
];

export type Condition = { key: string; label: string; value: string };

/**
 * 적용된 조건 — 목록 위에 칩(«상태: 임시저장 ✕»)으로 보인다. 필터 값은 filterLabels 로 사람이 읽는 이름으로.
 * 칩을 누르면 그 조건만 뺀다(key 가 q · from · to · trash 또는 필터 이름).
 */
export const activeConditions = (
  query: ListQuery,
  filterLabels: Record<string, { label: string; options?: Record<string, string> }>
): Condition[] => {
  const out: Condition[] = [];
  if (query.q) out.push({ key: 'q', label: '검색어', value: query.q });
  for (const [name, value] of Object.entries(query.filters)) {
    const meta = filterLabels[name];
    out.push({ key: name, label: meta?.label ?? name, value: meta?.options?.[value] ?? value });
  }
  if (query.from) out.push({ key: 'from', label: '시작일', value: query.from });
  if (query.to) out.push({ key: 'to', label: '끝일', value: query.to });
  if (query.trash) out.push({ key: 'trash', label: '보기', value: '삭제된 항목' });
  return out;
};

/**
 * 여러 칸 중 하나라도 검색어를 포함하는 PostgREST `or` 필터 문자열. 검색어를 그대로 이어 붙이면 필터 문법을
 * 끼워 넣을 수 있어서(«a,email.eq.x»), 값을 큰따옴표 안에 두고 `\` · `"` 를 이스케이프한다(PostgREST 의 따옴표 규칙).
 * `.or(orIlike([...], q))` 로만 쓴다 — 검색어를 필터 문자열에 직접 넣지 않는다(계획 Global Constraints).
 */
export const orIlike = (columns: readonly string[], q: string): string => {
  const value = q.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return columns
    .map(col => {
      if (!/^[a-z_]+$/.test(col)) throw new Error(`검색 칸 이름이 올바르지 않습니다: ${col}`);
      return `${col}.ilike."*${value}*"`;
    })
    .join(',');
};
