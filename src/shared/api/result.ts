// 요청 · 응답 모양(정본, ADR 0022) — Server Action 의 반환값과 Route Handler 의 JSON 이 같은 모양이다.
//   성공 { ok: true, data?, message? }  — message 는 화면에 알릴 문장(토스트)
//   실패 { ok: false, error: { code, message, metadata?, fields? } }
// 예상된 실패(검증 · 권한 · 중복 · 동시 수정 …)는 던지지 않고 돌려준다 — 던진 오류는 운영에서 문장이 가려진다(digest 만).
// 던지는 것은 버그(예상하지 못한 오류)뿐이고, 오류 화면(error.tsx)과 서버 로그가 받는다.
import { ERROR_CODES, type ErrorCode, type ErrorMetadata } from './errorCodes';

export type { ErrorCode, ErrorMetadata } from './errorCodes';

export type AppError = {
  code: ErrorCode;
  /** 서버가 완성한 문장 — 화면은 그대로 보여 준다 */
  message: string;
  /** 그 코드에 필요한 동적 값(기다릴 초 등) — 화면이 동작에 쓴다 */
  metadata?: ErrorMetadata;
  /** 입력 칸 이름 → 그 칸의 문장들(INVALID_INPUT) */
  fields?: Record<string, string[]>;
};

export type Result<T = void> =
  { ok: true; data?: T; message?: string } | { ok: false; error: AppError };

type ErrorOptions = {
  metadata?: ErrorMetadata;
  fields?: Record<string, string[]>;
  /** DB 규칙(트리거)이 준 한글 문장 — 있으면 코드의 기본 문장 대신 쓴다 */
  detail?: string;
};

export const appError = (code: ErrorCode, options: ErrorOptions = {}): AppError => {
  const { metadata, fields, detail } = options;
  return {
    code,
    message: detail ?? ERROR_CODES[code].message(metadata),
    ...(metadata && { metadata }),
    ...(fields && { fields }),
  };
};

export const fail = (code: ErrorCode, options?: ErrorOptions) => ({
  ok: false as const,
  error: appError(code, options),
});

/** Route Handler 성공 응답 */
export const okResponse = <T>(data: T, init?: ResponseInit) =>
  Response.json({ ok: true, data }, init);

/** Route Handler 실패 응답 — 코드의 HTTP 상태로 */
export const errorResponse = (code: ErrorCode, options?: ErrorOptions) =>
  Response.json(
    { ok: false, error: appError(code, options) },
    { status: ERROR_CODES[code].status }
  );
