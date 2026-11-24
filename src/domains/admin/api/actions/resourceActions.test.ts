import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createResource,
  duplicateResource,
  purgeResource,
  restoreResource,
  trashResource,
  updateResource,
} from './resourceActions';

const LIST = '0190a0b0-0000-7000-8000-00000000000a';
const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const SERIES = '0190a0b0-0000-7000-8000-0000000000c1';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  write: vi.fn(),
  versioned: vi.fn(),
  insert: vi.fn(),
  videoInsert: vi.fn(),
  videoDelete: vi.fn(),
  existingVideos: [] as string[],
  setTrashed: vi.fn(),
  purgeRow: vi.fn(),
  source: null as null | Record<string, unknown>,
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  lists: 0,
}));

vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'u' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/fileList.server', () => ({ writeFileList: m.write }));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('../server/contentState.server', () => ({
  setTrashed: m.setTrashed,
  purgeRow: m.purgeRow,
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'resource_videos')
        return {
          insert: async (rows: unknown) => m.videoInsert(rows),
          delete: () => ({
            eq: () => ({ in: async (_c: string, ids: string[]) => m.videoDelete(ids) }),
          }),
          select: () => ({
            eq: async () => ({
              data: m.existingVideos.map(video_id => ({ video_id })),
              error: null,
            }),
          }),
        };
      return {
        insert: async (row: unknown) => m.insert(row),
        select: () => {
          const c = { eq: () => c, maybeSingle: async () => ({ data: m.source, error: null }) };
          return c;
        },
      };
    },
  })),
}));

const file = (n: number, kind: 'PDF' | 'IMAGE', ext: string) => ({
  path: `resources/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.${ext}`,
  kind,
  width: kind === 'IMAGE' ? 1200 : null,
  height: kind === 'IMAGE' ? 1698 : null,
  bytes: 1,
  originalName: `${n}.${ext}`,
});
const input = {
  section: 'SUNDAY',
  seriesId: SERIES,
  episode: '66',
  title: '도장 깨기',
  date: '2026-10-25',
  year: '',
  passage: '',
  file: [file(2, 'PDF', 'pdf')],
  pages: [file(3, 'IMAGE', 'webp')],
  videos: 'YYW0D6JNrGQ',
  status: 'PUBLISHED',
};

beforeEach(() => {
  m.allowed = new Set(['CREATE', 'UPDATE', 'DELETE', 'PURGE'].map(a => `resources:${a}`));
  m.lists = 0;
  m.write.mockImplementation(async () => ({
    ok: true,
    data: { listId: `0190a0b0-0000-7000-8000-0000000000e${++m.lists}` },
  }));
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
  m.insert.mockResolvedValue({ error: null });
  m.videoInsert.mockResolvedValue({ error: null });
  m.videoDelete.mockResolvedValue({ error: null });
  m.existingVideos = [];
  m.setTrashed.mockResolvedValue({ ok: true, message: '휴지통으로 보냈습니다.' });
  m.purgeRow.mockResolvedValue({ ok: true, message: '완전히 지웠습니다.' });
  m.source = {
    section: 'SERIES',
    series_id: SERIES,
    episode: 3,
    title: '성령의 열매',
    passage: '갈 5:22',
  };
});
afterEach(() => vi.clearAllMocks());

