// Server Action 결과(공용 모양 — @/shared/api/result, ADR 0022)와, DB 오류를 오류 코드로 바꾸는 규칙(설계 6.10 «알림 · 확인»).
// DB 오류 원문(표 · 제약 이름)은 화면에 보이지 않는다. 우리 트리거가 낸 한글 문장만 그대로 보인다.
import { type AppError, appError, fail, type Result } from '@/shared/api/result';
import type { output, ZodType } from 'zod';

export type ActionResult<T = void> = Result<T>;

const hasHangul = (text: string | undefined): text is string => !!text && /[가-힣]/.test(text);

export const toActionError = (error: { code?: string; message?: string } | null): AppError => {
  switch (error?.code) {
    case '42501':
      return hasHangul(error.message)
        ? appError('NOT_ALLOWED', { detail: error.message })
        : appError('NO_PERMISSION');
    case '23505':
      return appError('DUPLICATE');
    case '23514':
    case '23503':
      return appError('NOT_ALLOWED', hasHangul(error.message) ? { detail: error.message } : {});
    default:
      // 원문은 서버 로그에만
      if (error) console.error('[action]', error.code, error.message);
      return appError('INTERNAL');
  }
};

/**
 * Server Action 입력 검증 — 화면과 같은 zod 스키마로 서버에서 다시 본다(화면 검증은 우회할 수 있다).
 * 틀리면 INVALID_INPUT + 칸별 문장(fields)을 담은 실패 결과를 그대로 돌려주면 된다.
 */
export const parseInput = <S extends ZodType>(
  schema: S,
  raw: unknown
): { ok: true; data: output<S> } | ReturnType<typeof fail> => {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const name = issue.path.join('.') || '_';
    (fields[name] ??= []).push(issue.message);
  }
  return fail('INVALID_INPUT', { fields });
};
