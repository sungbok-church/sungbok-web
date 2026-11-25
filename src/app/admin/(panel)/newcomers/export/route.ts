import { actionPermission } from '@/domains/admin/api/server/adminContext.server';
import { NEWCOMER_LIST_SPEC, newcomerQuery } from '@/domains/admin/api/server/newcomer.server';
import { buildNewcomerWorkbook } from '@/domains/admin/api/server/newcomerExport.server';
import { seoulToday } from '@/domains/admin/lib/content';
import { parseListQuery } from '@/domains/admin/lib/listQuery';
import { toSheetRows } from '@/domains/admin/lib/newcomer';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

// 새가족 엑셀 내려받기(설계 6.11) — 접수함의 지금 조건(상태 · 종류 · 기간) 그대로, 쪽 나누기 없이. «내려받기» 권한이 있어야 하고
// 내려받은 건수를 변경 이력에 남긴다(누가 · 언제 · 몇 건 — 개인정보가 화면 밖으로 나가는 유일한 길). 브라우저 · 중간 캐시에 남기지 않는다.

const MAX_ROWS = 5000;

export const GET = async (request: Request): Promise<Response> => {
  if (!(await actionPermission('newcomers', 'EXPORT'))) return new Response(null, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseListQuery(params, NEWCOMER_LIST_SPEC, {});
  const { data, error } = await newcomerQuery(supabase, query).limit(MAX_ROWS);
  if (error) return new Response(null, { status: 500 });
  const rows = data ?? [];
  // 기록을 남기지 못하면 내주지 않는다
  const { error: auditError } = await supabase
    .from('audit_log')
    .insert({ table_name: 'newcomers', action: 'EXPORT', changes: { count: rows.length } });
  if (auditError) return new Response(null, { status: 500 });
  const body = await buildNewcomerWorkbook(toSheetRows(rows));
  const name = `새가족-${seoulToday(Date.now())}.xlsx`;
  return new Response(new Uint8Array(body), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="newcomers.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
    },
  });
};
