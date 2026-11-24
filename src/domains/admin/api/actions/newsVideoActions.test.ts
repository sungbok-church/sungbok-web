import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNewsVideo,
  duplicateNewsVideo,
  purgeNewsVideo,
  restoreNewsVideo,
  trashNewsVideo,
  updateNewsVideo,
} from './newsVideoActions';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const CAT = '0190a0b0-0000-7000-8000-0000000000c1';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  maxres: vi.fn(async () => true),
  versioned: vi.fn(),
  insert: vi.fn(),
  setTrashed: vi.fn(),
  purgeRow: vi.fn(),
  source: null as null | Record<string, unknown>,
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'u' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/youtubeThumb.server', () => ({ hasMaxresThumbnail: m.maxres }));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('../server/contentState.server', () => ({
  setTrashed: m.setTrashed,
  purgeRow: m.purgeRow,
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      insert: async (row: unknown) => m.insert(row),
      select: () => {
        const c = {
          eq: () => c,
          maybeSingle: async () => ({ data: m.source, error: null }),
        };
        return c;
      },
    }),
  })),
}));

const input = {
  feed: 'announcements',
  title: '11월 29일 주일 광고',
  categoryId: CAT,
  date: '2026-11-29',
  video: 'https://youtu.be/Cm0wL9_z9uM',
  description: '광고',
  status: 'PUBLISHED',
};

beforeEach(() => {
  m.allowed = new Set(
    ['CREATE', 'UPDATE', 'DELETE', 'PURGE'].flatMap(a => [`announcements:${a}`, `garden:${a}`])
  );
  m.maxres.mockResolvedValue(true);
  m.insert.mockResolvedValue({ error: null });
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
  m.setTrashed.mockResolvedValue({ ok: true, message: '휴지통으로 보냈습니다.' });
  m.purgeRow.mockResolvedValue({ ok: true, message: '완전히 지웠습니다.' });
  m.source = {
    title: '11월 22일 주일 광고',
    category_id: CAT,
    description: '지난주',
    date: '2026-11-22',
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T03:00:00Z')); // 서울 화요일
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('createNewsVideo', () => {
  it('그 메뉴(feed)로 넣는다 — 영상 id · 썸네일 · 표지, 공개 영상 화면 태그를 갱신', async () => {
    const res = await createNewsVideo(input);
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      feed: 'ANNOUNCEMENTS',
      title: '11월 29일 주일 광고',
      category_id: CAT,
      date: '2026-11-29',
      video_id: 'Cm0wL9_z9uM',
      thumbnail: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
      poster: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/maxresdefault.jpg',
      description: '광고',
      status: 'PUBLISHED',
    });
    expect(res).toEqual({ ok: true, data: { id: row.id }, message: '공개했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('video-page-announcements');
    expect(m.revalidatePath).toHaveBeenCalledWith('/admin/announcements', 'layout');
  });

  it('큰 표지가 없으면 표지도 작은 썸네일, 영상이 없으면(임시저장) 그림도 없다', async () => {
    m.maxres.mockResolvedValue(false);
    await createNewsVideo({ ...input, feed: 'garden' });
    expect(m.insert.mock.calls[0][0]).toMatchObject({
      feed: 'GARDEN',
      poster: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
    });
    await createNewsVideo({ ...input, video: '', status: 'DRAFT' });
    expect(m.insert.mock.calls[1][0]).toMatchObject({
      video_id: null,
      thumbnail: null,
      poster: null,
    });
  });

  it('같은 영상이 이미 있으면 그 뜻으로, 그 메뉴의 등록 권한이 없으면 거절', async () => {
    m.insert.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    expect(await createNewsVideo(input)).toMatchObject({
      error: { code: 'DUPLICATE', message: '이미 등록된 영상입니다.' },
    });
    m.allowed = new Set(['garden:CREATE']);
    expect(await createNewsVideo(input)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });

  it('모르는 메뉴 · 공개인데 영상 없음은 입력 오류', async () => {
    expect(await createNewsVideo({ ...input, feed: 'bulletin' })).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
    expect(await createNewsVideo({ ...input, video: '' })).toMatchObject({
      error: { code: 'INVALID_INPUT', fields: { video: ['공개하려면 영상을 넣어 주세요.'] } },
    });
  });
});

describe('updateNewsVideo', () => {
  it('열었을 때의 수정 시각으로, 그 메뉴의 글만(feed) 고친다', async () => {
    const res = await updateNewsVideo({ ...input, feed: 'garden', id: ID, updatedAt: 't1' });
    expect(m.versioned).toHaveBeenCalledWith(
      expect.anything(),
      'news_videos',
      ID,
      't1',
      expect.objectContaining({ video_id: 'Cm0wL9_z9uM', status: 'PUBLISHED' }),
      { feed: 'GARDEN' }
    );
    expect(res).toMatchObject({ ok: true });
    expect(m.updateTag).toHaveBeenCalledWith('video-page-garden');
  });
});

describe('휴지통 · 복구 · 완전 삭제', () => {
  it('그 메뉴의 권한 · 범위(feed)로', async () => {
    await trashNewsVideo({ feed: 'announcements', id: ID });
    expect(m.setTrashed).toHaveBeenCalledWith(
      expect.anything(),
      'news_videos',
      ID,
      true,
      { feed: 'ANNOUNCEMENTS' },
      expect.any(String)
    );
    await restoreNewsVideo({ feed: 'garden', id: ID });
    expect(m.setTrashed).toHaveBeenLastCalledWith(
      expect.anything(),
      'news_videos',
      ID,
      false,
      { feed: 'GARDEN' },
      '같은 영상이 이미 있어 복구할 수 없습니다.'
    );
    await purgeNewsVideo({ feed: 'garden', id: ID });
    expect(m.purgeRow).toHaveBeenCalledWith(expect.anything(), 'news_videos', ID, {
      feed: 'GARDEN',
    });
    m.allowed = new Set();
    expect(await trashNewsVideo({ feed: 'garden', id: ID })).toMatchObject({
      error: { code: 'NO_PERMISSION' },
    });
  });
});

describe('duplicateNewsVideo', () => {
  it('제목 · 분류 · 설명을 복사한 임시저장 — 영상은 비우고, 주일광고 날짜는 다음 주일', async () => {
    const res = await duplicateNewsVideo({ feed: 'announcements', id: ID });
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      feed: 'ANNOUNCEMENTS',
      title: '11월 22일 주일 광고',
      category_id: CAT,
      description: '지난주',
      date: '2026-11-29',
      video_id: null,
      status: 'DRAFT',
    });
    expect(res).toMatchObject({ ok: true, data: { id: row.id } });
  });
  it('성복의 뜰은 오늘 날짜', async () => {
    await duplicateNewsVideo({ feed: 'garden', id: ID });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ feed: 'GARDEN', date: '2026-11-24' });
  });
});
