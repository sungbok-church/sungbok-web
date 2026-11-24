// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-resources.mjs [--local] [--apply]
// 기존 설교 시트지(시드 57건 + public/files/resources — 원본 · 쪽 그림)를 DB · Storage 로 옮긴다(설계 7). 영상 연결도 함께.
//
//   --local  로컬 Supabase(Storage 포함으로 띄울 것)에 옮긴다. 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트에 옮긴다 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — DB 에 같은 번호(slug, 휴지통 포함)가 있으면 건드리지 않는다. 한 건씩: 원본 묶음 · 쪽 묶음 → 파일 올리기 →
// 파일 줄 → 시트지(공개, 기존 번호) → 영상 연결. 중간에 실패한 건은 시트지가 없어 공개되지 않고, 남은 묶음 · 파일은 예약 작업이 지운다.
// 키는 출력하지 않는다. 일회용 — 운영 확인 뒤 시드 · public/files/resources 와 함께 지운다.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { storagePath, uuidV7 } from '../src/domains/admin/lib/fileUpload.ts';
import { planResourceImport } from '../src/domains/admin/lib/resourceImportPlan.ts';
import { RESOURCES_SEED } from '../src/domains/resources/data/resourcesSeed.ts';

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
console.log(`대상: ${new URL(url).host}${apply ? '' : ' (미리 보기 — 쓰지 않는다. 쓰려면 --apply)'}`);
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const newId = () => uuidV7(Date.now(), webcrypto.getRandomValues(new Uint8Array(16)));
const repoFile = rel => fileURLToPath(new URL(`../${rel}`, import.meta.url)); // 레포 루트 기준

const [{ data: existing, error: e1 }, { data: cats, error: e2 }, { data: menu, error: e3 }] =
  await Promise.all([
    db.from('resources').select('slug'),
    db
      .from('categories')
      .select('id, group_key, label')
      .in('group_key', ['RESOURCE_SUNDAY', 'RESOURCE_SERIES', 'RESOURCE_SEASONAL']),
    db.from('menus').select('id').eq('area', 'ADMIN').eq('key', 'resources').single(),
  ]);
if (e1 || e2 || e3) throw new Error(`읽지 못했습니다: ${(e1 ?? e2 ?? e3).message}`);
const plan = planResourceImport(
  RESOURCES_SEED,
  new Set(existing.map(r => r.slug)),
  Object.fromEntries(cats.map(c => [`${c.group_key}:${c.label}`, c.id]))
);
const originals = plan.items.filter(i => i.original).length;
const pageCount = plan.items.reduce((n, i) => n + i.pages.length, 0);
console.log(
  `옮길 자료 ${plan.items.length}건(원본 ${originals} · 쪽 그림 ${pageCount}장) · 이미 있어 건너뜀 ${plan.skipped.length}건 · 옮길 수 없음 ${plan.invalid.length}건`
);
if (plan.invalid.length) console.log(`  옮길 수 없음: ${plan.invalid.join(', ')}`);
if (!apply || plan.items.length === 0) process.exit(0);

/** 묶음 하나를 만들고 파일들을 올려 줄을 적는다 — 실패하면 오류 문장 */
const writeList = async (files, contentTypeOf, extOf) => {
  const listId = newId();
  const { error: listError } = await db.from('file_lists').insert({ id: listId, menu_id: menu.id });
  if (listError) return { error: `묶음: ${listError.message}` };
  const rows = [];
  for (const [i, f] of files.entries()) {
    const fileId = newId();
    const path = storagePath('resources', listId, fileId, extOf(f));
    const { error } = await db.storage.from('media').upload(path, readFileSync(repoFile(f.file)), {
      contentType: contentTypeOf(f),
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) return { error: `파일 ${i + 1} 올리기: ${error.message}` };
    rows.push({
      id: fileId,
      list_id: listId,
      sort: i + 1,
      bucket: 'media',
      path,
      kind: f.kind ?? 'IMAGE',
      width: f.width ?? null,
      height: f.height ?? null,
      bytes: statSync(repoFile(f.file)).size,
      original_name: f.originalName,
    });
  }
  if (rows.length) {
    const { error } = await db.from('files').insert(rows);
    if (error) return { error: `파일 줄(올린 파일: ${rows.map(r => r.path).join(', ')}): ${error.message}` };
  }
  return { listId };
};

let done = 0;
for (const item of plan.items) {
  const fail = msg => console.error(`  ✗ ${item.row.slug} — ${msg}`);
  let fileListId = null;
  if (item.original) {
    const res = await writeList(
      [item.original],
      f => (f.kind === 'PDF' ? 'application/pdf' : 'application/x-hwp'),
      f => f.ext
    );
    if (res.error) {
      fail(`원본 ${res.error}`);
      continue;
    }
    fileListId = res.listId;
  }
  const pages = await writeList(item.pages, () => 'image/webp', () => 'webp');
  if (pages.error) {
    fail(`쪽 그림 ${pages.error}`);
    continue;
  }
  const id = newId();
  const { error } = await db
    .from('resources')
    .insert({ id, ...item.row, file_list_id: fileListId, pages_list_id: pages.listId });
  if (error) {
    fail(`시트지: ${error.message}`);
    continue;
  }
  if (item.videoIds.length) {
    const { error: videoError } = await db
      .from('resource_videos')
      .insert(item.videoIds.map(video_id => ({ resource_id: id, video_id })));
    if (videoError) {
      fail(`영상 연결: ${videoError.message}`);
      continue;
    }
  }
  done += 1;
  if (done % 10 === 0) console.log(`  … ${done}/${plan.items.length}`);
}
console.log(`끝: ${done}/${plan.items.length}건을 옮겼습니다.`);
if (done < plan.items.length) process.exit(1);
