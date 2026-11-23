import { describe, expect, it } from 'vitest';

import {
  activeConditions,
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
  it('적용된 조건을 칩으로 보일 목록(이름 · 값)', () => {
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
