import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';

import { buildNewcomerWorkbook } from './newcomerExport.server';

vi.mock('server-only', () => ({}));

describe('buildNewcomerWorkbook — 새가족 엑셀(.xlsx)', () => {
  it('머리 줄 + 접수마다 한 줄, 연락처는 글자 칸(앞자리 0 이 빠지지 않게)', async () => {
    const buf = await buildNewcomerWorkbook([
      ['접수 시각', '종류', '이름', '연락처'],
      ['2026-11-25 10:30', '등록', '홍길동', '010-1234-5678'],
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('새가족');
    expect(ws?.getRow(1).values).toEqual([undefined, '접수 시각', '종류', '이름', '연락처']);
    expect(ws?.getRow(2).getCell(4).value).toBe('010-1234-5678');
    expect(ws?.getRow(1).font?.bold).toBe(true);
  });
});