describe('createResource', () => {
  it('원본 · 쪽을 각각 새 묶음에 적고, 시트지를 넣은 뒤 영상을 잇는다 — 공개 태그 갱신', async () => {
    const res = await createResource(input);
    expect(m.write).toHaveBeenNthCalledWith(1, expect.anything(), 'resources', [
      { ...input.file[0], alt: null },
    ]);
    expect(m.write).toHaveBeenNthCalledWith(2, expect.anything(), 'resources', [
      { ...input.pages[0], alt: null },
    ]);
    const row = m.insert.mock.calls[0][0];
    expect(row).toEqual({
      id: expect.any(String),
      section: 'SUNDAY',
      series_id: SERIES,
      episode: 66,
      title: '도장 깨기',
      date: '2026-10-25',
      year: null,
      passage: null,
      file_list_id: '0190a0b0-0000-7000-8000-0000000000e1',
      pages_list_id: '0190a0b0-0000-7000-8000-0000000000e2',
      status: 'PUBLISHED',
    });
    expect(m.videoInsert).toHaveBeenCalledWith([{ resource_id: row.id, video_id: 'YYW0D6JNrGQ' }]);
    expect(res).toEqual({ ok: true, data: { id: row.id }, message: '공개했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('resources');
  });

  it('원본이 없으면 원본 묶음은 만들지 않는다(쪽 묶음은 늘 — 비어도)', async () => {
    await createResource({ ...input, file: [], videos: '' });
    expect(m.write).toHaveBeenCalledTimes(1);
    expect(m.insert.mock.calls[0][0]).toMatchObject({ file_list_id: null });
    expect(m.videoInsert).not.toHaveBeenCalled();
  });

  it('영상 잇기가 권한에 막혀도 시트지는 저장된 것으로 알린다(다시 누르면 같은 시트지가 또 생기지 않게)', async () => {
    m.videoInsert.mockResolvedValue({ error: { code: '42501', message: 'rls' } });
    const res = await createResource(input);
    expect(res).toMatchObject({
      ok: true,
      message: '저장했습니다. 설교 영상 연결은 수정 권한이 있어야 합니다.',
    });
  });

  it('영상 잇기가 권한이 아닌 까닭으로 실패하면 권한 탓으로 알리지 않는다', async () => {
    m.videoInsert.mockResolvedValue({ error: { code: '23503', message: 'fk' } });
    const res = await createResource(input);
    expect(res).toMatchObject({
      ok: true,
      message: expect.stringContaining('저장하지 못했습니다'),
    });
  });
});

describe('등록 권한만 있을 때', () => {
  it('영상을 넣고 공개하려 하면 쓰기 전에 그 칸의 오류로 막는다(영상 연결은 수정 권한 · 자기 임시저장만)', async () => {
    m.allowed = new Set(['resources:CREATE']);
    expect(await createResource(input)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', fields: { videos: [expect.stringContaining('임시저장')] } },
    });
    expect(m.write).not.toHaveBeenCalled();
    // 임시저장이면 된다
    expect(await createResource({ ...input, status: 'DRAFT' })).toMatchObject({ ok: true });
  });
});

describe('updateResource', () => {
  it('수정은 저장됐는데 영상 연결이 막히면 저장된 것으로 알리고 새 수정 시각을 준다(다시 누르면 충돌이 나지 않게)', async () => {
    m.videoInsert.mockResolvedValue({ error: { code: '42501', message: 'rls' } });
    expect(
      await updateResource({ ...input, id: ID, updatedAt: 't1', videos: 'Cm0wL9_z9uM' })
    ).toMatchObject({
      ok: true,
      data: { updatedAt: 't2' },
      message: expect.stringContaining('영상'),
    });
  });

  it('새 묶음으로 바꿔 끼우고, 영상은 바뀐 것만 빼고 넣는다', async () => {
    m.existingVideos = ['AAAAAAAAAAA', 'YYW0D6JNrGQ'];
    const res = await updateResource({
      ...input,
      id: ID,
      updatedAt: 't1',
      videos: 'YYW0D6JNrGQ Cm0wL9_z9uM',
    });
    expect(m.versioned).toHaveBeenCalledWith(
      expect.anything(),
      'resources',
      ID,
      't1',
      expect.objectContaining({
        file_list_id: expect.any(String),
        pages_list_id: expect.any(String),
      })
    );
    expect(m.videoDelete).toHaveBeenCalledWith(['AAAAAAAAAAA']);
    expect(m.videoInsert).toHaveBeenCalledWith([{ resource_id: ID, video_id: 'Cm0wL9_z9uM' }]);
    expect(res).toMatchObject({ ok: true });
  });
});

describe('휴지통 · 복구 · 완전 삭제', () => {
  it('«설교 시트지» 의 삭제 · 완전 삭제 권한으로', async () => {
    await trashResource({ id: ID });
    expect(m.setTrashed).toHaveBeenCalledWith(
      expect.anything(),
      'resources',
      ID,
      true,
      {},
      expect.any(String)
    );
    await restoreResource({ id: ID });
    await purgeResource({ id: ID });
    expect(m.purgeRow).toHaveBeenCalledWith(expect.anything(), 'resources', ID, {});
    m.allowed = new Set();
    expect(await trashResource({ id: ID })).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });
});

describe('duplicateResource', () => {
  it('분류 · 묶음 · 제목 · 본문을 복사하고 회차는 다음 회 — 날짜 · 파일 · 영상은 비운 임시저장', async () => {
    const res = await duplicateResource({ id: ID });
    expect(m.write).toHaveBeenCalledWith(expect.anything(), 'resources', []);
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      section: 'SERIES',
      series_id: SERIES,
      episode: 4,
      title: '성령의 열매',
      passage: '갈 5:22',
      date: null,
      file_list_id: null,
      status: 'DRAFT',
    });
    expect(res).toMatchObject({ ok: true, data: { id: row.id } });
  });
});
