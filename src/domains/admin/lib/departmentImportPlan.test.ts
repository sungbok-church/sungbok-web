import { describe, expect, it } from 'vitest';

import { planDepartmentImport } from './departmentImportPlan';

const img = (file: string) => ({ src: file, width: 1600, height: 1067 });
const seed = {
  infant: {
    dept: {
      name: '영아부',
      ages: '1~4세',
      tagline: '한 줄',
      intro: '소개',
      worship: { day: '주일', time: '오전 11:30', place: '1F' },
      extra: '처음 오는 가정을 위한 안내 한 줄(도착 시각·입구)',
      staff: [
        { name: '이진희', role: '간사', photo: img('/r/staff/a.webp'), greeting: '인사' },
        { name: '최목사', role: '목사', photo: img('/r/staff/b.webp') },
      ],
    },
    photos: [
      { id: 'p01', src: img('/r/dep01.webp'), alt: '영아부 사진 샘플 1' },
      { id: 'p02', src: img('/r/dep02.webp'), alt: '영아부 사진 샘플 2' },
    ],
  },
  middle: {
    dept: {
      name: '중등부',
      ages: '중1~3',
      tagline: 't',
      intro: 'i',
      worship: { day: '주일', time: '', place: '' },
      extra: '자리표시',
      staff: [{ name: '김전도사', role: '전도사', photo: img('/r/staff/a.webp') }],
    },
    photos: [{ id: 'p01', src: img('/r/dep01.webp'), alt: '중등부 사진 샘플 1' }],
  },
};
const roles = { PASTOR: 'r-p', EVANGELIST: 'r-e', COORDINATOR: 'r-c' };

describe('planDepartmentImport — 지금 코드의 부서 값을 DB 로 옮길 계획', () => {
  it('부서마다 소개 · 담당자(직분은 코드 id) · 사진, «맨 아래 한 줄» 자리표시는 비운다', () => {
    const plan = planDepartmentImport(seed, new Set(), roles);
    expect(plan.departments.map(d => d.dbSlug)).toEqual(['INFANT', 'MIDDLE']);
    expect(plan.departments[0]).toMatchObject({
      ages: '1~4세',
      extra: null,
      photos: [
        { file: '/r/dep01.webp', alt: '영아부 사진 샘플 1' },
        { file: '/r/dep02.webp', alt: '영아부 사진 샘플 2' },
      ],
      staff: [
        { name: '이진희', roleId: 'r-c', greeting: '인사', photo: '/r/staff/a.webp' },
        { name: '최목사', roleId: 'r-p', greeting: null, photo: '/r/staff/b.webp' },
      ],
    });
  });
  it('여러 부서가 같이 쓰는 사진은 한 번만 올린다', () => {
    const plan = planDepartmentImport(seed, new Set(), roles);
    expect(plan.files).toEqual([
      '/r/dep01.webp',
      '/r/dep02.webp',
      '/r/staff/a.webp',
      '/r/staff/b.webp',
    ]);
  });
  it('DB 에 이미 있는 부서는 건너뛰고(관리자에 있는 것이 이긴다), 그 부서만 쓰는 사진은 올리지 않는다', () => {
    const plan = planDepartmentImport(seed, new Set(['INFANT']), roles);
    expect(plan.skipped).toEqual(['INFANT']);
    expect(plan.files).toEqual(['/r/dep01.webp', '/r/staff/a.webp']);
  });
  it('모르는 직함이면 옮기지 않고 알린다', () => {
    const bad = {
      ...seed,
      infant: {
        ...seed.infant,
        dept: {
          ...seed.infant.dept,
          staff: [{ name: 'x', role: '부장', photo: img('/r/x.webp') }],
        },
      },
    };
    const plan = planDepartmentImport(bad, new Set(), roles);
    expect(plan.invalid).toEqual(['INFANT: 직함 «부장»']);
    expect(plan.departments.map(d => d.dbSlug)).toEqual(['MIDDLE']);
  });
});
