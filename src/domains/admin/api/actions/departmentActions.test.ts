import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveDepartment } from './departmentActions';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const ROLE = '0190a0b0-0000-7000-8000-0000000000c1';
const STAFF = '0190a0b0-0000-7000-8000-0000000000d1';

const m = vi.hoisted(() => ({
  allowed: true,
  limit: null as string | null,
  write: vi.fn(),
  rpc: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  lists: 0,
}));

vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed && menu === 'departments' && action === 'UPDATE' ? { user: { id: 'u' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/fileList.server', () => ({ writeFileList: m.write }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    rpc: async (name: string, args: unknown) =>
      name === 'my_department_limit' ? { data: m.limit, error: null } : m.rpc(name, args),
  })),
}));

const photo = (n: number) => ({
  path: `departments/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.webp`,
  kind: 'IMAGE',
  width: 1600,
  height: 1067,
  bytes: 1,
  originalName: `${n}.webp`,
  alt: '예배',
  variants: [[640, `departments/${LIST}/0190a0b0-0000-7000-8000-00000000000${n + 1}.webp`]],
});
const input = {
  slug: 'lower-elementary',
  updatedAt: 't1',
  ages: '1~2학년',
  tagline: '한 줄',
  intro: '소개',
  extra: '',
  photos: [photo(2)],
  staff: [
    { id: STAFF, name: '김목사', roleId: ROLE, greeting: '안녕하세요', photo: [photo(4)] },
    { id: null, name: '이간사', roleId: ROLE, greeting: '', photo: [] },
  ],
};

beforeEach(() => {
  m.allowed = true;
  m.limit = null;
  m.lists = 0;
  m.write.mockImplementation(async () => ({
    ok: true,
    data: { listId: `0190a0b0-0000-7000-8000-0000000000e${++m.lists}` },
  }));
  m.rpc.mockResolvedValue({ data: 't2', error: null });
});
afterEach(() => vi.clearAllMocks());

describe('saveDepartment', () => {
  it('사진 · 담당자 사진을 새 묶음에 적고 한 번에 저장한다 — 공개 태그 갱신', async () => {
    const res = await saveDepartment(input);
    expect(m.write).toHaveBeenNthCalledWith(1, expect.anything(), 'departments', [
      expect.objectContaining({ path: input.photos[0].path, variants: input.photos[0].variants }),
    ]);
    expect(m.write).toHaveBeenCalledTimes(2); // 사진 없는 담당자는 묶음을 만들지 않는다
    expect(m.rpc).toHaveBeenCalledWith('save_department', {
      p_slug: 'LOWER_ELEMENTARY',
      p_updated_at: 't1',
      p_ages: '1~2학년',
      p_tagline: '한 줄',
      p_intro: '소개',
      p_extra: '',
      p_photos_list_id: '0190a0b0-0000-7000-8000-0000000000e1',
      p_staff: [
        {
          id: STAFF,
          name: '김목사',
          role_id: ROLE,
          greeting: '안녕하세요',
          photo_list_id: '0190a0b0-0000-7000-8000-0000000000e2',
        },
        { id: null, name: '이간사', role_id: ROLE, greeting: '', photo_list_id: null },
      ],
    });
    expect(res).toEqual({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('departments');
  });

  it('화면을 연 뒤 누가 저장했으면(null) 충돌', async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });
    expect(await saveDepartment(input)).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(m.updateTag).not.toHaveBeenCalled();
  });

  it('담당 부서가 다르면 · 수정 권한이 없으면 묶음도 만들지 않고 거절', async () => {
    m.limit = 'INFANT';
    expect(await saveDepartment(input)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    m.limit = 'LOWER_ELEMENTARY';
    expect(await saveDepartment(input)).toMatchObject({ ok: true });
    m.write.mockClear();
    m.allowed = false;
    expect(await saveDepartment(input)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    expect(m.write).not.toHaveBeenCalled();
  });
});
