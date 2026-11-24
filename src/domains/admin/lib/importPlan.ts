// 기존 자료 옮기기(설계 7)의 계획 — 시드의 어느 호를 옮기고 어느 것을 건너뛸지. 실제 쓰기는 scripts/import-bulletins.mjs.
// 스크립트가 Node 로 바로 불러 쓴다(타입만 지우고 돈다) — 이 파일은 값 import 를 두지 않는다(타입 import 만).
import type { BulletinIssue } from '@/domains/news/api/news.types';

export type PlannedPage = {
  /** 레포 안의 파일 경로(public/ 아래) */
  file: string;
  originalName: string;
  width: number;
  height: number;
};

export type BulletinImportPlan = {
  /** 옮길 호 — 오래된 주일부터(등록 순서가 날짜 순서가 되게) */
  issues: { date: string; pages: PlannedPage[] }[];
  /** DB 에 이미 있는 날짜(관리자에 있는 것이 이긴다 — 건드리지 않는다) */
  skipped: string[];
  /** 옮길 수 없는 호(임시저장 · 쪽 없음 · public/files 밖의 파일) — 보고만 한다 */
  invalid: string[];
};

const PAGE_SRC = /^\/files\/bulletin\/([\w.-]+\.webp)$/;

export const planBulletinImport = (
  seed: readonly BulletinIssue[],
  existingDates: ReadonlySet<string>
): BulletinImportPlan => {
  const plan: BulletinImportPlan = { issues: [], skipped: [], invalid: [] };
  for (const issue of seed) {
    if (existingDates.has(issue.date)) {
      plan.skipped.push(issue.date);
      continue;
    }
    const pages = issue.pages.map(p => {
      const name = PAGE_SRC.exec(p.src)?.[1];
      return name
        ? {
            file: `public/files/bulletin/${name}`,
            originalName: name,
            width: p.width,
            height: p.height,
          }
        : null;
    });
    if (issue.status !== 'published' || pages.length === 0 || pages.some(p => p === null)) {
      plan.invalid.push(issue.date);
      continue;
    }
    plan.issues.push({ date: issue.date, pages: pages as PlannedPage[] });
  }
  plan.issues.sort((a, b) => a.date.localeCompare(b.date));
  return plan;
};
