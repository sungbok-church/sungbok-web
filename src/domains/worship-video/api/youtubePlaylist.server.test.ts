import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// 호출만 가짜로 — 썸네일 고르기 · 목록 검사 등 나머지는 실제 것을 쓴다
vi.mock('@/shared/api/youtubeApi.server', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api/youtubeApi.server')>()),
  youtubeGet: vi.fn(),
}));

import { YoutubeApiError, youtubeGet } from '@/shared/api/youtubeApi.server';

import { fetchPlaylistRows, MAX_PLAYLIST_PAGES } from './youtubePlaylist.server';

const get = vi.mocked(youtubeGet);

type Over = {
  title?: string;
  description?: string;
  thumbnails?: Record<string, { url: string }>;
  uploaded?: string;
  added?: string;
};
const item = (id: string, over: Over = {}) => ({
  snippet: {
    title: over.title ?? `제목 ${id}`,
    description: over.description ?? `설명 ${id}`,
    thumbnails: over.thumbnails ?? { high: { url: `h/${id}` }, maxres: { url: `x/${id}` } },
    resourceId: { videoId: id },
    publishedAt: over.added,
  },
  contentDetails: { videoPublishedAt: over.uploaded ?? '2026-10-26T03:00:00Z' },
});

beforeEach(() => {
  get.mockReset();
});

describe('fetchPlaylistRows — 재생목록 전체를 DB 에 넣을 줄로', () => {
  it('유튜브 값 그대로(제목 · 설명 원문 · 시각) + 목록 썸네일은 high, 포스터는 큰 것부터 · 순서 · Data Cache 없이', async () => {
    get.mockResolvedValueOnce({ items: [item('a', { added: '2026-10-27T00:00:00Z' })] });
    await expect(fetchPlaylistRows(['PL-SUN'])).resolves.toEqual([
      {
        video_id: 'a',
        position: 0,
        title: '제목 a',
        description: '설명 a',
        published_at: '2026-10-26T03:00:00.000Z',
        added_at: '2026-10-27T00:00:00.000Z',
        thumbnail: 'h/a',
        poster: 'x/a',
      },
    ]);
    // 동기화는 늘 새로 받는다(1시간 Data Cache 를 두면 새 영상이 늦게 온다) — 쿼터는 10분에 한 번까지라 괜찮다
    expect(get).toHaveBeenCalledWith(
      'playlistItems',
      { part: 'snippet,contentDetails', playlistId: 'PL-SUN', maxResults: '50' },
      0,
      expect.any(Object)
    );
  });

  it('시각 모양이 아닌 값은 비운다(DB 에 넣을 수 없다)', async () => {
    get.mockResolvedValueOnce({ items: [item('a', { uploaded: 'not-a-date' })] });
    const [a] = await fetchPlaylistRows(['PL-SUN']);
    expect(a).toMatchObject({ published_at: null, added_at: null });
  });

  it('nextPageToken 을 따라 끝까지 — 순서는 재생목록 순서', async () => {
    get
      .mockResolvedValueOnce({ items: [item('a')], nextPageToken: 'p2' })
      .mockResolvedValueOnce({ items: [item('b')] });
    expect((await fetchPlaylistRows(['PL-SUN'])).map(r => [r.video_id, r.position])).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
    expect(get).toHaveBeenNthCalledWith(
      2,
      'playlistItems',
      { part: 'snippet,contentDetails', playlistId: 'PL-SUN', maxResults: '50', pageToken: 'p2' },
      0,
      expect.any(Object)
    );
  });

  it('삭제 · 비공개 영상(영상 id 나 썸네일 없음)은 뺀다', async () => {
    get.mockResolvedValueOnce({
      items: [
        item('a'),
        item('gone', { thumbnails: {} }),
        { snippet: { title: 'Private video', thumbnails: {} } },
      ],
    });
    expect((await fetchPlaylistRows(['PL-SUN'])).map(r => r.video_id)).toEqual(['a']);
  });

  it('여러 재생목록은 합치고, 두 목록에 다 있는 영상은 앞 목록 것 한 번만', async () => {
    get.mockImplementation(async (_path, params) =>
      params.playlistId === 'PL-A'
        ? { items: [item('a'), item('same', { title: '앞' })] }
        : { items: [item('same', { title: '뒤' }), item('b')] }
    );
    const rows = await fetchPlaylistRows(['PL-A', 'PL-B']);
    expect(rows.map(r => r.video_id)).toEqual(['a', 'same', 'b']);
    expect(rows.find(r => r.video_id === 'same')?.title).toBe('앞');
  });

  it('응답 스키마는 삭제 · 비공개 영상이 섞인 응답을 받아들이고, 모양이 다른 응답은 거른다', async () => {
    get.mockResolvedValueOnce({ items: [] });
    await fetchPlaylistRows(['PL-SUN']);
    const schema = get.mock.calls[0][3];
    const real = {
      items: [item('a'), { snippet: { title: 'Private video', thumbnails: {} } }],
      nextPageToken: 'p2',
    };
    expect(schema.safeParse(real).success).toBe(true);
    expect(schema.safeParse({ items: {} }).success).toBe(false);
  });

  it('토큰이 끝없이 이어져도 MAX_PLAYLIST_PAGES 쪽에서 멈춘다(쿼터 보호)', async () => {
    let n = 0;
    get.mockImplementation(async () => ({ items: [item(`v${n++}`)], nextPageToken: 'again' }));
    const rows = await fetchPlaylistRows(['PL-SUN']);
    expect(get).toHaveBeenCalledTimes(MAX_PLAYLIST_PAGES);
    expect(rows).toHaveLength(MAX_PLAYLIST_PAGES);
  });

  it('유튜브 실패는 그대로 던진다 — 반쪽 목록을 돌려주지 않는다(받은 만큼으로 DB 를 바꾸면 나머지가 지워진다)', async () => {
    get
      .mockResolvedValueOnce({ items: [item('a')], nextPageToken: 'p2' })
      .mockRejectedValueOnce(new YoutubeApiError('playlistItems', 403, 'quotaExceeded'));
    await expect(fetchPlaylistRows(['PL-SUN'])).rejects.toBeInstanceOf(YoutubeApiError);
  });
});
