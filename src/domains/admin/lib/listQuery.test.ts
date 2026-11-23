import { describe, expect, it } from 'vitest';

import {
  activeConditions,
  canApplyDates,
  canResetList,
  hasConditions,
  isCompleteDate,
  type ListSpec,
  listQueryHref,
  orIlike,
  PAGE_SIZE,
  PAGE_SIZES,
  parseListQuery,
  rangeOf,
} from './listQuery';

const SPEC: ListSpec = {
  sorts: ['name', 'created_at'],
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: { status: ['draft', 'published'], group: null },
};

describe('parseListQuery', () => {
  it('값이 없으면 기본값', () => {
    expect(parseListQuery({}, SPEC)).toEqual({
      q: '',
      page: 1,
      size: 20,
      sort: 'created_at',
      dir: 'desc',
      filters: {},
      trash: false,
      from: '',
      to: '',
    });
  });

  it('주소의 값을 읽는다', () => {
    expect(
      parseListQuery(
        {
          q: ' 홍길동 ',
          page: '3',
          sort: 'name',
          dir: 'asc',
          status: 'draft',
          group: 'abc',
          trash: '1',
        },
        SPEC
      )
    ).toEqual({
      q: '홍길동',
      page: 3,
      size: 20,
      sort: 'name',
      dir: 'asc',
      filters: { status: 'draft', group: 'abc' },
      trash: true,
      from: '',
      to: '',
    });
  });

  it('틀린 값은 버리고 기본값으로(던지지 않는다)', () => {
    const q = parseListQuery(
      {
        page: '-2',
        sort: 'password',
        dir: 'sideways',
        status: 'deleted',
        unknown: 'x',
        q: ['a', 'b'],
      },
      SPEC
    );
    expect(q).toMatchObject({ page: 1, sort: 'created_at', dir: 'desc', filters: {}, q: 'a' });
    expect(parseListQuery({ page: 'abc' }, SPEC).page).toBe(1);
    expect(parseListQuery({ page: '99999999999' }, SPEC).page).toBe(10000);
  });

  it('검색어는 100자까지', () => {
    expect(parseListQuery({ q: 'ㄱ'.repeat(150) }, SPEC).q).toHaveLength(100);
  });

  it('주소에 검색어를 남기지 않는 목록(새가족)은 q 를 읽지 않는다', () => {
    expect(parseListQuery({ q: '홍길동' }, { ...SPEC, searchInUrl: false }).q).toBe('');
  });
});

describe('listQueryHref', () => {
  const base = parseListQuery({}, SPEC);

  it('기본값은 주소에서 뺀다', () => {
    expect(listQueryHref('/admin/users', base, {}, SPEC)).toBe('/admin/users');
  });

  it('바꾼 값만 싣고, 필터 · 검색이 바뀌면 1쪽으로 돌아간다', () => {
    const q = { ...base, page: 4 };
    expect(listQueryHref('/admin/users', q, { filters: { status: 'draft' } }, SPEC)).toBe(
      '/admin/users?status=draft'
    );
    expect(listQueryHref('/admin/users', q, { page: 5 }, SPEC)).toBe('/admin/users?page=5');
    expect(
      listQueryHref('/admin/users', base, { q: '홍 길동', sort: 'name', dir: 'asc' }, SPEC)
    ).toBe('/admin/users?q=%ED%99%8D+%EA%B8%B8%EB%8F%99&sort=name&dir=asc');
  });

  it('왕복하면 같은 상태', () => {
    const q = parseListQuery(
      { q: 'a', page: '2', sort: 'name', status: 'published', trash: '1' },
      SPEC
    );
    const href = listQueryHref('/x', q, {}, SPEC);
    const params = Object.fromEntries(new URL(href, 'http://h').searchParams);
    expect(parseListQuery(params, SPEC)).toEqual(q);
  });

  it('주소에 검색어를 남기지 않는 목록은 q 를 싣지 않는다', () => {
    expect(listQueryHref('/x', base, { q: '홍길동' }, { ...SPEC, searchInUrl: false })).toBe('/x');
  });
});

describe('rangeOf', () => {
  it(`한 쪽에 ${PAGE_SIZE}개, 0 부터`, () => {
    expect(PAGE_SIZE).toBe(20);
    expect(rangeOf(1)).toEqual([0, 19]);
    expect(rangeOf(3)).toEqual([40, 59]);
  });
});

describe('orIlike', () => {
  it('여러 칸 중 하나라도 검색어를 포함 — 값은 따옴표 안에 둔다', () => {
    expect(orIlike(['name', 'email'], '홍길동')).toBe(
      'name.ilike."*홍길동*",email.ilike."*홍길동*"'
    );
  });

  it('필터 문법을 끼워 넣어도 값으로만 다뤄진다(따옴표 · 역슬래시 이스케이프)', () => {
    expect(orIlike(['name'], 'a",email.eq.x')).toBe('name.ilike."*a\\",email.eq.x*"');
    expect(orIlike(['name'], 'a\\b')).toBe('name.ilike."*a\\\\b*"');
  });

  it('칸 이름은 영문 소문자 · _ 만(코드가 주는 값이라도 지킨다)', () => {
    expect(() => orIlike(['name;drop'], 'x')).toThrow();
  });
});

