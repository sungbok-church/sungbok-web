import { describe, expect, it } from 'vitest';

import {
  latestReferenceMigration,
  nextMigrationVersion,
  referenceMigrationBody,
  referenceMigrationNeeded,
} from '../../scripts/lib/dbSync.mjs';

describe('latestReferenceMigration', () => {
  it('초기 행 변경 파일 중 가장 늦은 것을 고른다', () => {
    expect(
      latestReferenceMigration([
        '20261117125644_enums.sql',
        '20261119083534_reference.sql',
        '20261201000000_schema.sql',
        '20261202000000_reference.sql',
      ])
    ).toBe('20261202000000_reference.sql');
  });

  it('없으면 null', () => {
    expect(latestReferenceMigration(['20261117125644_enums.sql'])).toBeNull();
  });
});

describe('referenceMigrationNeeded', () => {
  const source = "insert into public.code_groups values ('a', 'A');\n";

  it('초기 행 변경 파일이 아직 없으면 만든다', () => {
    expect(referenceMigrationNeeded(null, source)).toBe(true);
  });

  it('마지막 변경 파일과 내용이 같으면 만들지 않는다', () => {
    expect(referenceMigrationNeeded(referenceMigrationBody(source), source)).toBe(false);
  });

  it('reference.sql 이 바뀌었으면 만든다', () => {
    expect(referenceMigrationNeeded(referenceMigrationBody(source), source + '-- 더함\n')).toBe(
      true
    );
  });
});

describe('referenceMigrationBody', () => {
  it('자동 생성 표시를 머리에 달고 원문을 그대로 담는다', () => {
    const body = referenceMigrationBody('select 1;\n');
    expect(body.startsWith('-- 자동 생성')).toBe(true);
    expect(body.endsWith('select 1;\n')).toBe(true);
  });
});

describe('nextMigrationVersion', () => {
  it('지금 시각(UTC)을 YYYYMMDDHHMMSS 로', () => {
    expect(nextMigrationVersion([], new Date('2026-11-19T08:35:34Z'))).toBe('20261119083534');
  });

  it('이미 있는 변경 파일보다 늦거나 같으면 1초씩 뒤로 민다 — 순서가 뒤집히지 않게', () => {
    expect(
      nextMigrationVersion(['20261119083534_schema.sql'], new Date('2026-11-19T08:35:34Z'))
    ).toBe('20261119083535');
    expect(
      nextMigrationVersion(['20261119090000_schema.sql'], new Date('2026-11-19T08:35:34Z'))
    ).toBe('20261119090001');
  });
});
