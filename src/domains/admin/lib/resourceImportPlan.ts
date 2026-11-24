// 기존 설교 시트지 옮기기(설계 7)의 계획 — 시드의 어느 자료를 어떤 DB 행 · 파일로 옮기고 어느 것을 건너뛸지.
// 실제 쓰기는 scripts/import-resources.mjs. 스크립트가 Node 로 바로 불러 쓴다 — 값 import 를 두지 않는다(타입 import 만).
import type { Resource } from '@/domains/resources/api/resource.types';

type Section = 'SUNDAY' | 'SERIES' | 'SEASONAL';
const SECTIONS: Record<Resource['section'], { key: Section; group: string }> = {
  sunday: { key: 'SUNDAY', group: 'RESOURCE_SUNDAY' },
  series: { key: 'SERIES', group: 'RESOURCE_SERIES' },
  seasonal: { key: 'SEASONAL', group: 'RESOURCE_SEASONAL' },
};

export type ResourceImportItem = {
  row: {
    slug: string;
    section: Section;
    series_id: string;
    episode: number | null;
    title: string;
    date: string | null;
    year: number | null;
    passage: string | null;
    status: 'PUBLISHED';
  };
  /** 원본(레포 안의 파일) — 없을 수 있다 */
  original: { file: string; originalName: string; kind: 'PDF' | 'HWP'; ext: 'pdf' | 'hwp' } | null;
  pages: { file: string; originalName: string; width: number; height: number }[];
  videoIds: string[];
};

export type ResourceImportPlan = {
  items: ResourceImportItem[];
  /** DB 에 이미 있는 번호(휴지통 포함 — 관리자에 있는 것이 이긴다) */
  skipped: string[];
  /** 옮길 수 없는 자료(임시저장 · 묶음 없음 · public/files 밖) — 보고만 한다 */
  invalid: string[];
};

const ORIGINAL = /^\/files\/resources\/([\w.-]+\.(pdf|hwp))$/;
const PAGE = /^\/files\/resources\/pages\/([\w.-]+\.webp)$/;

/** series: «분류 묶음:묶음 이름» → 분류 id */
export const planResourceImport = (
  seed: readonly Resource[],
  existingSlugs: ReadonlySet<string>,
  series: Readonly<Record<string, string>>
): ResourceImportPlan => {
  const plan: ResourceImportPlan = { items: [], skipped: [], invalid: [] };
  for (const r of seed) {
    if (existingSlugs.has(r.id)) {
      plan.skipped.push(r.id);
      continue;
    }
    const section = SECTIONS[r.section];
    const seriesId = series[`${section.group}:${r.group}`];
    const originalMatch = r.file ? ORIGINAL.exec(r.file.url) : null;
    const pages = r.pages.map(p => {
      const name = PAGE.exec(p.src)?.[1];
      return name
        ? {
            file: `public/files/resources/pages/${name}`,
            originalName: name,
            width: p.width,
            height: p.height,
          }
        : null;
    });
    if (
      r.status !== 'published' ||
      !seriesId ||
      (r.file && !originalMatch) ||
      pages.some(p => p === null)
    ) {
      plan.invalid.push(r.id);
      continue;
    }
    plan.items.push({
      row: {
        slug: r.id,
        section: section.key,
        series_id: seriesId,
        episode: r.episode ?? null,
        title: r.title,
        date: r.date ?? null,
        year: r.date ? null : r.year ? Number(r.year) : null,
        passage: r.passage ?? null,
        status: 'PUBLISHED',
      },
      original:
        r.file && originalMatch
          ? {
              file: `public/files/resources/${originalMatch[1]}`,
              originalName: r.file.name,
              kind: originalMatch[2] === 'pdf' ? 'PDF' : 'HWP',
              ext: originalMatch[2] as 'pdf' | 'hwp',
            }
          : null,
      pages: pages as ResourceImportItem['pages'],
      videoIds: [...r.videoIds],
    });
  }
  return plan;
};
