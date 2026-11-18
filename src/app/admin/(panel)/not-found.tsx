import { Button } from '@/shared/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/shared/components/ui/empty';
import Link from 'next/link';

// 관리자 안에서 없는 주소를 열었을 때(꺼진 메뉴·지워진 글의 옛 링크 등).
export default function AdminNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle role="heading" aria-level={2}>
          페이지를 찾을 수 없습니다
        </EmptyTitle>
        <EmptyDescription>주소가 바뀌었거나 없는 화면입니다.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {/* 버튼을 링크로 그릴 때는 nativeButton={false} 를 함께 준다(Base UI) */}
        <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
          첫 화면으로
        </Button>
      </EmptyContent>
    </Empty>
  );
}
