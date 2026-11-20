// 공통코드 · 분류 목록(코드북)과 화면용 도우미 — 순수 함수. 읽기는 codeBook.server.ts.
// 드롭다운 · 조건 선택지는 codeOptions · categoryOptions, 표 · 상세의 이름은 codeLabel 로 만든다.

export type CodeRow = { group_key: string; code: string; label: string; is_active: boolean };
export type CategoryRow = {
  group_key: string;
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
};

/** 묶음 key → 그 묶음의 줄(순서 = 받은 순서, 읽을 때 sort 순으로 받는다) */
export type Book<Row> = Record<string, Row[]>;
export type Option = { value: string; label: string };

export const groupRows = <Row extends { group_key: string }>(rows: readonly Row[]): Book<Row> => {
  const book: Book<Row> = {};
  for (const row of rows) (book[row.group_key] ??= []).push(row);
  return book;
};

const INACTIVE = '(사용 안 함)';

/**
 * 드롭다운 · 조건의 선택지 — 켜진 코드만. 수정 화면이면 이미 고른 값(selected)이 꺼졌어도 남긴다
 * (꺼진 코드도 글에는 그대로 남기 때문 — 고른 값이 사라지면 저장할 때 바뀌어 버린다).
 */
export const codeOptions = (book: Book<CodeRow>, group: string, selected?: string): Option[] =>
  (book[group] ?? [])
    .filter(c => c.is_active || c.code === selected)
    .map(c => ({ value: c.code, label: c.is_active ? c.label : `${c.label}${INACTIVE}` }));

/** 코드 값 → 화면 이름. 모르는 값은 값 그대로(지운 코드가 없으므로 드물다) */
export const codeLabel = (book: Book<CodeRow>, group: string, code: string): string =>
  book[group]?.find(c => c.code === code)?.label ?? code;

/** 분류 선택지 — 글이 분류를 id 로 가리키므로 값은 id. 켜진 것만(고른 값은 남긴다) */
export const categoryOptions = (
  book: Book<CategoryRow>,
  group: string,
  selected?: string
): Option[] =>
  (book[group] ?? [])
    .filter(c => c.is_active || c.id === selected)
    .map(c => ({ value: c.id, label: c.is_active ? c.label : `${c.label}${INACTIVE}` }));
