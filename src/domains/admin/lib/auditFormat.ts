// 변경 이력 한 줄을 사람이 읽는 «칸: 이전 → 이후» 목록으로(설계 6.7).
// changes 모양: 등록 = 새 값, 삭제 = 지워진 값, 수정 = {칸: [이전, 이후]}, 개인정보 칸 = null(값 숨김), 엑셀 = {count}.
import { formatAdminTime } from './adminTime';
import {
  ACTION_NAMES,
  FIELD_LABELS,
  TABLE_FIELD_LABELS,
  MASKED_FIELDS,
  REFERENCE_FIELDS,
  TABLE_LABELS,
} from './auditLabels';
import { ACTION_LABELS } from './permissionMatrix';
import { DEPARTMENTS } from './input/userInput';

export type ChangeLine = { field: string; before: string; after: string };
type AuditRow = { table_name: string; action: string; changes: unknown };

const HIDDEN = '(값 숨김)';
const SKIP = new Set(['id']);

export const tableLabel = (table: string) => TABLE_LABELS[table] ?? table;
export const actionLabel = (action: string) => ACTION_NAMES[action] ?? action;
const fieldLabel = (table: string, field: string) =>
  TABLE_FIELD_LABELS[table]?.[field] ?? FIELD_LABELS[field] ?? field;

/** id → 이름(메뉴 · 그룹 · 사용자 등). 화면이 읽어서 넘긴다 */
export type NameLookup = Readonly<Record<string, string>>;

const DEPARTMENT_LABELS: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.value, d.label])
);
/** 콘텐츠 상태(content_status) */
const CONTENT_STATUS_LABELS: Record<string, string> = { DRAFT: '임시저장', PUBLISHED: '공개' };

const VALUE_LABELS: Record<string, Record<string, string>> = {
  action: ACTION_LABELS,
  actions: ACTION_LABELS,
  department: DEPARTMENT_LABELS,
  status: CONTENT_STATUS_LABELS,
};

/** 등록 때는 늘 비어 있어 보일 것이 없는 칸(휴지통) */
const EMPTY_ON_INSERT = new Set(['deleted_at', 'deleted_by']);

/** 비어 있을 때의 뜻이 정해진 칸 — 부서 범위가 비면 «모든 부서»(설계 6.4) */
const EMPTY_LABELS: Record<string, string> = { department: '모든 부서' };

const show = (value: unknown, field = '', names: NameLookup = {}): string => {
  if (value === null || value === undefined) return EMPTY_LABELS[field] ?? '(없음)';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (Array.isArray(value)) return value.map(v => show(v, field, names)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  if (REFERENCE_FIELDS.has(field)) return names[text] ?? text;
  // 시각 칸(…_at)은 서울 시각으로
  if (field.endsWith('_at')) return formatAdminTime(text);
  return VALUE_LABELS[field]?.[text] ?? text;
};

export const formatChanges = (
  { table_name, action, changes }: AuditRow,
  names: NameLookup = {}
): ChangeLine[] => {
  const masked = new Set(MASKED_FIELDS[table_name] ?? []);
  const entries = Object.entries(
    changes && typeof changes === 'object' ? (changes as Record<string, unknown>) : {}
  ).filter(
    ([field, value]) =>
      !SKIP.has(field) && !(action === 'INSERT' && value === null && EMPTY_ON_INSERT.has(field))
  );

  if (action === 'EXPORT') {
    const count = (changes as { count?: unknown } | null)?.count;
    return [{ field: '엑셀로 받기', before: '', after: `${show(count)}건` }];
  }
  return entries.map(([field, value]) => {
    const name = fieldLabel(table_name, field);
    const hidden = value === null && masked.has(field);
    if (hidden && action === 'UPDATE') return { field: name, before: HIDDEN, after: HIDDEN };
    if (action === 'UPDATE' && Array.isArray(value) && value.length === 2) {
      return {
        field: name,
        before: show(value[0], field, names),
        after: show(value[1], field, names),
      };
    }
    const shown = hidden ? HIDDEN : show(value, field, names);
    return action === 'DELETE'
      ? { field: name, before: shown, after: '' }
      : { field: name, before: '', after: shown };
  });
};

const SUBJECT_FIELDS = ['name', 'label', 'title'];

/** 이력 한 줄의 대상 이름(«사용자 · 홍길동» 의 뒷부분) — 바뀐 값에 이름 칸이 있을 때만. 수정이면 바뀐 뒤의 이름. */
export const subjectOf = ({ changes }: AuditRow): string | null => {
  if (!changes || typeof changes !== 'object') return null;
  const record = changes as Record<string, unknown>;
  for (const field of SUBJECT_FIELDS) {
    const value = record[field];
    const shown = Array.isArray(value) && value.length === 2 ? value[1] : value;
    if (typeof shown === 'string' && shown) return shown;
  }
  return null;
};
