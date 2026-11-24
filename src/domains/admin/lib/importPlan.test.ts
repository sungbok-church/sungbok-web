import { describe, expect, it } from 'vitest';

import { planBulletinImport } from './importPlan';

const issue = (date: string, pages = 2) => ({
  id: date,
  status: 'published' as const,
  date,
  pages: Array.from({ length: pages }, (_, i) => ({
    src: `/files/bulletin/${date}-${i + 1}.webp`,
    width: 1200,
    height: 854,
  })),
});

describe('planBulletinImport', () => {
  it('DB 에 없는 날짜만, 오래된 호부터 — 쪽 파일은 public/ 아래 경로와 원래 이름으로', () => {
    const plan = planBulletinImport(
      [issue('2026-11-15'), issue('2026-11-08'), issue('2026-11-01')],
      new Set(['2026-11-08'])
    );
    expect(plan.skipped).toEqual(['2026-11-08']);
    expect(plan.issues.map(i => i.date)).toEqual(['2026-11-01', '2026-11-15']);
    expect(plan.issues[0].pages[0]).toEqual({
      file: 'public/files/bulletin/2026-11-01-1.webp',
      originalName: '2026-11-01-1.webp',
      width: 1200,
      height: 854,
    });
  });

  it('임시저장 · 쪽이 없는 호 · public/files 밖을 가리키는 쪽은 옮기지 않는다', () => {
    const plan = planBulletinImport(
      [
        { ...issue('2026-11-15'), status: 'draft' as const },
        issue('2026-11-08', 0),
        { ...issue('2026-11-01'), pages: [{ src: '/../secret.webp', width: 1, height: 1 }] },
      ],
      new Set()
    );
    expect(plan.issues).toEqual([]);
    expect(plan.invalid).toEqual(['2026-11-15', '2026-11-08', '2026-11-01']);
  });
});
