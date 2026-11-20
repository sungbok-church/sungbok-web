import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseInput, toActionError } from './actionResult';

describe('toActionError — DB 오류 → 오류 코드', () => {
  it('권한 거절: 우리 트리거의 한글 문장은 NOT_ALLOWED + 그 문장, 아니면 NO_PERMISSION', () => {
    expect(toActionError({ code: '42501', message: '자기 그룹은 바꿀 수 없습니다' })).toEqual({
      code: 'NOT_ALLOWED',
      message: '자기 그룹은 바꿀 수 없습니다',
    });
    expect(
      toActionError({
        code: '42501',
        message: 'new row violates row-level security policy for table "groups"',
      })
    ).toEqual({ code: 'NO_PERMISSION', message: '권한이 없습니다.' });
  });

  it('중복은 DUPLICATE', () => {
    expect(
      toActionError({ code: '23505', message: 'duplicate key value violates unique constraint "x"' })
        .code
    ).toBe('DUPLICATE');
  });

  it('규칙 위반: 한글 문장이면 그대로, 영문(제약 이름 등)이면 감춘다', () => {
    expect(
      toActionError({ code: '23514', message: '«전체 관리» 에 활성 사용자가 한 명은 남아야 합니다' })
    ).toEqual({ code: 'NOT_ALLOWED', message: '«전체 관리» 에 활성 사용자가 한 명은 남아야 합니다' });
    expect(
      toActionError({ code: '23503', message: 'insert or update violates foreign key constraint' })
    ).toEqual({ code: 'NOT_ALLOWED', message: '이 값으로는 저장할 수 없습니다.' });
  });

  it('그 밖의 오류 · 오류 없음은 INTERNAL — DB 오류 원문이 새지 않는다', () => {
    const internal = toActionError({ code: 'XX000', message: 'internal: relation "public.x"' });
    expect(internal.code).toBe('INTERNAL');
    expect(internal.message).not.toContain('relation');
    expect(toActionError(null).code).toBe('INTERNAL');
  });
});

describe('parseInput', () => {
  const schema = z.object({
    name: z.string().trim().min(1, '이름을 넣어 주세요.'),
    sort: z.number().int(),
  });

  it('맞으면 정리된 값을 돌려준다', () => {
    expect(parseInput(schema, { name: ' 새 그룹 ', sort: 1 })).toEqual({
      ok: true,
      data: { name: '새 그룹', sort: 1 },
    });
  });

  it('틀리면 INVALID_INPUT + 칸별 문장(fields)', () => {
    expect(parseInput(schema, { name: '', sort: 1.5 })).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '입력한 값을 확인해 주세요.',
        fields: { name: ['이름을 넣어 주세요.'], sort: [expect.any(String)] },
      },
    });
  });
});
