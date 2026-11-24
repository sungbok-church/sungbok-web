import { describe, expect, it } from 'vitest';

import type { Resource } from './resource.types';
import { createResourceRepository } from './resourceRepository';

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

  // 기존 57건은 DB 로 옮겼다(2026-11-24) — 건수는 운영에서 확인했고, «원본이나 쪽 그림이 있어야 공개» 는 입력 스키마가 지킨다
});
