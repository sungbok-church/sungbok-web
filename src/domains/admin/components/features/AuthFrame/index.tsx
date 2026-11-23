import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { ChurchIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  /** 화면 제목(이 화면의 h1) */
  title: string;
  /** 제목 아래 한 줄 설명 — 꼭 필요할 때만(로그인 화면은 없다: 글자가 많으면 어지럽다, 2026-11-23 사용자) */
  description?: string;
  children: ReactNode;
  /** 카드 아래 — 홈페이지로 돌아가기 · 로그아웃 같은 나가는 길 */
  footer?: ReactNode;
}

/**
 * 로그인 · 비밀번호 바꾸기가 함께 쓰는 틀 — shadcn 로그인 블록 login-03 의 모양(옅은 바탕 · 가운데 카드 · 위에 교회 표시).
 * 교회 표시는 왼쪽 메뉴 머리(AdminSidebar)와 같은 ChurchIcon 타일이다 — 공개 사이트의 HomeLogo 는 B1 연출 부품이라 가져오지 않는다.
 */
export const AuthFrame = ({ title, description, children, footer }: Props) => (
  <main className="bg-muted flex min-h-svh flex-1 flex-col items-center justify-center p-4 sm:p-6 md:p-10">
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
          <ChurchIcon aria-hidden className="size-6" />
        </span>
        <p className="m-0 text-lg font-semibold">성복교회</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle role="heading" aria-level={1}>
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer && <div className="flex flex-col items-center gap-1">{footer}</div>}
    </div>
  </main>
);
