// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-home-hero.mjs [--local] [--apply]
// 홈 히어로의 지금 사진(src/assets/images/main/main01.webp)을 DB · Storage 로 옮겨 설정 한 줄을 만든다(설계 6.12 · 7).
//
//   --local  로컬 Supabase(Storage 포함으로 띄울 것). 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — 설정 줄이 이미 있으면 건드리지 않는다(관리자에 있는 것이 이긴다). 사진은 관리자 올리기와 같게
// 긴 변 2000px WebP + 폭별 파일. 레포의 main01 은 지우지 않는다 — 장애 대비 사진이고 홈의 다른 곳도 쓴다. 일회용.
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const { storagePath, uuidV7, VARIANT_WIDTHS, MAX_IMAGE_EDGE } = await import(
  new URL('src/domains/admin/lib/fileUpload.ts', ROOT).href
);
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

const SOURCE = fileURLToPath(new URL('src/assets/images/main/main01.webp', ROOT));
const ALT = '성복교회 전경';
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

const [{ data: existing, error: e1 }, { data: menu, error: e2 }] = await Promise.all([
  db.from('home_hero').select('id'),
  db.from('menus').select('id').eq('area', 'ADMIN').eq('key', 'home-hero').single(),
]);
if (e1 || e2) throw new Error(`읽지 못했습니다: ${(e1 ?? e2).message}`);
if (existing.length > 0) {
  console.log('홈 히어로 설정이 이미 있어 건너뜁니다.');
  process.exit(0);
}
console.log(`옮길 것: 설정 한 줄(사진) + 사진 ${SOURCE.split('/').pop()}`);
if (!apply) process.exit(0);

const listId = newId();
const { error: le } = await db.from('file_lists').insert({ id: listId, menu_id: menu.id });
if (le) throw new Error(`묶음: ${le.message}`);
const upload = async (buffer, label) => {
  const path = storagePath('home-hero', listId, newId(), 'webp');
  const { error } = await db.storage.from('media').upload(path, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`${label} 올리기: ${error.message}`);
  return path;
};
const source = readFileSync(SOURCE);
const meta = await sharp(source).metadata();
const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(meta.width, meta.height));
const width = Math.round(meta.width * scale);
const height = Math.round(meta.height * scale);
const main =
  scale < 1 ? await sharp(source).resize(width, height).webp({ quality: 85 }).toBuffer() : source;
const path = await upload(main, '원본');
const variants = [];
for (const w of VARIANT_WIDTHS.filter(v => v < width)) {
  const h = Math.round((height * w) / width);
  variants.push([
    w,
    await upload(await sharp(source).resize(w, h).webp({ quality: 85 }).toBuffer(), `${w}px`),
  ]);
}
const { error: fe } = await db.from('files').insert({
  list_id: listId,
  sort: 1,
  bucket: 'media',
  path,
  kind: 'IMAGE',
  width,
  height,
  bytes: main.length,
  original_name: 'main01.webp',
  alt: ALT,
  variants,
});
if (fe) throw new Error(`파일 줄: ${fe.message}`);
const { error: he } = await db.from('home_hero').insert({ kind: 'PHOTO', photo_list_id: listId });
if (he) throw new Error(`설정 줄: ${he.message}`);
console.log(
  `끝: 홈 히어로 설정을 만들었습니다(사진 ${width}×${height} · 폭별 파일 ${variants.length}개).`
);
