import { describe, expect, it } from 'vitest';

import { buildAdminCsp } from './adminCsp';

describe('buildAdminCsp', () => {
  const csp = buildAdminCsp({
    nonce: 'abc123',
    supabaseUrl: 'https://x.supabase.co',
    isDev: false,
  });
  const directive = (name: string) => csp.split('; ').find(d => d.startsWith(`${name} `));

  it('스크립트는 이 사이트와 nonce 를 단 것만(인라인 · eval 없음)', () => {
    expect(directive('script-src')).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it('연결 · 그림은 이 사이트와 Supabase 만', () => {
    expect(directive('connect-src')).toBe("connect-src 'self' https://x.supabase.co");
    expect(directive('img-src')).toBe("img-src 'self' blob: data: https://x.supabase.co");
  });

  it('미리보기 틀(/admin/preview)만 이 사이트가 틀 안에 넣을 수 있다 — 다른 관리자 화면은 아무도', () => {
    expect(
      buildAdminCsp({ nonce: 'n', supabaseUrl: undefined, isDev: false, framable: true })
    ).toContain("frame-ancestors 'self'");
    expect(
      buildAdminCsp({ nonce: 'n', supabaseUrl: undefined, isDev: false, framable: false })
    ).toContain("frame-ancestors 'none'");
  });

  it('다른 사이트가 틀 안에 넣지 못하고, 폼은 이 사이트로만 보낸다', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('한 줄이다(헤더 값)', () => {
    expect(csp).not.toMatch(/\n/);
  });

  it('개발 중에만 unsafe-eval(React 디버깅)', () => {
    expect(
      buildAdminCsp({ nonce: 'n', supabaseUrl: 'http://127.0.0.1:54321', isDev: true })
    ).toContain("'unsafe-eval'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('Supabase 주소가 없으면 이 사이트만', () => {
    const none = buildAdminCsp({ nonce: 'n', supabaseUrl: undefined, isDev: false });
    expect(none).toContain("connect-src 'self';");
  });
});
