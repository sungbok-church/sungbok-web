import { describe, expect, it, vi } from 'vitest';

import { prepareImage } from './prepareImage';

const file = (type: string, name = 'a') => new File(['x'], name, { type });
const blob = (type: string) => new Blob(['y'], { type });

const deps = (size: { width: number; height: number }, produced: string[] = ['image/webp']) => {
  const encode = vi.fn(async (_f: File, _w: number, _h: number, type: string) =>
    blob(produced.includes(type) ? type : 'image/png')
  );
  return { readSize: vi.fn(async () => size), encode };
};

describe('prepareImage', () => {
  it('한도 안의 WebP · JPEG 는 그대로 올린다(다시 만들지 않는다)', async () => {
    const d = deps({ width: 1200, height: 854 });
    const f = file('image/jpeg', '주보.jpg');
    const out = await prepareImage(f, d);
    expect(out).toEqual({ blob: f, type: 'image/jpeg', width: 1200, height: 854, resized: false });
    expect(d.encode).not.toHaveBeenCalled();
  });

  it('크면 긴 변 2000 으로 줄여 WebP 로 만든다', async () => {
    const d = deps({ width: 4032, height: 3024 });
    const out = await prepareImage(file('image/jpeg'), d);
    expect(d.encode).toHaveBeenCalledWith(expect.any(File), 2000, 1500, 'image/webp', 0.85);
    expect(out).toMatchObject({ type: 'image/webp', width: 2000, height: 1500, resized: true });
  });

  it('브라우저가 WebP 를 만들지 못하면(일부 Safari) JPEG 로', async () => {
    const d = deps({ width: 100, height: 100 }, ['image/jpeg']);
    const out = await prepareImage(file('image/png'), d);
    expect(d.encode).toHaveBeenLastCalledWith(expect.any(File), 100, 100, 'image/jpeg', 0.85);
    expect(out).toMatchObject({ type: 'image/jpeg', resized: false });
  });

  it('그림을 읽지 못하면 던진다(부르는 쪽이 «올릴 수 없는 파일» 로 알린다)', async () => {
    const d = { readSize: vi.fn(async () => Promise.reject(new Error('x'))), encode: vi.fn() };
    await expect(prepareImage(file('image/webp'), d)).rejects.toThrow();
  });
});
