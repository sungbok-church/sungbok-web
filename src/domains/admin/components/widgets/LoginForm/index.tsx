'use client';

import { PASSWORD_RESET_ENABLED } from '@/domains/admin/lib/passwordReset';
import { signIn, type LoginState } from '@/domains/admin/api/actions/authActions';
import { PasswordInput } from '@/domains/admin/components/features/PasswordInput';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { CircleAlertIcon, ClockIcon } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

interface Props {
  /** 로그인 뒤 갈 곳 — 서버가 이미 `/admin` 안 경로로 정리한 값 */
  next: string;
  /** Supabase 환경변수가 있는가. 없으면 칸 대신 안내(Alert)만 보인다 */
  configured: boolean;
  /** 로그인 화면으로 온 까닭 — idle: 오래 쓰지 않아 로그아웃됨(proxy) · reset_expired: 비밀번호 찾기 링크가 만료됨(login/confirm) */
  reason?: LoginReason;
}

export type LoginReason = 'idle' | 'inactive' | 'reset_expired';

const INITIAL: LoginState = {};

/**
 * 관리자 로그인 폼(이메일 + 비밀번호). 검증·로그인·이동은 Server Action(`signIn`)이 한다.
 * 폼의 틀은 shadcn 의 FieldGroup · Field, 오류 안내는 Alert 를 쓴다(.claude/skills/shadcn — 관리자 폼의 기본 모양).
 * 비밀번호 칸은 보기 · 숨기기와 Caps Lock 안내가 붙은 PasswordInput 이다. 화면의 틀은 AuthFrame(login/page.tsx).
 * 비밀번호 칸 이름 옆에 «비밀번호를 잊으셨나요?» 링크(shadcn login-03 의 자리) — 스스로 찾는다(login/forgot).
 */
export const LoginForm = ({ next, configured, reason }: Props) => {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

  if (!configured) {
    return (
      <Alert>
        <CircleAlertIcon aria-hidden />
        <AlertTitle>관리자 로그인이 아직 설정되지 않았습니다.</AlertTitle>
        <AlertDescription>관리 담당자에게 문의해 주세요.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        {reason === 'idle' && !state.error && (
          <Alert>
            <ClockIcon aria-hidden />
            <AlertDescription>
              오래 사용하지 않아 로그아웃했습니다. 다시 로그인해 주세요.
            </AlertDescription>
          </Alert>
        )}
        {reason === 'inactive' && !state.error && (
          <Alert>
            <CircleAlertIcon aria-hidden />
            <AlertDescription>
              사용할 수 없는 계정입니다. 관리 담당자에게 문의해 주세요.
            </AlertDescription>
          </Alert>
        )}
        {reason === 'reset_expired' && !state.error && (
          <Alert>
            <ClockIcon aria-hidden />
            <AlertDescription>
              링크가 만료됐습니다. 비밀번호 찾기를 다시 해 주세요.
            </AlertDescription>
          </Alert>
        )}
        {state.error && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
        )}
        <input type="hidden" name="next" value={next} />
        <Field>
          <FieldLabel htmlFor="admin-login-email">이메일</FieldLabel>
          <Input
            id="admin-login-email"
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={state.email}
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="admin-login-password">비밀번호</FieldLabel>
            {PASSWORD_RESET_ENABLED && (
              <Link
                href="/admin/login/forgot"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            )}
          </div>
          <PasswordInput
            id="admin-login-password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? '로그인 중…' : '로그인'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
