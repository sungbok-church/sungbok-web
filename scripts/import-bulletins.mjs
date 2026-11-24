// node scripts/import-bulletins.mjs [--local] [--apply] — 기존 주보(시드 + public/files/bulletin)를 DB · Storage 로 옮긴다(설계 7).
//
//   --local  로컬 Supabase(pnpm db:start — Storage 포함으로 띄울 것)에 옮긴다. 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트에 옮긴다 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — DB 에 이미 있는 날짜(휴지통 포함)는 건드리지 않는다(관리자에 있는 것이 이긴다).
// 한 호씩: 묶음 → 쪽 파일 올리기 → 파일 줄 → 마지막에 주보(공개). 중간에 실패한 호는 주보가 없어 공개 화면에 나오지 않고,
// 남은 묶음 · 파일은 주인 없는 묶음이 되어 예약 작업이 지운다. 등록한 사람은 «시스템»(서버 전용 키 — 로그인한 사람이 없다).
// 키는 출력하지 않는다.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

import { uuidV7, storagePath } from '../src/domains/admin/lib/fileUpload.ts';
import { planBulletinImport } from '../src/domains/admin/lib/importPlan.ts';
import { BULLETIN_SEED } from '../src/domains/news/data/bulletinSeed.ts';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

const target = () => {
  if (args.has('--local')) {
    const status = execFileSync('corepack', ['pnpm', 'exec', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const read = name => status.match(new RegExp(`^${name}="?([^"\\n]*)"?$`, 'm'))?.[1];
    const url = read('API_URL');
    if (!url || !/^(127\.0\.0\.1|localhost)$/.test(new URL(url).hostname)) {
      console.error('로컬 Supabase 가 켜져 있지 않습니다 — pnpm db:start');
      process.exit(1);
    }
    return { url, key: read('SECRET_KEY') ?? read('SERVICE_ROLE_KEY') };
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL · SUPABASE_SECRET_KEY 가 없습니다(로컬이면 --local).');
    process.exit(1);
  }
  return { url, key };
};

const { url, key } = target();
console.log(
  `대상: ${new URL(url).host}${apply ? '' : ' (미리 보기 — 쓰지 않는다. 쓰려면 --apply)'}`
);
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const newId = () => uuidV7(Date.now(), webcrypto.getRandomValues(new Uint8Array(16)));

const { data: existing, error: existingError } = await db.from('bulletins').select('date');
if (existingError) throw new Error(`주보를 읽지 못했습니다: ${existingError.message}`);
const plan = planBulletinImport(BULLETIN_SEED, new Set(existing.map(r => r.date)));
const pageCount = plan.issues.reduce((n, i) => n + i.pages.length, 0);
console.log(
  `옮길 호 ${plan.issues.length}개(쪽 ${pageCount}장) · 이미 있어 건너뜀 ${plan.skipped.length}개 · 옮길 수 없음 ${plan.invalid.length}개`
);
if (plan.invalid.length) console.log(`  옮길 수 없음: ${plan.invalid.join(', ')}`);
if (!apply || plan.issues.length === 0) process.exit(0);

const { data: menu, error: menuError } = await db
  .from('menus')
  .select('id')
  .eq('area', 'ADMIN')
  .eq('key', 'bulletin')
  .single();
if (menuError) throw new Error(`주보 메뉴가 없습니다: ${menuError.message}`);

let done = 0;
for (const issue of plan.issues) {
  const listId = newId();
  const fail = (step, error) => {
    console.error(`  ✗ ${issue.date} — ${step}: ${error?.message ?? error}`);
  };
  const { error: listError } = await db.from('file_lists').insert({ id: listId, menu_id: menu.id });
  if (listError) {
    fail('묶음', listError);
    continue;
  }
  const rows = [];
  let ok = true;
  for (const [i, page] of issue.pages.entries()) {
    const fileId = newId();
    const path = storagePath('bulletin', listId, fileId, 'webp');
    const file = fileURLToPath(new URL(`../${page.file}`, import.meta.url)); // 레포 루트 기준
    const body = readFileSync(file);
    const { error } = await db.storage.from('media').upload(path, body, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      fail(`쪽 ${i + 1} 올리기`, error);
      ok = false;
      break;
    }
    rows.push({
      id: fileId,
      list_id: listId,
      sort: i + 1,
      bucket: 'media',
      path,
      kind: 'IMAGE',
      width: page.width,
      height: page.height,
      bytes: statSync(file).size,
      original_name: page.originalName,
    });
  }
  if (!ok) continue;
  const { error: filesError } = await db.from('files').insert(rows);
  if (filesError) {
    fail('파일 줄', filesError);
    continue;
  }
  const { error: bulletinError } = await db.from('bulletins').insert({
    id: newId(),
    date: issue.date,
    pages_list_id: listId,
    status: 'PUBLISHED',
  });
  if (bulletinError) {
    fail('주보', bulletinError);
    continue;
  }
  done += 1;
  if (done % 10 === 0) console.log(`  … ${done}/${plan.issues.length}`);
}
console.log(`끝: ${done}/${plan.issues.length}호를 옮겼습니다.`);
if (done < plan.issues.length) process.exit(1);
