import { describe, expect, it } from 'vitest';

import { rowToDepartmentData, toDepartmentPage } from './departmentPage';

const B = 'https://x.supabase.co';
const file = (p: string, alt: string | null = null) => ({
  path: p,
  width: 1600,
  height: 1067,
  variants: [[640, `${p}.640`]],
  alt,
});

describe('toDepartmentPage — DB 의 부서 → 공개 부서 페이지', () => {
  it('코드의 이름 · 예배 정보에 DB 의 소개 · 담당자 · 사진(순서대로)을 붙인다', () => {
    const page = toDepartmentPage('infant', B, {
      ages: '1~4세',
      tagline: '한 줄',
      intro: '소개',
      extra: null,
      staff: [
        { name: '김목사', roleLabel: '목사', greeting: '안녕하세요', photo: file('s.webp') },
        { name: '이간사', roleLabel: '간사', greeting: null, photo: null },
      ],
      photos: [file('a.webp', '예배 모습'), file('b.webp')],
    });
    expect(page.dept).toMatchObject({
      name: '영아부',
      worship: { day: '주일', time: '오전 11:30', place: '사랑성전 1F' },
      ages: '1~4세',
      extra: '',
    });
    expect(page.dept.staff).toEqual([
      {
        name: '김목사',
        role: '목사',
        greeting: '안녕하세요',
        photo: expect.objectContaining({ src: `${B}/storage/v1/object/public/media/s.webp` }),
      },
      { name: '이간사', role: '간사' },
    ]);
    expect(page.photos.map(p => [p.id, p.alt])).toEqual([
      ['p1', '예배 모습'],
      ['p2', '영아부 사진 2'],
    ]);
    expect(page.photos[0].src).toMatchObject({
      width: 1600,
      variants: [[640, expect.any(String)]],
    });
  });
  it('크기를 모르는 사진은 뺀다', () => {
    const page = toDepartmentPage('high', B, {
      ages: '고1~3',
      tagline: 't',
      intro: 'i',
      extra: '처음 오시면',
      staff: [],
      photos: [{ path: 'x.pdf', width: null, height: null, alt: null }, file('a.webp')],
    });
    expect(page.photos).toHaveLength(1);
    expect(page.dept.extra).toBe('처음 오시면');
  });
});

describe('rowToDepartmentData — DB 행(묶음 · 담당자 조인) → 부서 값', () => {
  it('사진 · 담당자를 순서대로, 직분은 이름으로, 그림이 아닌 파일은 뺀다', () => {
    const f = (path: string, sort: number, kind = 'IMAGE') => ({
      path,
      kind,
      width: 10,
      height: 10,
      alt: null,
      sort,
      variants: null,
    });
    const data = rowToDepartmentData({
      ages: 'a',
      tagline: 't',
      intro: 'i',
      extra: null,
      photos: { files: [f('2.webp', 2), f('x.pdf', 3, 'PDF'), f('1.webp', 1)] },
      department_staff: [
        { sort: 2, name: '둘', greeting: null, role: { label: '간사' }, photo: null },
        {
          sort: 1,
          name: '하나',
          greeting: 'g',
          role: { label: '목사' },
          photo: { files: [f('s.webp', 1)] },
        },
      ],
    });
    expect(data.photos.map(p => p.path)).toEqual(['1.webp', '2.webp']);
    expect(data.staff.map(s => [s.name, s.roleLabel, s.photo?.path ?? null])).toEqual([
      ['하나', '목사', 's.webp'],
      ['둘', '간사', null],
    ]);
  });
});