describe('쪽당 개수 · 기간', () => {
  const DATED: ListSpec = { ...SPEC, dateRange: true };

  it('쪽당 개수는 10 · 20 · 50 · 100 중 하나(그 밖은 기본 20, 주어진 기본값이 있으면 그것)', () => {
    expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
    expect(parseListQuery({ size: '50' }, SPEC).size).toBe(50);
    expect(parseListQuery({ size: '7' }, SPEC).size).toBe(20);
    expect(parseListQuery({}, SPEC, { size: 100 }).size).toBe(100);
    expect(parseListQuery({ size: '10' }, SPEC, { size: 100 }).size).toBe(10);
  });

  it('쪽당 개수를 바꾸면 1쪽으로, 기본 20 은 주소에서 뺀다', () => {
    const q = { ...parseListQuery({ page: '3' }, SPEC) };
    expect(listQueryHref('/x', q, { size: 50 }, SPEC)).toBe('/x?size=50');
    expect(listQueryHref('/x', { ...q, size: 50 }, { size: 20 }, SPEC)).toBe('/x');
  });

  it('기간(from · to)은 YYYY-MM-DD 만, dateRange 를 켠 목록만 읽는다', () => {
    expect(parseListQuery({ from: '2026-11-01', to: '2026-11-20' }, DATED)).toMatchObject({
      from: '2026-11-01',
      to: '2026-11-20',
    });
    expect(parseListQuery({ from: '2026-13-01', to: 'x' }, DATED)).toMatchObject({
      from: '',
      to: '',
    });
    expect(parseListQuery({ from: '2026-11-01' }, SPEC).from).toBe('');
    expect(listQueryHref('/x', parseListQuery({}, DATED), { from: '2026-11-01' }, DATED)).toBe(
      '/x?from=2026-11-01'
    );
  });

  it('범위는 쪽당 개수를 따른다', () => {
    expect(rangeOf(2, 50)).toEqual([50, 99]);
  });
});

describe('activeConditions', () => {
  it('적용된 조건 목록(이름 · 값) — 최근 검색 조건의 이름이 된다', () => {
    const DATED: ListSpec = { ...SPEC, dateRange: true };
    const q = parseListQuery({ q: '홍', status: 'draft', from: '2026-11-01' }, DATED);
    expect(
      activeConditions(q, { status: { label: '상태', options: { draft: '임시저장' } } })
    ).toEqual([
      { key: 'q', label: '검색어', value: '홍' },
      { key: 'status', label: '상태', value: '임시저장' },
      { key: 'from', label: '시작일', value: '2026-11-01' },
    ]);
  });
});

describe('hasConditions · canResetList', () => {
  const base = parseListQuery({}, SPEC);

  it('기본 상태면 조건도 없고 [초기화] 도 없다', () => {
    expect(hasConditions(base)).toBe(false);
    expect(canResetList(base, SPEC)).toBe(false);
  });

  it('검색어 · 필터 · 기간 · 휴지통은 조건이다', () => {
    for (const patch of [
      { q: '홍' },
      { filters: { status: 'draft' } },
      { from: '2026-01-01' },
      { to: '2026-01-31' },
      { trash: true },
    ]) {
      const query = { ...base, ...patch };
      expect(hasConditions(query)).toBe(true);
      expect(canResetList(query, SPEC)).toBe(true);
    }
  });

  it('정렬 · 방향 · 쪽당 개수가 기본값과 다르면 조건은 아니지만 [초기화] 를 보인다', () => {
    for (const patch of [{ sort: 'name' }, { dir: 'asc' as const }, { size: 50 }]) {
      const query = { ...base, ...patch };
      expect(hasConditions(query)).toBe(false);
      expect(canResetList(query, SPEC)).toBe(true);
    }
  });

  it('쪽 번호만 넘긴 것은 [초기화] 대상이 아니다', () => {
    expect(canResetList({ ...base, page: 3 }, SPEC)).toBe(false);
  });
});

describe('isCompleteDate', () => {
  it('YYYY-MM-DD 이고 1900년 이후면 완성된 날짜', () => {
    expect(isCompleteDate('2026-11-24')).toBe(true);
    expect(isCompleteDate('1900-01-01')).toBe(true);
  });

  it('비었거나 연도를 치는 중(0002 · 0202)이면 아니다', () => {
    expect(isCompleteDate('')).toBe(false);
    expect(isCompleteDate('0002-11-24')).toBe(false);
    expect(isCompleteDate('0202-11-24')).toBe(false);
    expect(isCompleteDate('2026-13-01')).toBe(false);
  });
});

describe('canApplyDates', () => {
  const applied = { from: '2026-01-01', to: '' };
  it('적용된 값과 다르고 두 칸이 각각 비었거나 다 고른 날짜일 때만', () => {
    expect(canApplyDates({ from: '2026-02-01', to: '' }, applied)).toBe(true);
    expect(canApplyDates({ from: '', to: '' }, applied)).toBe(true);
    expect(canApplyDates({ from: '2026-01-01', to: '2026-03-01' }, applied)).toBe(true);
  });

  it('적용된 값과 같으면 아니다', () => {
    expect(canApplyDates({ from: '2026-01-01', to: '' }, applied)).toBe(false);
  });

  it('시작일이 끝일보다 늦으면 아니다(늘 빈 목록이 된다)', () => {
    expect(canApplyDates({ from: '2026-06-01', to: '2026-01-01' }, applied)).toBe(false);
    expect(canApplyDates({ from: '2026-01-01', to: '2026-01-01' }, { from: '', to: '' })).toBe(
      true
    );
  });

  it('고치는 중이라 날짜 칸이 잠깐 빈 값이면(badInput) 비운 것으로 보지 않는다', () => {
    expect(canApplyDates({ from: '', to: '' }, applied, { from: true })).toBe(false);
  });

  it('치는 중인 값(연도 0002 · 틀린 날짜)이 한 칸이라도 있으면 아니다', () => {
    expect(canApplyDates({ from: '0002-01-01', to: '' }, applied)).toBe(false);
    expect(canApplyDates({ from: '2026-02-01', to: '2026-13-01' }, applied)).toBe(false);
  });
});
