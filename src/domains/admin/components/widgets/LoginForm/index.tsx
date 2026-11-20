'use client';

import { signIn, type LoginState } from '@/domains/admin/api/authActions';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { CircleAlertIcon, ClockIcon } from 'lucide-react';
import { useActionState } from 'react';

interface Props {
  /** 로그인 뒤 갈 곳 — 서버가 이미 `/admin` 안 경로로 정리한 값 */
  next: string;
  /** Supabase 환경변수가 있는가. 없으면 칸 대신 안내만 보인다 */
  configured: boolean;
  /** 로그인 화면으로 온 까닭 — idle: 오래 쓰지 않아 로그아웃됨(proxy) */
  reason?: 'idle' | 'inactive';
}

const INITIAL: LoginState = {};

/**
 * 관리자 로그인 폼(이메일 + 비밀번호). 검증·로그인·이동은 Server Action(`signIn`)이 한다.
 * 폼의 틀은 shadcn 의 FieldGroup · Field, 오류 안내는 Alert 를 쓴다(.claude/skills/shadcn — 관리자 폼의 기본 모양).
 */
export const LoginForm = ({ next, configured, reason }: Props) => {
  const [state, formAction, pending] = useActionState(signIn, INITIAL);

  if (!configured) {
    return (
      <p role="status" className="text-muted-foreground m-0 text-sm">
        관리자 로그인이 아직 설정되지 않았습니다.
      </p>
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
          <FieldLabel htmlFor="admin-login-password">비밀번호</FieldLabel>
          <Input
            id="admin-login-password"
            name="password"
            type="password"
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
