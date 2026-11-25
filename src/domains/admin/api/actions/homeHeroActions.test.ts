import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveHomeHero } from './homeHeroActions';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const HERO = '0190a0b0-0000-7000-8000-0000000000a1';

const m = vi.hoisted(() => ({
  allowed: true,
  row: { id: '' } as { id: string } | null,
  write: vi.fn(),
  versioned: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async () => (m.allowed ? { user: { id: 'u' } } : null)),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/fileList.server', () => ({ writeFileList: m.write }));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: m.row, error: null }) }) }),
  })),
}));

const photo = {
  path: `home-hero/${LIST}/0190a0b0-0000-7000-8000-000000000002.webp`,
  kind: 'IMAGE',
  width: 2000,
  height: 1333,
  bytes: 1,
  originalName: 'a.webp',
  alt: '전경',
};

beforeEach(() => {
  m.allowed = true;
  m.row = { id: HERO };
  m.write.mockResolvedValue({ ok: true, data: { listId: '0190a0b0-0000-7000-8000-0000000000e1' } });
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
});
afterEach(() => vi.clearAllMocks());

describe('saveHomeHero', () => {
  it('대표 사진을 새 묶음에 적고 종류 · 영상 id 를 바꾼다 — 공개 홈 태그 갱신', async () => {
    const res = await saveHomeHero({
      kind: 'YOUTUBE',
      photo: [photo],
      video: 'https://youtu.be/K-_StsRioZE',
      updatedAt: 't1',
    });
    expect(m.write).toHaveBeenCalledWith(expect.anything(), 'home-hero', [
      expect.objectContaining({ path: photo.path }),
    ]);
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'home_hero', HERO, 't1', {
      kind: 'YOUTUBE',
      photo_list_id: '0190a0b0-0000-7000-8000-0000000000e1',
      youtube_video_id: 'K-_StsRioZE',
    });
    expect(res).toMatchObject({ ok: true, data: { updatedAt: 't2' } });
    expect(m.updateTag).toHaveBeenCalledWith('home-hero');
  });
  it('사진으로 바꾸면 영상 id 를 비운다', async () => {
    await saveHomeHero({ kind: 'PHOTO', photo: [photo], video: 'K-_StsRioZE', updatedAt: 't1' });
    expect(m.versioned.mock.calls[0][4]).toMatchObject({ kind: 'PHOTO', youtube_video_id: null });
  });
  it('수정 권한이 없으면 · 히어로 줄이 없으면 거절', async () => {
    m.allowed = false;
    expect(
      await saveHomeHero({ kind: 'PHOTO', photo: [photo], video: '', updatedAt: 't1' })
    ).toMatchObject({
      error: { code: 'NO_PERMISSION' },
    });
    m.allowed = true;
    m.row = null;
    expect(
      await saveHomeHero({ kind: 'PHOTO', photo: [photo], video: '', updatedAt: 't1' })
    ).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
    expect(m.write).not.toHaveBeenCalled();
  });
});
