import type { Metadata } from 'next';
import { connection } from 'next/server';

// 관리자 영역 전체 — 검색에 걸리지 않게 한다. 사이트 헤더·푸터는 (site) 묶음에만 있다.
export const metadata: Metadata = {
  title: '관리자 | 성복교회',
  robots: { index: false, follow: false },
};

// 관리자는 미리 그린 틀 없이 요청마다 전부 그린다(ADR 0024). 보안 헤더(CSP)가 요청마다 새 nonce 를 쓰는데, 미리 그린 틀의
// 스크립트에는 nonce 가 없어 브라우저가 막는다(Next CSP 안내 «nonce 는 요청마다 그려야 한다» · «PPR 과 함께 못 쓴다»).
// 로그인 쿠키 · 지금 시각(Supabase 인증)도 요청 때의 일이다. 빌드의 «미리 그린 틀이 있어야 한다» 검사는 끈다(instant = false).
export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return children;
}
