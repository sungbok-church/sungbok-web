// PDF → 쪽 그림(설계 6.8 — 설교 시트지의 미리보기 쪽). 브라우저가 쪽마다 긴 변 1700px 안팎의 WebP(못 만들면 JPEG)를 만든다.
// PDF.js(pdfjs-dist)는 PDF 를 고를 때만 불러온다(관리자 등록 화면 — 방문자 화면에 싣지 않는다). worker 는 같은 출처 파일.
// 그리기는 브라우저에서만 되므로 deps 로 받는다 — 시험에서는 가짜를 넣는다.
import { IMAGE_QUALITY } from '@/domains/admin/lib/fileUpload';

/** 쪽 그림의 긴 변(px) — 확대해서 읽을 수 있을 만큼(기존 자료의 쪽 그림 1200 · 1698 과 비슷) */
export const PDF_PAGE_EDGE = 1700;

/** 긴 변이 maxEdge 가 되는 배율 */
export const pdfRenderScale = (width: number, height: number, maxEdge: number) =>
  maxEdge / Math.max(width, height);

/** 쪽 그림 이름 — 원본 이름(확장자 뺌) + «-쪽 번호» */
export const pageFileName = (original: string, n: number, ext: string) =>
  `${original.replace(/\.[^./]+$/, '')}-${n}.${ext}`;

type OpenedPdf = {
  numPages: number;
  render: (pageNo: number) => Promise<Blob>;
  /** 문서 · worker 를 닫는다 */
  close?: () => Promise<void>;
};

type Options = {
  open?: (file: File) => Promise<OpenedPdf>;
  onProgress?: (done: number, total: number) => void;
  /** 이 쪽까지만 만든다 */
  maxPages?: number;
};

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), type, IMAGE_QUALITY)
  );

/** 브라우저의 PDF.js 로 연다 — 처음 부를 때만 라이브러리를 받는다 */
const openWithPdfJs = async (file: File): Promise<OpenedPdf> => {
  const pdfjs = await import('pdfjs-dist');
  // worker · 한글 CMap · 기본 글꼴은 같은 출처에 복사해 둔 것(scripts/pdfjs-assets.mjs — 라이브러리와 같은 버전 폴더).
  // CMap 이 없으면 한글 글자가 빠진 채 그려진다. worker 를 번들러에 맡기지 않는다(운영 빌드에서도 같은 주소)
  const assets = `/pdfjs/${pdfjs.version}`;
  pdfjs.GlobalWorkerOptions.workerSrc = `${assets}/pdf.worker.min.mjs`;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assets}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}/standard_fonts/`,
    wasmUrl: `${assets}/wasm/`,
  });
  // 열지 못하면(암호 걸린 PDF 등) worker 를 닫고 알린다
  const doc = await task.promise.catch(async (e: unknown) => {
    await task.destroy();
    throw e;
  });
  return {
    numPages: doc.numPages,
    render: async pageNo => {
      const page = await doc.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: pdfRenderScale(base.width, base.height, PDF_PAGE_EDGE),
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      try {
        await page.render({ canvas, viewport }).promise;
        const webp = await toBlob(canvas, 'image/webp');
        // 지원하지 않는 형식을 달라고 하면 브라우저는 PNG 를 준다 — 그때는 JPEG
        return webp.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg');
      } finally {
        page.cleanup();
        // 캔버스 메모리를 바로 돌려준다(휴대폰 Safari 는 캔버스 메모리 한도가 작다)
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    close: () => doc.loadingTask.destroy(),
  };
};

/** PDF 의 쪽마다 그림 파일을 차례로 만든다(메모리를 아끼려고 한 쪽씩) */
export const renderPdfPages = async (
  file: File,
  { open = openWithPdfJs, onProgress, maxPages = Infinity }: Options = {}
): Promise<File[]> => {
  const pdf = await open(file);
  try {
    const total = Math.min(pdf.numPages, maxPages);
    const out: File[] = [];
    for (let n = 1; n <= total; n++) {
      const blob = await pdf.render(n);
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      out.push(new File([blob], pageFileName(file.name, n, ext), { type: blob.type }));
      onProgress?.(n, total);
    }
    return out;
  } finally {
    await pdf.close?.();
  }
};
