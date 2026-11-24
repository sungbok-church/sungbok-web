import { describe, expect, it } from 'vitest';

import {
  fitLongEdge,
  variantSizes,
  isAllowedPath,
  keepAsIs,
  storagePath,
  uploadTypeOf,
  uuidV7,
} from './fileUpload';

describe('uuidV7', () => {
  it('버전 7 · 변형 10 · 앞 48비트가 밀리초 시각', () => {
    const id = uuidV7(0x0190a0b0c0d0, new Uint8Array(16).fill(0xff));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id.startsWith('0190a0b0-c0d0-7')).toBe(true);
  });
  it('시각이 늦으면 글자 순서도 뒤', () => {
    const r = new Uint8Array(16);
    expect(uuidV7(1000, r) < uuidV7(1001, r)).toBe(true);
  });
});

describe('uploadTypeOf', () => {
  it('받는 종류만 — 확장자는 종류에서 정한다', () => {
    expect(uploadTypeOf('image/webp', 'a.webp')).toEqual({ kind: 'IMAGE', ext: 'webp' });
    expect(uploadTypeOf('image/jpeg', '사진.JPG')).toEqual({ kind: 'IMAGE', ext: 'jpg' });
    expect(uploadTypeOf('image/png', 'a.png')).toEqual({ kind: 'IMAGE', ext: 'png' });
    expect(uploadTypeOf('application/pdf', 'a.pdf')).toEqual({ kind: 'PDF', ext: 'pdf' });
  });
  it('한글 파일은 브라우저가 종류를 비워 주기도 해서 확장자로 본다', () => {
    expect(uploadTypeOf('', '시트지.hwp')).toEqual({ kind: 'HWP', ext: 'hwp' });
    expect(uploadTypeOf('application/x-hwp', 'a.HWP')).toEqual({ kind: 'HWP', ext: 'hwp' });
  });
  it('그 밖(영상 · 실행 파일 · 확장자만 바꾼 것)은 null', () => {
    expect(uploadTypeOf('video/mp4', 'a.mp4')).toBeNull();
    expect(uploadTypeOf('image/gif', 'a.gif')).toBeNull();
    expect(uploadTypeOf('', 'a.webp')).toBeNull();
  });
});

describe('storagePath · isAllowedPath', () => {
  const list = '0190a0b0-0000-7000-8000-000000000001';
  const file = '0190a0b0-0000-7000-8000-000000000002';
  it('<메뉴>/<묶음>/<파일>.<확장자>', () => {
    expect(storagePath('bulletin', list, file, 'webp')).toBe(`bulletin/${list}/${file}.webp`);
  });
  it('그 메뉴 아래의 <묶음>/<파일>.<확장자> 만 — 묶음은 어느 것이든(고치기 · 복제는 앞 묶음의 파일을 가리킨다)', () => {
    expect(isAllowedPath(`bulletin/${list}/${file}.webp`, 'bulletin')).toBe(true);
    expect(isAllowedPath(`bulletin/${file}/${file}.webp`, 'bulletin')).toBe(true);
    expect(isAllowedPath(`album/${list}/${file}.webp`, 'bulletin')).toBe(false);
    expect(isAllowedPath(`bulletin/${list}/../x.webp`, 'bulletin')).toBe(false);
    expect(isAllowedPath(`bulletin/${list}/${file}.webp/x`, 'bulletin')).toBe(false);
    expect(isAllowedPath(`bulletin/${list}/한글.webp`, 'bulletin')).toBe(false);
  });
  it('종류를 주면 확장자가 맞아야 한다', () => {
    expect(isAllowedPath(`bulletin/${list}/${file}.jpg`, 'bulletin', 'IMAGE')).toBe(true);
    expect(isAllowedPath(`bulletin/${list}/${file}.pdf`, 'bulletin', 'IMAGE')).toBe(false);
  });
});

describe('fitLongEdge', () => {
  it('긴 변이 한도를 넘으면 비율대로 줄인다', () => {
    expect(fitLongEdge(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitLongEdge(1000, 3001, 2000)).toEqual({ width: 666, height: 2000 });
  });
  it('작으면 그대로', () => {
    expect(fitLongEdge(1200, 854, 2000)).toEqual({ width: 1200, height: 854 });
  });
});

describe('keepAsIs', () => {
  it('WebP · JPEG 이고 한도 안이면 다시 만들지 않는다', () => {
    expect(keepAsIs('image/webp', 1200, 854, 2000)).toBe(true);
    expect(keepAsIs('image/jpeg', 2000, 1000, 2000)).toBe(true);
  });
  it('PNG 이거나 크면 줄여서 다시 만든다', () => {
    expect(keepAsIs('image/png', 100, 100, 2000)).toBe(false);
    expect(keepAsIs('image/jpeg', 4032, 3024, 2000)).toBe(false);
  });
});

describe('variantSizes — 폭별 파일의 크기(부서 · 히어로 사진)', () => {
  it('원본보다 좁은 폭만, 비율대로(높이 반올림)', () => {
    expect(variantSizes(2000, 1333)).toEqual([
      { width: 640, height: 427 },
      { width: 960, height: 640 },
      { width: 1280, height: 853 },
      { width: 1920, height: 1280 },
    ]);
    expect(variantSizes(1000, 1500)).toEqual([
      { width: 640, height: 960 },
      { width: 960, height: 1440 },
    ]);
  });
  it('원본이 640 이하면 만들지 않는다', () => {
    expect(variantSizes(640, 480)).toEqual([]);
  });
});
