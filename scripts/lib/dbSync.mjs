// `pnpm db:sync` 의 순수 판단 — 초기 행 변경 파일을 새로 만들지, 변경 파일 번호를 무엇으로 할지.
// 파일을 읽고 쓰는 일은 scripts/db-sync.mjs 가 한다.

const REFERENCE_SUFFIX = '_reference.sql';
const HEADER =
  '-- 자동 생성 — `pnpm db:sync` 가 supabase/reference.sql 을 그대로 옮겼다. 손으로 고치지 않는다.\n\n';

/** 변경 파일 이름들 중 가장 늦은 초기 행 변경 파일(없으면 null). 이름 앞의 번호가 시각이라 글자 순서 = 시간 순서. */
export const latestReferenceMigration = names =>
  names
    .filter(name => name.endsWith(REFERENCE_SUFFIX))
    .sort()
    .at(-1) ?? null;

/** 초기 행 변경 파일의 내용 — 머리 표시 + reference.sql 원문. */
export const referenceMigrationBody = source => HEADER + source;

/** 마지막 초기 행 변경 파일(없으면 null)과 지금 reference.sql 이 다르면 새로 만든다. */
export const referenceMigrationNeeded = (latestContent, source) =>
  latestContent !== referenceMigrationBody(source);

const toVersion = date => date.toISOString().replace(/\D/g, '').slice(0, 14);

const fromVersion = version =>
  new Date(
    Date.UTC(
      Number(version.slice(0, 4)),
      Number(version.slice(4, 6)) - 1,
      Number(version.slice(6, 8)),
      Number(version.slice(8, 10)),
      Number(version.slice(10, 12)),
      Number(version.slice(12, 14))
    )
  );

/**
 * 새 변경 파일 번호(UTC YYYYMMDDHHMMSS). 이미 있는 가장 늦은 번호보다 늦지 않으면 그 번호 + 1초 —
 * 같은 초에 두 파일(구조 · 초기 행)을 만들어도 순서가 뒤집히지 않게.
 */
export const nextMigrationVersion = (names, now) => {
  const latest = names
    .map(name => name.slice(0, 14))
    .filter(version => /^\d{14}$/.test(version))
    .sort()
    .at(-1);
  const candidate = toVersion(now);
  if (!latest || candidate > latest) return candidate;
  return toVersion(new Date(fromVersion(latest).getTime() + 1000));
};
