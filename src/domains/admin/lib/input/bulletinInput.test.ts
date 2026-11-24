import { describe, expect, it } from 'vitest';

import { bulletinCreateSchema, bulletinUpdateSchema, MAX_BULLETIN_PAGES } from './bulletinInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const page = (n: number) => ({
  path: `bulletin/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.webp`,
  kind: 'IMAGE',
  width: 1200,
  height: 854,
  bytes: 1,
  originalName: `${n}.webp`,
});
const valid = { date: '2026-11-29', pages: [page(2), page(3)], status: 'DRAFT' };

describe('bulletinCreateSchema', () => {
  it('그림 파일만 — PDF · 한글 파일은 안 된다(공개 화면이 그림으로 보인다)', () => {
    const pdf = {
      ...page(2),
      path: `bulletin/${LIST}/0190a0b0-0000-7000-8000-000000000002.pdf`,
      kind: 'PDF',
      width: null,
      height: null,
    };
    expect(bulletinCreateSchema.safeParse({ ...valid, pages: [pdf] }).success).toBe(false);
  });
  it('날짜 · 쪽(1장 이상) · 상태', () => {
    expect(bulletinCreateSchema.safeParse(valid).success).toBe(true);
  });
  it('평일 날짜도 된다(성탄절 등) — 없는 날짜는 안 된다', () => {
    expect(bulletinCreateSchema.safeParse({ ...valid, date: '2026-12-25' }).success).toBe(true);
    expect(bulletinCreateSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(bulletinCreateSchema.safeParse({ ...valid, date: '' }).success).toBe(false);
  });
  it('쪽이 없거나 너무 많으면, 다른 메뉴의 파일이면 안 된다', () => {
    const r = bulletinCreateSchema.safeParse({ ...valid, pages: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('쪽을 한 장 이상 올려 주세요.');
    const many = Array.from({ length: MAX_BULLETIN_PAGES + 1 }, () => page(2));
    expect(bulletinCreateSchema.safeParse({ ...valid, pages: many }).success).toBe(false);
    const other = { ...page(2), path: page(2).path.replace('bulletin/', 'album/') };
    expect(bulletinCreateSchema.safeParse({ ...valid, pages: [other] }).success).toBe(false);
  });
});

describe('bulletinUpdateSchema', () => {
  it('id · 열었을 때의 수정 시각이 더 있어야 한다', () => {
    expect(bulletinUpdateSchema.safeParse(valid).success).toBe(false);
    expect(
      bulletinUpdateSchema.safeParse({ ...valid, id: LIST, updatedAt: '2026-11-24T00:00:00Z' })
        .success
    ).toBe(true);
  });
});
