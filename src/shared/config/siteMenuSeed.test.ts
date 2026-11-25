import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { childHref, sections } from './siteNav';

// DB 의 홈페이지 메뉴 줄(supabase/reference.sql)이 코드의 siteNav 와 같은지 잠근다 — 페이지를 더하거나 이름을 바꾸면
// 두 곳을 함께 고친다(설계 6.5: 어떤 페이지가 있는지는 코드, DB 는 덮어쓸 값의 자리).
const sql = readFileSync('supabase/reference.sql', 'utf8');
const block = sql.slice(sql.indexOf('-- 홈페이지 메뉴(설계 6.5)'), sql.indexOf('-- 처음 그룹'));
const tuples = [
  ...block.matchAll(
    /\(\s*'([^']+)',\s*(?:'([^']+)',\s*)?'([^']+)',\s*'(\/[^']*)',\s*(\d+),\s*(true|false)\)/g
  ),
].map(m => ({ key: m[1], parent: m[2] ?? null, label: m[3], path: m[4], sort: Number(m[5]) }));

describe('홈페이지 메뉴 초기 행 = siteNav', () => {
  it('상위 메뉴 — 주소 · 이름 · 순서', () => {
    expect(tuples.filter(t => t.parent === null).map(t => [t.key, t.label, t.path])).toEqual(
      sections.map(s => [s.slug, s.label, `/${s.slug}`])
    );
  });

  it('하위 메뉴 — 주소 · 이름 · 순서(상위마다 10, 20, …)', () => {
    const children = tuples.filter(t => t.parent !== null);
    expect(children.map(t => [t.parent, t.label, t.path])).toEqual(
      sections.flatMap(s => (s.children ?? []).map(c => [s.slug, c.label, childHref(s, c)]))
    );
    for (const s of sections) {
      const sorts = children.filter(t => t.parent === s.slug).map(t => t.sort);
      expect(sorts).toEqual(sorts.map((_, i) => (i + 1) * 10));
    }
  });
});
