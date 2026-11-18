import type { Metadata } from 'next';

// 관리자 영역 전체 — 검색에 걸리지 않게 한다. 사이트 헤더·푸터는 (site) 묶음에만 있다.
export const metadata: Metadata = {
  title: '관리자 | 성복교회',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
