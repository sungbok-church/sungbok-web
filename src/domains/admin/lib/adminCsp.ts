// 관리자 화면의 Content-Security-Policy(설계 6.10 «보안 헤더»). 로그인 쿠키는 브라우저 스크립트가 읽을 수 있으므로
// (@supabase/ssr 방식) 남의 스크립트가 실행되는 것(XSS)을 막는 것이 곧 로그인 탈취를 막는 것이다.
// 스크립트는 nonce 를 단 것만(Next 가 요청 헤더의 CSP 에서 nonce 를 읽어 자기 스크립트에 단다 — Next 16 CSP 안내).
// 스타일은 'unsafe-inline' — Base UI · shadcn 부품이 style 속성(위치 · CSS 변수)을 쓴다. 스타일은 스크립트를 실행하지 못한다.

export const buildAdminCsp = ({
  nonce,
  supabaseUrl,
  isDev,
}: {
  nonce: string;
  supabaseUrl: string | undefined;
  isDev: boolean;
}): string => {
  const supabase = supabaseUrl ? ` ${new URL(supabaseUrl).origin}` : '';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:${supabase}`,
    `font-src 'self'`,
    `connect-src 'self'${supabase}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
};
