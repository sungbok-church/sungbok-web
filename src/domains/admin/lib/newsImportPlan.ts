// 기존 주일광고 · 성복의 뜰 옮기기(설계 7)의 계획 — 시드의 어느 글을 어떤 DB 행으로 옮기고 어느 것을 건너뛸지.
// 실제 쓰기는 scripts/import-news-videos.mjs. 스크립트가 Node 로 바로 불러 쓴다 — 값 import 를 두지 않는다(타입 import 만).
import type { NewsVideo } from '@/domains/news/api/news.types';

export type NewsVideoImportRow = {
  legacy_id: string;
  feed: 'ANNOUNCEMENTS' | 'GARDEN';
  title: string;
  category_id: string;
  date: string;
  date_from: 'EVENT' | 'UPLOAD';
  video_id: string | null;
  thumbnail: string | null;
  poster: string | null;
  description: string | null;
  status: 'PUBLISHED';
};

export type NewsVideoImportPlan = {
  rows: NewsVideoImportRow[];
  /** DB 에 이미 있는 글번호 · 같은 메뉴에 이미 있는 영상(관리자에 있는 것이 이긴다 — 건드리지 않는다) */
  skipped: string[];
  /** 옮길 수 없는 글(임시저장 · 분류 없음 · 글번호 모양이 틀림) — 보고만 한다 */
  invalid: string[];
};

const LEGACY_ID = /^[0-9]{4}-[0-9]+$/;

/**
 * categories: «분류 묶음:분류 이름» → 분류 id(주일광고 분류 · 성복의 뜰 분류). 같은 글번호(legacy_id)가 DB 에 있거나,
 * 같은 메뉴에 같은 영상(existingVideos — «ANNOUNCEMENTS:영상 id», 휴지통 아닌 것)이 있으면 건너뛴다 — 여러 번 돌려도 같은 결과이고,
 * 관리자가 먼저 올린 영상 때문에 넣기가 통째로 실패하지 않는다(같은 메뉴에 같은 영상은 하나 — DB).
 */
export const planNewsVideoImport = (
  seed: readonly NewsVideo[],
  existingLegacyIds: ReadonlySet<string>,
  categories: Readonly<Record<string, string>>,
  existingVideos: ReadonlySet<string>
): NewsVideoImportPlan => {
  const plan: NewsVideoImportPlan = { rows: [], skipped: [], invalid: [] };
  for (const v of seed) {
    const feed = v.feed === 'announcements' ? 'ANNOUNCEMENTS' : 'GARDEN';
    if (existingLegacyIds.has(v.id) || (v.videoId && existingVideos.has(`${feed}:${v.videoId}`))) {
      plan.skipped.push(v.id);
      continue;
    }
    const group = v.feed === 'announcements' ? 'ANNOUNCEMENTS_CATEGORY' : 'GARDEN_CATEGORY';
    const categoryId = categories[`${group}:${v.category}`];
    if (v.status !== 'published' || !categoryId || !LEGACY_ID.test(v.id)) {
      plan.invalid.push(v.id);
      continue;
    }
    plan.rows.push({
      legacy_id: v.id,
      feed,
      title: v.title,
      category_id: categoryId,
      date: v.date,
      date_from: v.dateFrom === 'upload' ? 'UPLOAD' : 'EVENT',
      video_id: v.videoId || null,
      thumbnail: v.thumbnail || null,
      poster: v.poster || null,
      description: v.description || null,
      status: 'PUBLISHED',
    });
  }
  return plan;
};
