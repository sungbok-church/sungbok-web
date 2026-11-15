// 문서 열람기의 계산(순수) — 쪽 넘김·설명 줄·미리보기 없는 자료의 안내. 확대 단계는 shared/lib/zoomSteps.

// 쪽 표시 «1 / 2»
const pageLabel = (page: number, count: number): string => `${page + 1} / ${count}`;

/** 열람기 아래 설명 줄. 첨부 없이 이미지로만 제공되는 자료는 그 사실을 덧붙인다(내려받을 원본이 없는 이유). */
export const previewCaption = ({
  hasFile,
  page,
  count,
}: {
  hasFile: boolean;
  page: number;
  count: number;
}): string =>
  `문서 미리보기 · ${pageLabel(page, count)}${
    hasFile ? '' : ' · 별도 첨부파일 없이 이미지로 제공되는 자료입니다.'
  }`;

/**
 * 미리보기 쪽이 없는 자료의 안내(열람기 자리에 보인다). 한글 파일은 브라우저가 열지 못해 내려받아 보라고 알린다.
 * 파일도 없으면 내려받으라고 하지 않는다 — 누를 버튼이 없다.
 */
export const noPreviewNotice = (
  kind: 'pdf' | 'hwp' | undefined
): { title: string; body?: string } =>
  kind === 'hwp'
    ? {
        title: '한글 파일로 제공되는 자료입니다.',
        body: '원본을 내려받아 한글 문서 프로그램에서 열어 보세요.',
      }
    : kind
      ? { title: '미리보기가 없는 자료입니다.', body: '원본을 내려받아 열어 보세요.' }
      : { title: '아직 파일이 등록되지 않은 자료입니다.' };
