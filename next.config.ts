import type { NextConfig } from 'next';
import { buildRedirects } from './src/shared/config/siteNav';

const nextConfig: NextConfig = {
  // next/image 변환기(/_next/image)는 쓰지 않는다 — 레포 사진은 미리 만든 크기 파일(<Photo>),
  // 유튜브 썸네일은 유튜브의 크기별 주소(<YoutubeThumb>)로 받는다(ADR 0013). 외부 주소 허용 목록도 두지 않는다.
  output: 'standalone',
  // 캐시는 'use cache' + cacheLife 한 방식으로(ADR 0024). 링크 미리 받기는 경로마다 공용 틀 하나(Partial Prefetching) —
  // Next 의 새 프로젝트 권장 설정이고 다음 큰 버전부터 항상 켜진다.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 한 번 본 화면(요청마다 그리는 화면 — 관리자 전부)을 브라우저가 60초 들고 있다가, 그 안에 링크로 다시 가면 서버에 묻지 않고
    // 바로 보인다(Next 공식 설정, 기본 0초). 저장(Server Action 의 revalidatePath)은 들고 있던 화면을 버리므로 내가 고친 것은
    // 바로 보인다 — 다른 사람이 그 사이 고친 것만 최대 60초 늦게 보일 수 있다(2026-11-28 사용자 결정).
    staleTimes: { dynamic: 60 },
  },
  // 상위 메뉴 → 첫 하위, 레거시 경로 → 새 경로. 목록은 siteNav 에서 파생(siteNav.test.ts 가 검증).
  async redirects() {
    return buildRedirects();
  },
};

export default nextConfig;
