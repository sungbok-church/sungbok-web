import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FileItem } from '../lib/input/fileInput';
import { type UploadDeps, useFileUploads } from './useFileUploads';

const LIST = '0190a0b0-0000-7000-8000-00000000000a';
const img = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });

const makeDeps = (over: Partial<UploadDeps> = {}): UploadDeps => {
  let n = 0;
  return {
    createUploadList: vi.fn(async () => ({ ok: true as const, data: { listId: LIST } })),
    signUpload: vi.fn(async (raw: unknown) => {
      const req = raw as { type: string };
      n += 1;
      const ext = req.type === 'image/webp' ? 'webp' : 'jpg';
      return {
        ok: true as const,
        data: {
          fileId: `f${n}`,
          path: `bulletin/${LIST}/f${n}.${ext}`,
          signedUrl: `https://s/${n}`,
          contentType: req.type,
          kind: 'IMAGE' as const,
        },
      };
    }),
    prepareImage: vi.fn(async (f: File) => ({
      blob: f,
      type: 'image/jpeg' as const,
      width: 1200,
      height: 854,
      resized: f.name.startsWith('big'),
    })),
    putFile: vi.fn(async (_r, onProgress: (p: number) => void) => onProgress(1)),
    notice: vi.fn(),
    apiKey: 'pk',
    ...over,
  };
};

const setup = (deps: UploadDeps, initial: FileItem[] = [], opts: { max?: number } = {}) =>
  renderHook(() => {
    const [value, setValue] = useState<FileItem[]>(initial);
    const uploads = useFileUploads({
      menuKey: 'bulletin',
      kinds: ['IMAGE'],
      value,
      onChange: setValue,
      deps,
      ...opts,
    });
    return { value, ...uploads };
  });

describe('useFileUploads', () => {
  it('고른 순서대로 하나씩 올려 목록 끝에 붙인다 — 올리는 자리(묶음)는 한 번만 만든다', async () => {
    const deps = makeDeps();
    const { result } = setup(deps);
    act(() => result.current.add([img('1.jpg'), img('2.jpg')]));
    expect(result.current.busy).toBe(true);
    await waitFor(() => expect(result.current.value).toHaveLength(2));
    expect(result.current.value.map(f => f.originalName)).toEqual(['1.jpg', '2.jpg']);
    expect(result.current.value[0]).toEqual({
      path: `bulletin/${LIST}/f1.jpg`,
      kind: 'IMAGE',
      width: 1200,
      height: 854,
      bytes: 1,
      originalName: '1.jpg',
      alt: null,
    });
    expect(deps.createUploadList).toHaveBeenCalledTimes(1);
    expect(deps.signUpload).toHaveBeenCalledWith({
      menuKey: 'bulletin',
      listId: LIST,
      type: 'image/jpeg',
      name: '1.jpg',
      bytes: 1,
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.pending).toEqual([]);
  });

  it('큰 그림을 줄였으면 한 번 알린다', async () => {
    const deps = makeDeps();
    const { result } = setup(deps);
    act(() => result.current.add([img('big1.jpg'), img('big2.jpg')]));
    await waitFor(() => expect(result.current.value).toHaveLength(2));
    expect(deps.notice).toHaveBeenCalledTimes(1);
  });

  it('받지 않는 종류 · 개수를 넘는 파일은 올리지 않고 줄에 까닭을 남긴다', async () => {
    const deps = makeDeps();
    const { result } = setup(deps, [], { max: 1 });
    act(() => result.current.add([new File(['x'], 'a.pdf', { type: 'application/pdf' })]));
    act(() => result.current.add([img('1.jpg'), img('2.jpg')]));
    await waitFor(() => expect(result.current.value).toHaveLength(1));
    expect(result.current.pending.map(p => [p.name, p.error, p.retryable])).toEqual([
      ['a.pdf', '올릴 수 없는 파일입니다.', false],
      ['2.jpg', '1개까지 올릴 수 있습니다.', false],
    ]);
    expect(result.current.busy).toBe(false);
  });

  it('올리다 실패하면 줄에 남고, [다시 올리기] 로 같은 파일을 다시 보낸다 · [빼기] 로 지운다', async () => {
    const putFile = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementation(async (_r, p: (n: number) => void) => p(1));
    const deps = makeDeps({ putFile });
    const { result } = setup(deps);
    act(() => result.current.add([img('1.jpg')]));
    await waitFor(() => expect(result.current.pending[0]?.error).toBeTruthy());
    expect(result.current.pending[0]).toMatchObject({
      error: '올리지 못했습니다. 다시 올려 주세요.',
      retryable: true,
    });
    const key = result.current.pending[0].key;
    act(() => result.current.retry(key));
    await waitFor(() => expect(result.current.value).toHaveLength(1));
    expect(result.current.pending).toEqual([]);

    act(() => result.current.add([new File(['x'], 'a.gif', { type: 'image/gif' })]));
    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    act(() => result.current.dismiss(result.current.pending[0].key));
    expect(result.current.pending).toEqual([]);
  });

  it('서버가 거절하면 그 문장을 줄에 남긴다', async () => {
    const deps = makeDeps({
      signUpload: vi.fn(async () => ({
        ok: false as const,
        error: { code: 'NO_PERMISSION' as const, message: '권한이 없습니다.' },
      })),
    });
    const { result } = setup(deps);
    act(() => result.current.add([img('1.jpg')]));
    await waitFor(() => expect(result.current.pending[0]?.error).toBe('권한이 없습니다.'));
  });
});

describe('useFileUploads — 개수 단위', () => {
  it('단위를 주면 그 단위로 알린다(«30장까지»)', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => {
      const [value, setValue] = useState<FileItem[]>([]);
      return useFileUploads({
        menuKey: 'album',
        kinds: ['IMAGE'],
        value,
        onChange: setValue,
        deps,
        max: 0,
        unit: '장',
      });
    });
    act(() => result.current.add([img('1.jpg')]));
    await waitFor(() => expect(result.current.pending[0]?.error).toBe('0장까지 올릴 수 있습니다.'));
  });
});
