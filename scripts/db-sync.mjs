// pnpm db:sync [이름] — 정본 두 파일에서 변경 파일(supabase/migrations)을 만든다.
//   1) supabase/schemas/schema.sql(구조) → Supabase CLI 가 지금까지의 변경 이력과 비교해 <시각>_<이름>.sql 을 만든다.
//      바뀐 것이 없으면 만들지 않는다. 다룰 수 없는 객체가 있으면 실패한다(--strict-coverage).
//   2) supabase/reference.sql(초기 행) → 마지막 <시각>_reference.sql 과 다르면 그대로 옮긴 새 파일을 만든다.
// 로컬 DB(pnpm db:start)가 켜져 있어야 한다. 로컬 DB 에는 적용하지 않는다 — 다음에 `pnpm db:reset` → `pnpm db:types`.
// 만든 변경 파일은 손으로 고치지 않는다. 고칠 것이 있으면 정본을 고치고, 그 실행이 만든 파일을 모두 지운 뒤 다시 돌린다
// (구조 파일만 지우면 초기 행 파일이 구조 파일보다 앞서 적용 순서가 뒤집힌다).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  latestReferenceMigration,
  nextMigrationVersion,
  referenceMigrationBody,
  referenceMigrationNeeded,
} from './lib/dbSync.mjs';

const MIGRATIONS = 'supabase/migrations';
const REFERENCE = 'supabase/reference.sql';
const name = process.argv[2] ?? 'schema';

if (!/^[a-z][a-z0-9_]*$/.test(name) || name === 'reference') {
  console.error('사용법: pnpm db:sync [이름(영문 소문자 · 숫자 · _, reference 제외)]');
  process.exit(1);
}

const listMigrations = () => readdirSync(MIGRATIONS).filter(file => file.endsWith('.sql'));

// 1) 구조
const before = new Set(listMigrations());
execFileSync(
  'pnpm',
  [
    'exec',
    'supabase',
    'db',
    'schema',
    'declarative',
    'sync',
    '--strict-coverage',
    '--no-apply',
    '--file',
    name,
  ],
  { stdio: 'inherit' }
);
const createdBySchema = listMigrations().filter(file => !before.has(file));
console.log(
  createdBySchema.length
    ? `구조 변경 파일: ${createdBySchema.join(', ')}`
    : '구조는 바뀐 것이 없습니다.'
);

// 2) 초기 행
const source = readFileSync(REFERENCE, 'utf8');
const names = listMigrations();
const latest = latestReferenceMigration(names);
const latestContent = latest ? readFileSync(join(MIGRATIONS, latest), 'utf8') : null;

if (referenceMigrationNeeded(latestContent, source)) {
  const file = `${nextMigrationVersion(names, new Date())}_reference.sql`;
  writeFileSync(join(MIGRATIONS, file), referenceMigrationBody(source));
  console.log(`초기 행 변경 파일: ${file}`);
} else {
  console.log('초기 행은 바뀐 것이 없습니다.');
}

console.log('다음: pnpm db:reset → pnpm db:types → pnpm db:test');
