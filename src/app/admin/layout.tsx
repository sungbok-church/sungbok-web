import type { Metadata } from 'next';

// 관리자 영역 전체 — 검색에 걸리지 않게 한다. 사이트 헤더·푸터는 (site) 묶음에만 있다.
export const metadata: Metadata = {
  title: '관리자 | 성복교회',
  robots: { index: false, follow: false },
};

// 관리자도 미리 만든 틀 + Suspense(Next 권장 «즉시 이동» — ADR 0027). 요청 때의 일(로그인 쿠키 · 데이터)은 각 레이아웃 ·
// 화면이 Suspense 안에서 하거나, 기다려도 되는 곳에 instant = false 를 단다. CSP 는 nonce 없이(proxy · adminCsp).
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
