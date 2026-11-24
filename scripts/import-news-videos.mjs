// node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-news-videos.mjs [--local] [--apply]
// 기존 주일광고 · 성복의 뜰(시드 117편)을 DB 로 옮긴다(설계 7). 파일은 없다(유튜브 영상).
//
//   --local  로컬 Supabase(pnpm db:start)에 옮긴다. 주소 · 키는 CLI 에서 읽는다.
//   (없으면) SUPABASE_URL · SUPABASE_SECRET_KEY 환경변수의 프로젝트에 옮긴다 — 운영은 사용자 승인 뒤에만(CLAUDE.md).
//   --apply  실제로 쓴다. 없으면 무엇을 할지만 보인다.
//
// 여러 번 돌려도 같은 결과 — DB 에 같은 기존 글번호(legacy_id)나 같은 메뉴의 같은 영상이 있으면 건드리지 않는다(관리자에 있는 것이 이긴다).
// 한 번에 넣는다(한 문장). 등록한 사람은 «시스템»(서버 전용 키). 키는 출력하지 않는다. 일회용 — 운영 확인 뒤 시드와 함께 지운다.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';

import { uuidV7 } from '../src/domains/admin/lib/fileUpload.ts';
import { planNewsVideoImport } from '../src/domains/admin/lib/newsImportPlan.ts';
import { NEWS_VIDEOS_SEED } from '../src/domains/news/data/newsVideosSeed.ts';

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

const [{ data: existing, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
  db.from('news_videos').select('legacy_id, feed, video_id, deleted_at'),
  db
    .from('categories')
    .select('id, group_key, label')
    .in('group_key', ['ANNOUNCEMENTS_CATEGORY', 'GARDEN_CATEGORY']),
]);
if (e1 || e2) throw new Error(`읽지 못했습니다: ${(e1 ?? e2).message}`);
const plan = planNewsVideoImport(
  NEWS_VIDEOS_SEED,
  new Set(existing.filter(r => r.legacy_id).map(r => r.legacy_id)),
  Object.fromEntries(cats.map(c => [`${c.group_key}:${c.label}`, c.id])),
  // 같은 메뉴에 같은 영상(휴지통 아닌 것)은 하나 — 관리자가 먼저 올렸으면 건너뛴다
  new Set(existing.filter(r => r.video_id && !r.deleted_at).map(r => `${r.feed}:${r.video_id}`))
);
const by = feed => plan.rows.filter(r => r.feed === feed).length;
console.log(
  `옮길 글 ${plan.rows.length}편(주일광고 ${by('ANNOUNCEMENTS')} · 성복의 뜰 ${by('GARDEN')}) · 이미 있어 건너뜀 ${plan.skipped.length}편 · 옮길 수 없음 ${plan.invalid.length}편`
);
if (plan.invalid.length) console.log(`  옮길 수 없음: ${plan.invalid.join(', ')}`);
if (!apply || plan.rows.length === 0) process.exit(0);

// 오래된 글부터 id 를 매긴다(uuid v7 의 시각 순서가 등록 순서가 되게)
const rows = [...plan.rows]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(r => ({ id: uuidV7(Date.now(), webcrypto.getRandomValues(new Uint8Array(16))), ...r }));
const { error } = await db.from('news_videos').insert(rows);
if (error) {
  console.error(`넣지 못했습니다: ${error.message}`);
  process.exit(1);
}
console.log(`끝: ${rows.length}편을 옮겼습니다.`);
