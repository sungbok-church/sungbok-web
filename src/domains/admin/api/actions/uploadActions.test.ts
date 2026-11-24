import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createUploadList, signUpload } from './uploadActions';

const LIST = '0190a0b0-0000-7000-8000-00000000000a';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(['bulletin:CREATE']),
  write: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'u' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/fileList.server', () => ({ writeFileList: m.write }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    storage: {
      from: (bucket: string) => ({ createSignedUploadUrl: (p: string) => m.sign(bucket, p) }),
    },
  })),
}));

beforeEach(() => {
  m.allowed = new Set(['bulletin:CREATE']);
  m.write.mockResolvedValue({ ok: true, data: { listId: LIST } });
  m.sign.mockImplementation(async (_b: string, p: string) => ({
    data: { signedUrl: `https://x/upload/sign/media/${p}?token=t` },
    error: null,
  }));
});
afterEach(() => vi.clearAllMocks());

describe('createUploadList', () => {
  it('등록 또는 수정 권한이면 그 메뉴의 빈 묶음(올리는 자리)을 만든다', async () => {
    expect(await createUploadList('bulletin')).toEqual({ ok: true, data: { listId: LIST } });
    expect(m.write).toHaveBeenCalledWith(expect.anything(), 'bulletin', []);
    m.allowed = new Set(['bulletin:UPDATE']);
    expect((await createUploadList('bulletin')).ok).toBe(true);
  });
  it('권한이 없거나 파일을 올리지 않는 메뉴면 거절', async () => {
    m.allowed = new Set();
    expect(await createUploadList('bulletin')).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    expect(await createUploadList('users' as never)).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
    expect(m.write).not.toHaveBeenCalled();
  });
});

describe('signUpload', () => {
  const req = { menuKey: 'bulletin', listId: LIST, type: 'image/webp', name: '1쪽.webp', bytes: 9 };

  it('경로 <메뉴>/<묶음>/<새 uuid v7>.<확장자> 의 한 번 쓰는 주소를 로그인 세션으로 만든다', async () => {
    const res = await signUpload(req);
    if (!res.ok || !res.data) throw new Error('fail');
    expect(res.data.path).toMatch(
      new RegExp(
        `^bulletin/${LIST}/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.webp$`
      )
    );
    expect(res.data.path).toBe(`bulletin/${LIST}/${res.data.fileId}.webp`);
    expect(m.sign).toHaveBeenCalledWith('media', res.data.path);
    expect(res.data).toMatchObject({ contentType: 'image/webp', kind: 'IMAGE' });
  });

  it('한글 파일은 버킷이 받는 종류로 올린다', async () => {
    const res = await signUpload({ ...req, type: '', name: '시트지.hwp' });
    expect(res).toMatchObject({
      ok: true,
      data: { contentType: 'application/x-hwp', kind: 'HWP' },
    });
  });

  it('받지 않는 종류 · 권한 없음 · Storage 가 막음은 거절', async () => {
    expect(await signUpload({ ...req, type: 'video/mp4', name: 'a.mp4' })).toMatchObject({
      error: { code: 'NOT_ALLOWED' },
    });
    m.sign.mockResolvedValueOnce({ data: null, error: { statusCode: '403', message: 'rls' } });
    expect(await signUpload(req)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    m.allowed = new Set();
    expect(await signUpload(req)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });
});
