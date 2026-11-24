import { describe, expect, it, vi } from 'vitest';

import { pageFileName, pdfRenderScale, renderPdfPages } from './renderPdfPages';

describe('pdfRenderScale · pageFileName', () => {
  it('긴 변이 한도(1700)가 되게 — 이미 작으면 1', () => {
    expect(pdfRenderScale(595, 842, 1700)).toBeCloseTo(1700 / 842);
    expect(pdfRenderScale(2000, 1000, 1700)).toBeCloseTo(0.85);
  });
  it('쪽 그림 이름은 원본 이름 + 쪽 번호', () => {
    expect(pageFileName('261025 사도행전 강해 66.pdf', 2, 'webp')).toBe(
      '261025 사도행전 강해 66-2.webp'
    );
    expect(pageFileName('noext', 1, 'jpg')).toBe('noext-1.jpg');
  });
});

describe('renderPdfPages', () => {
  it('쪽마다 차례로 그려 그림 파일로 — 진행을 알린다', async () => {
    const render = vi.fn(async (n: number) => new Blob([`p${n}`], { type: 'image/webp' }));
    const seen: [number, number][] = [];
    const files = await renderPdfPages(new File(['%PDF'], '시트지.pdf'), {
      open: async () => ({ numPages: 3, render }),
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(render.mock.calls.map(c => c[0])).toEqual([1, 2, 3]);
    expect(files.map(f => [f.name, f.type])).toEqual([
      ['시트지-1.webp', 'image/webp'],
      ['시트지-2.webp', 'image/webp'],
      ['시트지-3.webp', 'image/webp'],
    ]);
    expect(seen).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
  it('WebP 를 못 만들면(일부 Safari) JPEG 이름으로', async () => {
    const files = await renderPdfPages(new File(['%PDF'], 'a.pdf'), {
      open: async () => ({
        numPages: 1,
        render: async () => new Blob(['x'], { type: 'image/jpeg' }),
      }),
    });
    expect(files[0].name).toBe('a-1.jpg');
  });
  it('쪽이 너무 많으면 앞에서 한도까지만', async () => {
    const render = vi.fn(async () => new Blob(['x'], { type: 'image/webp' }));
    const files = await renderPdfPages(new File(['%PDF'], 'a.pdf'), {
      open: async () => ({ numPages: 80, render }),
      maxPages: 60,
    });
    expect(files).toHaveLength(60);
  });
});

describe('renderPdfPages — 정리', () => {
  it('다 그리면(실패해도) 문서를 닫는다 — worker · 메모리가 남지 않게', async () => {
    const close = vi.fn(async () => {});
    await renderPdfPages(new File(['%PDF'], 'a.pdf'), {
      open: async () => ({
        numPages: 1,
        render: async () => new Blob(['x'], { type: 'image/webp' }),
        close,
      }),
    });
    expect(close).toHaveBeenCalledTimes(1);
    const close2 = vi.fn(async () => {});
    await expect(
      renderPdfPages(new File(['%PDF'], 'a.pdf'), {
        open: async () => ({
          numPages: 1,
          render: async () => Promise.reject(new Error('x')),
          close: close2,
        }),
      })
    ).rejects.toThrow();
    expect(close2).toHaveBeenCalledTimes(1);
  });
});
