import { describe, expect, it } from 'vitest';

import { NEWCOMER_INTENTS, NEWCOMER_STATUSES, toSheetRows } from './newcomer';

describe('새가족 — 상태 · 종류 · 엑셀 행', () => {
  it('상태는 접수 → 연락함 → 완료, 종류는 등록 · 문의', () => {
    expect(NEWCOMER_STATUSES.map(s => s.label)).toEqual(['접수', '연락함', '완료']);
    expect(NEWCOMER_INTENTS.map(s => s.label)).toEqual(['등록', '문의']);
  });
  it('엑셀 행 — 서울 시각, 빈 칸은 빈 글자, 연락처는 글자 그대로', () => {
    expect(
      toSheetRows([
        {
          created_at: '2026-11-25T01:30:00Z',
          intent: 'REGISTER',
          name: '홍길동',
          phone: '010-1234-5678',
          visit_date: '2026-11-29',
          message: null,
          status: 'CONTACTED',
          note: '토요일 통화',
        },
      ])
    ).toEqual([
      ['접수 시각', '종류', '이름', '연락처', '방문 예정일', '남기신 말', '상태', '메모'],
      [
        '2026-11-25 10:30',
        '등록',
        '홍길동',
        '010-1234-5678',
        '2026-11-29',
        '',
        '연락함',
        '토요일 통화',
      ],
    ]);
  });
});
