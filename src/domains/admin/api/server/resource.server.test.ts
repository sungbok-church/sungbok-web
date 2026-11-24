import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadResource } from './resource.server';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const file = (sort: number, kind = 'IMAGE', ext = 'webp') => ({
  path: `resources/l/${sort}.${ext}`,
  kind,
  width: kind === 'IMAGE' ? 1200 : null,
  height: kind === 'IMAGE' ? 1698 : null,
  bytes: 9,
  original_name: `${sort}.${ext}`,
  alt: null,
  sort,
});
const clientWith = (data: unknown) => {
  let cols = '';
  const c = { eq: () => c, maybeSingle: async () => ({ data, error: null }) };
  return {
    client: { from: () => ({ select: (s: string) => ((cols = s), c) }) } as never,
    cols: () => cols,
  };
};

describe('loadResource', () => {
  it('원본 · 쪽 그림(각각 순서대로) · 영상 id · 회차 · 날짜/연도를 폼 모양으로', async () => {
    const { client, cols } = clientWith({
      id: ID,
      slug: '0404-40',
      section: 'SUNDAY',
      series_id: 's1',
      categories: { label: '사도행전 강해' },
      episode: 66,
      title: '도장 깨기',
      date: null,
      year: 2025,
      passage: null,
      status: 'PUBLISHED',
      deleted_at: null,
      created_at: 'c',
      created_by: null,
      updated_at: 'u',
      updated_by: null,
      file: { files: [file(1, 'PDF', 'pdf')] },
      pages: { files: [file(2), file(1)] },
      resource_videos: [{ video_id: 'YYW0D6JNrGQ' }],
    });
    const r = await loadResource(client, ID);
    // 묶음이 둘이라 연결 이름으로 나눠 읽는다
    expect(cols()).toContain('file:file_lists!resources_file_list_id_fkey');
    expect(cols()).toContain('pages:file_lists!resources_pages_list_id_fkey');
    expect(r).toMatchObject({
      slug: '0404-40',
      section: 'SUNDAY',
      seriesLabel: '사도행전 강해',
      episode: '66',
      date: '',
      year: '2025',
      passage: '',
      videoIds: ['YYW0D6JNrGQ'],
      trashed: false,
    });
    expect(r?.file.map(f => f.kind)).toEqual(['PDF']);
    expect(r?.pages.map(f => f.originalName)).toEqual(['1.webp', '2.webp']);
  });
  it('원본이 없으면 빈 목록, 없으면 null', async () => {
    const r = await loadResource(
      clientWith({
        id: ID,
        slug: '1',
        section: 'SEASONAL',
        series_id: 's',
        categories: null,
        episode: null,
        title: 't',
        date: '2026-01-01',
        year: null,
        passage: '시 23',
        status: 'DRAFT',
        deleted_at: null,
        created_at: 'c',
        created_by: null,
        updated_at: 'u',
        updated_by: null,
        file: null,
        pages: { files: [] },
        resource_videos: [],
      }).client,
      ID
    );
    expect(r).toMatchObject({ file: [], pages: [], episode: '', date: '2026-01-01', year: '' });
    expect(await loadResource(clientWith(null).client, ID)).toBeNull();
  });
});
