import { describe, expect, it } from 'vitest';

import type { Resource } from './resource.types';
import { createResourceRepository, resourceRepository } from './resourceRepository';

const doc = (over: Partial<Resource>): Resource => ({
  id: 'a',
  status: 'published',
  section: 'sunday',
  group: '사도행전 강해',
  title: '제목',
  pages: [],
  videoIds: [],
  ...over,
});

const repo = createResourceRepository(async () => [
  doc({ id: 'old', date: '2026-01-04', videoIds: ['v1'] }),
  doc({ id: 'new', date: '2026-10-25', videoIds: ['v1', 'v2'] }),
  doc({ id: 'draft', status: 'draft', date: '2026-11-01', videoIds: ['v1'] }),
  doc({ id: 'series', section: 'series', group: '예배', date: '2025-01-04' }),
  doc({ id: 'undated', year: '2025' }),
]);

describe('resourceRepository', () => {
  it('분류의 공개 자료만, 최신 날짜부터 — 임시저장은 싣지 않는다', async () => {
    expect((await repo.list('sunday')).map(r => r.id)).toEqual(['new', 'old', 'undated']);
    expect((await repo.list('seasonal')).length).toBe(0);
  });

  it('자료 한 건 — 임시저장·없는 id 는 undefined', async () => {
    expect((await repo.get('new'))?.id).toBe('new');
    expect(await repo.get('draft')).toBeUndefined();
    expect(await repo.get('nope')).toBeUndefined();
  });

  it('영상 id 로 연결된 공개 자료 — 한 영상에 여러 자료, 한 자료에 여러 영상', async () => {
    expect((await repo.forVideo('v1')).map(r => r.id)).toEqual(['new', 'old']);
    expect((await repo.forVideo('v2')).map(r => r.id)).toEqual(['new']);
    expect(await repo.forVideo('none')).toEqual([]);
    expect(await repo.forVideo('')).toEqual([]);
  });

  it('시드: 기존 게시물 57건(주일 15 · 시리즈 26 · 가정·명절·절기 16)', async () => {
    const [sunday, series, seasonal] = await Promise.all([
      resourceRepository.list('sunday'),
      resourceRepository.list('series'),
      resourceRepository.list('seasonal'),
    ]);
    expect([sunday.length, series.length, seasonal.length]).toEqual([15, 26, 16]);
    const all = [...sunday, ...series, ...seasonal];
    expect(new Set(all.map(r => r.id)).size).toBe(57);
    // 원본 파일 56개(PDF 54 · 한글 2), 이미지로만 제공 1건
    expect(all.filter(r => r.file?.kind === 'pdf').length).toBe(54);
    expect(all.filter(r => r.file?.kind === 'hwp').length).toBe(2);
    expect(all.filter(r => !r.file).map(r => r.pages.length)).toEqual([2]);
    // 미리보기가 없는 자료는 원본 파일이 꼭 있다(열 수도 받을 수도 없는 자료가 없게)
    expect(all.every(r => r.pages.length > 0 || r.file)).toBe(true);
  });
});
