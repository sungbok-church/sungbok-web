// pnpm db:types — 로컬 DB(pnpm db:start)의 public 스키마에서 TS 타입을 만든다.
// 정본(supabase/schemas/schema.sql)을 고치고 `pnpm db:sync` → `pnpm db:reset` → `pnpm db:types` 순서로 돌린다.
// 운영 DB 가 아니라 로컬 DB 에서 만든다 — 타입의 정본은 레포의 schema.sql 이다.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OUT = 'src/shared/api/supabase/database.types.ts';
const HEADER =
  '// 자동 생성 — `pnpm db:types`. 손으로 고치지 않는다(변경 파일을 고치고 다시 만든다).\n';

const types = execFileSync(
  'pnpm',
  ['exec', 'supabase', 'gen', 'types', '--lang', 'typescript', '--schema', 'public'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
);

if (!types.includes('export type Database')) {
  console.error('타입을 만들지 못했습니다 — 로컬 DB 가 켜져 있는지 확인하세요(pnpm db:start).');
  process.exit(1);
}

writeFileSync(OUT, HEADER + types);
console.log(`${OUT} 을(를) 다시 만들었습니다.`);
