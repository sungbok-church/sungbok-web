import 'server-only';

import ExcelJS from 'exceljs';

/**
 * 새가족 엑셀(설계 6.11 · 10절 — .xlsx, 서버에서 만들어 방문자 번들에 싣지 않는다). rows 는 머리 줄 포함(toSheetRows).
 * 모든 칸을 글자로 둔다 — 연락처의 앞자리 0 이 숫자로 바뀌어 빠지지 않게.
 */
export const buildNewcomerWorkbook = async (
  rows: readonly (readonly string[])[]
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('새가족');
  for (const row of rows) ws.addRow([...row]);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns.forEach(col => {
    col.numFmt = '@';
    let width = 8;
    col.eachCell?.(cell => {
      width = Math.max(width, Math.min(50, String(cell.value ?? '').length * 2 + 2));
    });
    col.width = width;
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
};
