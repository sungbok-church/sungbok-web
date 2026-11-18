import { notFound } from 'next/navigation';

// 관리자 안의 없는 주소 — 공개 사이트의 404(헤더·푸터)가 아니라 관리자 틀 안의 안내(../not-found.tsx)로 보낸다.
// (panel) 묶음 안이라 로그인하지 않은 사람은 여기까지 오지 못한다.
export default function AdminUnknownPage() {
  notFound();
}
