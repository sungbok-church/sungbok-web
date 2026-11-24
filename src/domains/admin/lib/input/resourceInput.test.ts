import { describe, expect, it } from 'vitest';

import { resourceCreateSchema, resourceUpdateSchema } from './resourceInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const SERIES = '0190a0b0-0000-7000-8000-0000000000c1';
const f = (n: number, kind: 'PDF' | 'HWP' | 'IMAGE', ext: string) => ({
  path: `resources/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.${ext}`,
  kind,
  width: kind === 'IMAGE' ? 1200 : null,
  height: kind === 'IMAGE' ? 1698 : null,
  bytes: 1,
  originalName: `${n}.${ext}`,
});
const valid = {
  section: 'SUNDAY',
  seriesId: SERIES,
  episode: '66',
  title: ' 구원을 위한 영과 육의 도장 깨기 ',
  date: '2026-10-25',
  year: '',
  passage: '사도행전 13:4-7',
  file: [f(2, 'PDF', 'pdf')],
  pages: [f(3, 'IMAGE', 'webp')],
  videos: 'https://youtu.be/YYW0D6JNrGQ\nYYW0D6JNrGQ  https://www.youtube.com/watch?v=Cm0wL9_z9uM',
  status: 'PUBLISHED',
};

describe('resourceCreateSchema', () => {
  it('회차는 숫자로, 영상은 줄 · 칸으로 나눠 id 로(겹치면 하나), 날짜가 있으면 연도는 비운다', () => {
    const r = resourceCreateSchema.parse(valid);
    expect(r).toMatchObject({
      section: 'SUNDAY',
      episode: 66,
      title: '구원을 위한 영과 육의 도장 깨기',
      date: '2026-10-25',
      year: null,
      passage: '사도행전 13:4-7',
      videoIds: ['YYW0D6JNrGQ', 'Cm0wL9_z9uM'],
    });
  });
  it('날짜를 모르면 연도만 — 회차 · 본문은 비워도 된다', () => {
    const r = resourceCreateSchema.parse({
      ...valid,
      date: '',
      year: '2025',
      episode: '',
      passage: '',
    });
    expect(r).toMatchObject({ date: null, year: 2025, episode: null, passage: null });
  });
  it('원본은 PDF · 한글 파일 하나, 쪽은 그림만', () => {
    expect(
      resourceCreateSchema.safeParse({ ...valid, file: [f(2, 'IMAGE', 'webp')] }).success
    ).toBe(false);
    expect(
      resourceCreateSchema.safeParse({ ...valid, file: [f(2, 'PDF', 'pdf'), f(4, 'HWP', 'hwp')] })
        .success
    ).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...valid, pages: [f(3, 'PDF', 'pdf')] }).success).toBe(
      false
    );
    expect(
      resourceCreateSchema.safeParse({ ...valid, file: [f(4, 'HWP', 'hwp')], pages: [] }).success
    ).toBe(true);
  });
  it('공개하려면 원본이나 쪽 그림이 있어야 한다', () => {
    const r = resourceCreateSchema.safeParse({ ...valid, file: [], pages: [] });
    expect(r.error?.issues[0]).toMatchObject({
      path: ['pages'],
      message: '공개하려면 원본이나 쪽 그림을 올려 주세요.',
    });
    expect(
      resourceCreateSchema.safeParse({ ...valid, file: [], pages: [], status: 'DRAFT' }).success
    ).toBe(true);
  });
  it('틀린 값은 그 칸의 오류', () => {
    const issue = (over: object) =>
      resourceCreateSchema.safeParse({ ...valid, ...over }).error?.issues[0];
    expect(issue({ episode: '6a' })).toMatchObject({ path: ['episode'] });
    expect(issue({ date: '', year: '25' })).toMatchObject({ path: ['year'] });
    expect(issue({ videos: 'https://example.com/x' })).toMatchObject({
      path: ['videos'],
      message: '유튜브 영상 주소를 확인해 주세요: https://example.com/x',
    });
    expect(issue({ passage: 'a'.repeat(101) })).toMatchObject({ path: ['passage'] });
    expect(issue({ section: 'X' })).toMatchObject({ path: ['section'] });
  });
});

describe('resourceUpdateSchema', () => {
  it('id · 열었을 때의 수정 시각이 더 있어야 한다', () => {
    expect(resourceUpdateSchema.safeParse(valid).success).toBe(false);
    expect(resourceUpdateSchema.safeParse({ ...valid, id: LIST, updatedAt: 't' }).success).toBe(
      true
    );
  });
});
