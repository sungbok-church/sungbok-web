// 관리자 화면의 Content-Security-Policy(설계 6.10 «보안 헤더»). 로그인 쿠키는 브라우저 스크립트가 읽을 수 있으므로
// (@supabase/ssr 방식) 남의 스크립트가 실행되는 것(XSS)을 막는 것이 곧 로그인 탈취를 막는 것이다.
// 스크립트 파일은 이 사이트 것만. 인라인 스크립트는 허용한다 — Next 가 화면 데이터를 인라인 스크립트로 싣고, 관리자 화면을
// 미리 만든 틀(PPR)로 보이려면 요청마다 다른 nonce 를 쓸 수 없다(Next CSP 안내 — ADR 0027). 남이 글자를 스크립트로 끼워 넣는
// 길은 React 가 글자를 모두 무해하게 바꾸는 것으로 막고, 그것을 우회하는 dangerouslySetInnerHTML 은 lint(react/no-danger)가 막는다.
// 스타일은 'unsafe-inline' — Base UI · shadcn 부품이 style 속성(위치 · CSS 변수)을 쓴다. 스타일은 스크립트를 실행하지 못한다.

export const buildAdminCsp = ({
  supabaseUrl,
  isDev,
  framable = false,
}: {
  supabaseUrl: string | undefined;
  isDev: boolean;
  /** 이 사이트가 틀(iframe) 안에 넣을 수 있는가 — 콘텐츠 미리보기 틀(/admin/preview)만. 다른 관리자 화면은 누구도 못 넣는다 */
  framable?: boolean;
}): string => {
  const supabase = supabaseUrl ? ` ${new URL(supabaseUrl).origin}` : '';
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    // 유튜브 썸네일 — 주일광고 · 성복의 뜰 등록 · 상세가 보인다
    `img-src 'self' blob: data:${supabase} https://i.ytimg.com`,
    `font-src 'self'`,
    `connect-src 'self'${supabase}`,
    // 유튜브 플레이어 틀 — 콘텐츠 미리보기 틀(공개 «영상 한 편» 화면을 그린다)에서만
    `frame-src 'self'${framable ? ' https://www.youtube-nocookie.com https://www.youtube.com' : ''}`,
    // PDF.js 의 worker(설교 시트지 등록 — PDF 쪽 그림 만들기). 같은 출처 파일
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors ${framable ? "'self'" : "'none'"}`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
};
