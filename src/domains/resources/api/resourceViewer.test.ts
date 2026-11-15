import { describe, expect, it } from 'vitest';

import { noPreviewNotice, previewCaption } from './resourceViewer';

describe('previewCaption (열람기 아래 설명 줄)', () => {
  it('«문서 미리보기 · 1 / 2»', () => {
    expect(previewCaption({ hasFile: true, page: 0, count: 2 })).toBe('문서 미리보기 · 1 / 2');
  });

  it('첨부 없이 이미지로만 제공되는 자료는 그 사실을 덧붙인다', () => {
    expect(previewCaption({ hasFile: false, page: 1, count: 2 })).toBe(
      '문서 미리보기 · 2 / 2 · 별도 첨부파일 없이 이미지로 제공되는 자료입니다.'
    );
  });
});

describe('noPreviewNotice (미리보기가 없는 자료의 안내)', () => {
  it('한글 파일 — 한글 문서 프로그램에서 열라고 안내한다', () => {
    expect(noPreviewNotice('hwp')).toEqual({
      title: '한글 파일로 제공되는 자료입니다.',
      body: '원본을 내려받아 한글 문서 프로그램에서 열어 보세요.',
    });
  });

  it('그 밖의 파일 — 미리보기가 없다는 사실과 내려받기 안내', () => {
    expect(noPreviewNotice('pdf')).toEqual({
      title: '미리보기가 없는 자료입니다.',
      body: '원본을 내려받아 열어 보세요.',
    });
  });

  it('파일도 없으면 내려받으라고 하지 않는다', () => {
    expect(noPreviewNotice(undefined)).toEqual({ title: '아직 파일이 등록되지 않은 자료입니다.' });
  });
});
