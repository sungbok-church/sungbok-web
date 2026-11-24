// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-departments.mjs [--local] [--apply]
// 다음세대 부서 8곳의 지금 값(data/departments — 소개 · 담당자 · 사진)을 DB · Storage 로 옮긴다(설계 6.13 · 7).
//
//   --local  로컬 Supabase(Storage 포함으로 띄울 것)에 옮긴다. 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트에 옮긴다 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — DB 에 이미 있는 부서는 건드리지 않는다(관리자에 있는 것이 이긴다). 여러 부서가 같이 쓰는 사진은
// Storage 에 한 번만 올리고 부서마다 파일 줄을 둔다. 사진은 관리자 올리기와 같게: 긴 변 2000px 안팎 WebP + 폭별 파일
// (640 · 960 · 1280 · 1920 중 원본보다 좁은 것). 키는 출력하지 않는다. 일회용 — 운영 확인 뒤 코드의 값과 함께 지운다.
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

// 데이터 파일의 `@/…` 경로와 사진 import(.webp 등)를 Node 에서 읽게 — 사진은 { src: 레포 안 파일 경로 } 로 바꾼다
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) {
      const url = new URL(`src/${spec.slice(2)}`, ROOT).href;
      return next(/\.[a-z]+$/.test(spec) ? url : `${url}.ts`, ctx);
    }
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (/\.(webp|png|jpe?g)$/.test(url))
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${JSON.stringify({ src: fileURLToPath(url) })}`,
      };
    return next(url, ctx);
  },
});

const { storagePath, uuidV7, VARIANT_WIDTHS, MAX_IMAGE_EDGE } = await import(
  new URL('src/domains/admin/lib/fileUpload.ts', ROOT).href
);
const { planDepartmentImport } = await import(
  new URL('src/domains/admin/lib/departmentImportPlan.ts', ROOT).href
);
const { DEPARTMENTS } = await import(
  new URL('src/domains/next-generation/data/departments.ts', ROOT).href
);

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

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

const [{ data: existing, error: e1 }, { data: roles, error: e2 }, { data: menu, error: e3 }] =
  await Promise.all([
    db.from('departments').select('slug'),
    db.from('codes').select('id, code').eq('group_key', 'STAFF_ROLE'),
    db.from('menus').select('id').eq('area', 'ADMIN').eq('key', 'departments').single(),
  ]);
if (e1 || e2 || e3) throw new Error(`읽지 못했습니다: ${(e1 ?? e2 ?? e3).message}`);
const plan = planDepartmentImport(
  DEPARTMENTS,
  new Set(existing.map(r => r.slug)),
  Object.fromEntries(roles.map(r => [r.code, r.id]))
);
const staffCount = plan.departments.reduce((n, d) => n + d.staff.length, 0);
console.log(
  `옮길 부서 ${plan.departments.length}곳(담당자 ${staffCount}명 · 올릴 사진 ${plan.files.length}장) · 이미 있어 건너뜀 ${plan.skipped.length}곳 · 옮길 수 없음 ${plan.invalid.length}곳`
);
if (plan.invalid.length) console.log(`  옮길 수 없음: ${plan.invalid.join(', ')}`);
if (!apply || plan.departments.length === 0) process.exit(0);

// 1) 사진 올리기 — 한 폴더(묶음 없이 경로만)에 원본 · 폭별 파일. 파일 줄은 부서마다 따로 둔다
const folder = newId();
const upload = async (buffer, label) => {
  const path = storagePath('departments', folder, newId(), 'webp');
  const { error } = await db.storage.from('media').upload(path, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`${label} 올리기: ${error.message}`);
  return path;
};
const uploaded = new Map();
for (const file of plan.files) {
  const source = readFileSync(file);
  const meta = await sharp(source).metadata();
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(meta.width, meta.height));
  const width = Math.round(meta.width * scale);
  const height = Math.round(meta.height * scale);
  const main =
    scale < 1 || meta.format !== 'webp'
      ? await sharp(source).resize(width, height).webp({ quality: 85 }).toBuffer()
      : source;
  const path = await upload(main, file);
  const variants = [];
  for (const w of VARIANT_WIDTHS.filter(v => v < width)) {
    const h = Math.round((height * w) / width);
    variants.push([
      w,
      await upload(
        await sharp(source).resize(w, h).webp({ quality: 85 }).toBuffer(),
        `${file} ${w}px`
      ),
    ]);
  }
  uploaded.set(file, { path, width, height, bytes: main.length, variants });
  console.log(`  ↑ ${file.replace(new URL('src/', ROOT).pathname, '')} (${variants.length + 1}개)`);
}

// 2) 부서마다 — 사진 묶음 → 부서 행 → 담당자(사진 묶음 → 담당자 행)
const writeList = async (items, label) => {
  const listId = newId();
  const { error } = await db.from('file_lists').insert({ id: listId, menu_id: menu.id });
  if (error) throw new Error(`${label} 묶음: ${error.message}`);
  const rows = items.map(({ file, alt }, i) => {
    const u = uploaded.get(file);
    return {
      list_id: listId,
      sort: i + 1,
      bucket: 'media',
      path: u.path,
      kind: 'IMAGE',
      width: u.width,
      height: u.height,
      bytes: u.bytes,
      original_name: file.split('/').pop(),
      alt: alt ?? null,
      variants: u.variants,
    };
  });
  if (rows.length) {
    const { error: fe } = await db.from('files').insert(rows);
    if (fe) throw new Error(`${label} 파일 줄: ${fe.message}`);
  }
  return listId;
};

let done = 0;
for (const d of plan.departments) {
  let deptId = null;
  try {
    const photosListId = await writeList(d.photos, `${d.dbSlug} 사진`);
    deptId = newId();
    const { error } = await db.from('departments').insert({
      id: deptId,
      slug: d.dbSlug,
      ages: d.ages,
      tagline: d.tagline,
      intro: d.intro,
      extra: d.extra,
      photos_list_id: photosListId,
    });
    if (error) throw new Error(`부서: ${error.message}`);
    for (const [i, s] of d.staff.entries()) {
      const photoListId = s.photo
        ? await writeList([{ file: s.photo, alt: null }], `${d.dbSlug} ${s.name}`)
        : null;
      const { error: se } = await db.from('department_staff').insert({
        department_id: deptId,
        sort: i + 1,
        name: s.name,
        role_id: s.roleId,
        greeting: s.greeting,
        photo_list_id: photoListId,
      });
      if (se) throw new Error(`담당자 ${s.name}: ${se.message}`);
    }
    done += 1;
    console.log(`  ✓ ${d.dbSlug} — 사진 ${d.photos.length} · 담당자 ${d.staff.length}`);
  } catch (e) {
    console.error(`  ✗ ${d.dbSlug} — ${e.message}`);
    // 부서 행이 남으면 다시 돌릴 때 «이미 있음» 으로 건너뛰어 남은 담당자가 영영 들어가지 않는다 — 지운다(담당자는 함께 지워진다)
    if (deptId) {
      const { error: re } = await db.from('departments').delete().eq('id', deptId);
      if (re) console.error(`    되돌리지 못했습니다 — 손으로 지워 주세요: ${re.message}`);
    }
  }
}
console.log(`끝: ${done}/${plan.departments.length}곳을 옮겼습니다.`);
if (done < plan.departments.length) process.exit(1);
