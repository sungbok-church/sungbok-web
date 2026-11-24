// 다음세대 부서 옮기기(설계 6.13 · 7)의 계획 — 지금 코드의 값(data/departments)에서 무엇을 DB 로 옮길지. 실제 쓰기는
// scripts/import-departments.mjs. 스크립트가 Node 로 바로 불러 쓴다 — 값 import 를 두지 않는다(타입 import 만).
// 사진 import 는 스크립트의 로더가 { src: 레포 안 파일 경로 } 로 바꿔 준다.

type SeedPhoto = { src: string };
type SeedDepartment = {
  dept: {
    ages: string;
    tagline: string;
    intro: string;
    staff: readonly { name: string; role: string; photo?: SeedPhoto; greeting?: string }[];
  };
  photos: readonly { src: SeedPhoto; alt: string }[];
};

/** 지금 직함(글자) → 공통코드 STAFF_ROLE */
const ROLE_CODE: Record<string, string> = {
  목사: 'PASTOR',
  전도사: 'EVANGELIST',
  간사: 'COORDINATOR',
};

export type DepartmentImportPlan = {
  departments: {
    dbSlug: string;
    ages: string;
    tagline: string;
    intro: string;
    /** 지금 값은 모두 자리표시라 비운다 — 부서가 직접 적는다(계획 «내가 정한 값») */
    extra: null;
    photos: { file: string; alt: string }[];
    staff: { name: string; roleId: string; greeting: string | null; photo: string | null }[];
  }[];
  /** 올릴 사진 — 여러 부서가 같이 쓰는 사진은 한 번만(처음 나온 순서) */
  files: string[];
  /** DB 에 이미 있는 부서(관리자에 있는 것이 이긴다) */
  skipped: string[];
  /** 옮길 수 없는 부서 — 보고만 한다 */
  invalid: string[];
};

/** roleIds: STAFF_ROLE 코드 → 코드 id */
export const planDepartmentImport = (
  seed: Readonly<Record<string, SeedDepartment>>,
  existing: ReadonlySet<string>,
  roleIds: Readonly<Record<string, string>>
): DepartmentImportPlan => {
  const plan: DepartmentImportPlan = { departments: [], files: [], skipped: [], invalid: [] };
  for (const [slug, { dept, photos }] of Object.entries(seed)) {
    const dbSlug = slug.toUpperCase().replace(/-/g, '_');
    if (existing.has(dbSlug)) {
      plan.skipped.push(dbSlug);
      continue;
    }
    const unknown = dept.staff.find(s => !roleIds[ROLE_CODE[s.role] ?? '']);
    if (unknown) {
      plan.invalid.push(`${dbSlug}: 직함 «${unknown.role}»`);
      continue;
    }
    plan.departments.push({
      dbSlug,
      ages: dept.ages,
      tagline: dept.tagline,
      intro: dept.intro,
      extra: null,
      photos: photos.map(p => ({ file: p.src.src, alt: p.alt })),
      staff: dept.staff.map(s => ({
        name: s.name,
        roleId: roleIds[ROLE_CODE[s.role]],
        greeting: s.greeting ?? null,
        photo: s.photo?.src ?? null,
      })),
    });
  }
  const files = new Set<string>();
  for (const d of plan.departments) {
    for (const p of d.photos) files.add(p.file);
    for (const s of d.staff) if (s.photo) files.add(s.photo);
  }
  plan.files = [...files];
  return plan;
};
