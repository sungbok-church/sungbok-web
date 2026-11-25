// 새가족 접수함(설계 6.11)의 공통 값 — 상태 · 종류의 화면 이름과 엑셀 행. 순수 데이터 · 변환.
import { formatAdminTime } from './adminTime';

/** 처리 상태(DB enum newcomer_status) — 첫 화면의 «연락 전 새가족» · 왼쪽 메뉴의 숫자는 NEW */
export const NEWCOMER_STATUSES = [
  { value: 'NEW', label: '접수' },
  { value: 'CONTACTED', label: '연락함' },
  { value: 'DONE', label: '완료' },
] as const;
export type NewcomerStatus = (typeof NEWCOMER_STATUSES)[number]['value'];

/** 종류(DB enum newcomer_intent) */
export const NEWCOMER_INTENTS = [
  { value: 'REGISTER', label: '등록' },
  { value: 'INQUIRY', label: '문의' },
] as const;
export type NewcomerIntent = (typeof NEWCOMER_INTENTS)[number]['value'];

export const statusLabel = (v: string) => NEWCOMER_STATUSES.find(s => s.value === v)?.label ?? v;
export const intentLabel = (v: string) => NEWCOMER_INTENTS.find(s => s.value === v)?.label ?? v;

export type NewcomerSheetRow = {
  created_at: string;
  intent: string;
  name: string;
  phone: string;
  visit_date: string | null;
  message: string | null;
  status: string;
  note: string | null;
};

/** 엑셀 내려받기의 행(머리 줄 포함) — 시각은 서울, 빈 칸은 빈 글자 */
export const toSheetRows = (rows: readonly NewcomerSheetRow[]): string[][] => [
  ['접수 시각', '종류', '이름', '연락처', '방문 예정일', '남기신 말', '상태', '메모'],
  ...rows.map(r => [
    formatAdminTime(r.created_at),
    intentLabel(r.intent),
    r.name,
    r.phone,
    r.visit_date ?? '',
    r.message ?? '',
    statusLabel(r.status),
    r.note ?? '',
  ]),
];
