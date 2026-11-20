import { describe, expect, it } from 'vitest';

import { codeCreateSchema, codeUpdateSchema, menuUpdateSchema, moveSchema } from './codeInput';

describe('codeCreateSchema', () => {
  it('코드는 영문 대문자 · 숫자 · _(소문자로 써도 대문자로), 이름은 1~50자', () => {
    expect(
      codeCreateSchema.parse({ groupKey: 'STAFF_ROLE', code: ' elder ', label: ' 장로 ' })
    ).toEqual({
      groupKey: 'STAFF_ROLE',
      code: 'ELDER',
      label: '장로',
    });
    const r = codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: '장로-1', label: '' });
    expect(r.error?.issues.map(i => String(i.path[0]))).toEqual(['code', 'label']);
  });

  it('숫자로 시작하거나 - 를 쓰면 안 된다(DB check 와 같게)', () => {
    expect(
      codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: '1ST', label: '가' }).success
    ).toBe(false);
    expect(
      codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: 'A-B', label: '가' }).success
    ).toBe(false);
  });
});

describe('codeUpdateSchema · menuUpdateSchema', () => {
  it('코드: 이름 · 사용 여부', () => {
    expect(
      codeUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '가',
        isActive: false,
      })
    ).toMatchObject({ isActive: false });
  });

  it('메뉴: 이름을 비우면 null(= 기본 이름으로)', () => {
    expect(
      menuUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '  ',
        isActive: true,
      }).label
    ).toBeNull();
  });
});

describe('moveSchema', () => {
  it('위 · 아래만', () => {
    expect(
      moveSchema.safeParse({ id: '0190a0b0-0000-7000-8000-000000000001', dir: 'left' }).success
    ).toBe(false);
  });
});
