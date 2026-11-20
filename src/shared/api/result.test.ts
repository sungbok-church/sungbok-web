import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from './errorCodes';
import { appError, errorResponse, fail, okResponse } from './result';

describe('appError — 서버가 문장을 완성해 보낸다', () => {
  it('코드의 기본 문장', () => {
    expect(appError('DUPLICATE')).toEqual({ code: 'DUPLICATE', message: '이미 있는 값입니다.' });
  });

  it('metadata 로 문장을 채우고, metadata 도 함께 보낸다(화면이 동작에 쓴다)', () => {
    expect(appError('RATE_LIMITED', { metadata: { retryAfterSec: 90 } })).toEqual({
      code: 'RATE_LIMITED',
      message: '1분 30초 뒤에 다시 시도해 주세요.',
      metadata: { retryAfterSec: 90 },
    });
    expect(appError('RATE_LIMITED').message).toBe('잠시 뒤에 다시 시도해 주세요.');
  });

  it('칸별 오류는 fields 로', () => {
    expect(appError('INVALID_INPUT', { fields: { name: ['이름을 넣어 주세요.'] } })).toEqual({
      code: 'INVALID_INPUT',
      message: '입력한 값을 확인해 주세요.',
      fields: { name: ['이름을 넣어 주세요.'] },
    });
  });

  it('DB 규칙이 준 한글 문장(detail)은 그 코드의 기본 문장 대신 쓴다', () => {
    expect(appError('NOT_ALLOWED', { detail: '자기 그룹은 바꿀 수 없습니다' }).message).toBe(
      '자기 그룹은 바꿀 수 없습니다'
    );
  });
});

describe('fail', () => {
  it('실패 결과 모양 { ok: false, error }', () => {
    expect(fail('NO_PERMISSION')).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
  });
});

describe('Route Handler 응답 — 같은 모양 + HTTP 상태', () => {
  it('성공 { ok: true, data }, 200', async () => {
    const res = okResponse({ items: [1] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { items: [1] } });
  });

  it('실패 { ok: false, error }, 코드의 상태', async () => {
    const res = errorResponse('NOT_FOUND');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: appError('NOT_FOUND') });
  });
});

describe('ERROR_CODES', () => {
  it('코드 이름은 영문 대문자 · _', () => {
    for (const code of Object.keys(ERROR_CODES)) expect(code).toMatch(/^[A-Z][A-Z_]*$/);
  });

  it('모든 코드에 상태 · 기본 문장 · 설명(언제 · 사용자가 할 일)이 있다', () => {
    for (const [code, def] of Object.entries(ERROR_CODES)) {
      expect(def.status, code).toBeGreaterThanOrEqual(400);
      expect(def.message(undefined), code).toMatch(/[가-힣]/);
      expect(def.when, code).toBeTruthy();
    }
  });

  it('문서(.md/architecture/api-response.md)의 표에 모든 코드가 있다', () => {
    const doc = readFileSync('.md/architecture/api-response.md', 'utf8');
    for (const code of Object.keys(ERROR_CODES)) expect(doc, code).toContain(`| \`${code}\` |`);
  });
});
