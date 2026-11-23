'use client';

import { type ForgotState, requestPasswordReset } from '@/domains/admin/api/actions/authActions';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { CircleAlertIcon, MailCheckIcon } from 'lucide-react';
import { useActionState } from 'react';

const INITIAL: ForgotState = {};

/**
 * 비밀번호 찾기 — 이메일을 받아 새 비밀번호를 정하는 링크 메일을 요청한다(Server Action `requestPasswordReset`).
 * 보낸 뒤에는 칸 대신 결과만 보인다. 계정이 있든 없든 같은 결과다(계정이 있는지 알려 주지 않는다).
 * 모양은 LoginForm 과 같다(FieldGroup · Field · Alert). 화면의 틀은 AuthFrame(login/forgot/page.tsx).
 */
export const ForgotPasswordForm = () => {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL);

  if (state.sent) {
    return (
      <Alert>
        <MailCheckIcon aria-hidden />
        <AlertDescription>
          입력한 주소로 메일을 보냈습니다. 메일의 링크로 새 비밀번호를 정해 주세요.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        {state.error && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="admin-forgot-email">이메일</FieldLabel>
          <Input
            id="admin-forgot-email"
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
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? '보내는 중…' : '메일 보내기'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
