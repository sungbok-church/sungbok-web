// 기존 교회앨범 옮기기(설계 7)의 계획 — 시드의 어느 앨범을 옮기고 어느 것을 건너뛸지. 실제 쓰기는 scripts/import-albums.mjs.
// 스크립트가 Node 로 바로 불러 쓴다 — 값 import 를 두지 않는다(타입 import 만).
import type { Album } from '@/domains/news/api/news.types';

/** 옮길 그림 한 장 — 레포 안의 파일(public/ 아래)과 원래 이름 · 크기 */
export type PlannedPage = { file: string; originalName: string; width: number; height: number };

export type AlbumImportPlan = {
  /** 옮길 앨범 — 오래된 것부터(시드는 최신이 앞이라 뒤집는다 — 공개 화면은 등록 순서의 반대) */
  albums: { slug: string; title: string; categoryId: string; images: PlannedPage[] }[];
  /** DB 에 이미 있는 번호(휴지통 포함 — 관리자에 있는 것이 이긴다) */
  skipped: string[];
  /** 옮길 수 없는 앨범(임시저장 · 분류 없음 · 그림 없음 · public/files 밖) — 보고만 한다 */
  invalid: string[];
};

const IMAGE_SRC = /^\/files\/album\/([\w.-]+\.webp)$/;

/** categories: 앨범 분류 이름 → 분류 id */
export const planAlbumImport = (
  seed: readonly Album[],
  existingSlugs: ReadonlySet<string>,
  categories: Readonly<Record<string, string>>
): AlbumImportPlan => {
  const plan: AlbumImportPlan = { albums: [], skipped: [], invalid: [] };
  for (const a of seed) {
    if (existingSlugs.has(a.id)) {
      plan.skipped.push(a.id);
      continue;
    }
    const images = a.images.map(p => {
      const name = IMAGE_SRC.exec(p.src)?.[1];
      return name
        ? {
            file: `public/files/album/${name}`,
            originalName: name,
            width: p.width,
            height: p.height,
          }
        : null;
    });
    const categoryId = categories[a.category];
    if (
      a.status !== 'published' ||
      !categoryId ||
      images.length === 0 ||
      images.some(p => p === null) ||
      !/^[0-9]+$/.test(a.id)
    ) {
      plan.invalid.push(a.id);
      continue;
    }
    plan.albums.push({ slug: a.id, title: a.title, categoryId, images: images as PlannedPage[] });
  }
  plan.albums.reverse();
  return plan;
};
