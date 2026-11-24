// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-albums.mjs [--local] [--apply] [--force]
// 기존 교회앨범(시드 4건 + public/files/album)을 DB · Storage 로 옮긴다(설계 7).
//
//   --local  로컬 Supabase(Storage 포함으로 띄울 것)에 옮긴다. 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트에 옮긴다 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — DB 에 같은 번호(slug, 휴지통 포함)가 있으면 건드리지 않는다. 오래된 앨범부터 넣는다(공개 화면은
// 등록 순서의 반대). 한 건씩: 묶음 → 그림 올리기 → 파일 줄 → 마지막에 앨범(공개, 기존 번호). 키는 출력하지 않는다.
// 일회용 — 운영 확인 뒤 시드 · public/files/album 과 함께 지운다.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { storagePath, uuidV7 } from '../src/domains/admin/lib/fileUpload.ts';
import { planAlbumImport } from '../src/domains/admin/lib/albumImportPlan.ts';
import { ALBUM_SEED } from '../src/domains/news/data/albumSeed.ts';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const force = args.has('--force');

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

const [{ data: existing, error: e1 }, { data: cats, error: e2 }, { data: menu, error: e3 }] =
  await Promise.all([
    db.from('albums').select('slug, deleted_at'),
    db.from('categories').select('id, label').eq('group_key', 'ALBUM_CATEGORY'),
    db.from('menus').select('id').eq('area', 'ADMIN').eq('key', 'album').single(),
  ]);
if (e1 || e2 || e3) throw new Error(`읽지 못했습니다: ${(e1 ?? e2 ?? e3).message}`);
const plan = planAlbumImport(
  ALBUM_SEED,
  new Set(existing.map(r => r.slug)),
  Object.fromEntries(cats.map(c => [c.label, c.id]))
);
const imageCount = plan.albums.reduce((n, a) => n + a.images.length, 0);
console.log(
  `옮길 앨범 ${plan.albums.length}건(그림 ${imageCount}장) · 이미 있어 건너뜀 ${plan.skipped.length}건 · 옮길 수 없음 ${plan.invalid.length}건`
);
if (plan.invalid.length) console.log(`  옮길 수 없음: ${plan.invalid.join(', ')}`);
// 등록 시각은 DB 가 넣는 시각(stamp)이라 옮긴 앨범은 지금 시각을 받는다 — 이미 새 앨범(번호 1000 이상)이 있으면 옮긴 앨범이
// 그 위(공개 화면 맨 위)로 올라간다. 알리고 멈춘다(그래도 옮기려면 --force)
const newer = existing.filter(r => !r.deleted_at && Number(r.slug) >= 1000).map(r => r.slug);
if (newer.length && plan.albums.length)
  console.log(`  주의: 새 앨범(${newer.join(', ')})이 이미 있어 옮긴 앨범이 그 위로 올라갑니다.`);
if (!apply || plan.albums.length === 0) process.exit(0);
if (newer.length && !force) {
  console.error('멈춥니다 — 순서가 바뀌어도 옮기려면 --force 를 더해 다시 돌리세요.');
  process.exit(1);
}

let done = 0;
for (const album of plan.albums) {
  const fail = (step, error) => console.error(`  ✗ ${album.slug} — ${step}: ${error?.message ?? error}`);
  const listId = newId();
  const { error: listError } = await db.from('file_lists').insert({ id: listId, menu_id: menu.id });
  if (listError) {
    fail('묶음', listError);
    continue;
  }
  const rows = [];
  let ok = true;
  for (const [i, image] of album.images.entries()) {
    const fileId = newId();
    const path = storagePath('album', listId, fileId, 'webp');
    const file = fileURLToPath(new URL(`../${image.file}`, import.meta.url)); // 레포 루트 기준
    const { error } = await db.storage.from('media').upload(path, readFileSync(file), {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      fail(`그림 ${i + 1} 올리기`, error);
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
      width: image.width,
      height: image.height,
      bytes: statSync(file).size,
      original_name: image.originalName,
    });
  }
  if (!ok) continue;
  const { error: filesError } = await db.from('files').insert(rows);
  if (filesError) {
    // 올린 그림을 가리키는 줄이 없으니 손으로 지울 수 있게 경로를 남긴다
    fail(`파일 줄(올린 그림: ${rows.map(r => r.path).join(', ')})`, filesError);
    continue;
  }
  const { error: albumError } = await db.from('albums').insert({
    id: newId(),
    slug: album.slug,
    title: album.title,
    category_id: album.categoryId,
    images_list_id: listId,
    status: 'PUBLISHED',
  });
  if (albumError) {
    fail('앨범', albumError);
    continue;
  }
  done += 1;
}
console.log(`끝: ${done}/${plan.albums.length}건을 옮겼습니다.`);
if (done < plan.albums.length) process.exit(1);
