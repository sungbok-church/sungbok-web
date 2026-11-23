'use client';

import { changePassword } from '@/domains/admin/api/actions/passwordActions';
import {
  type PasswordInput as PasswordValues,
  passwordInputSchema,
} from '@/domains/admin/lib/input/passwordInput';
import { applyServerErrors, serverFieldError } from '@/domains/admin/components/features/AdminForm';
import { PasswordInput } from '@/domains/admin/components/features/PasswordInput';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/ui/field';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm } from '@tanstack/react-form';
import { CircleAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FIELDS: { name: keyof PasswordValues; label: string; description?: string }[] = [
  // 규칙은 passwordInput.ts(8~72자)와 Supabase 의 same_password 거절(passwordActions.ts)을 그대로 적는다
  {
    name: 'password',
    label: '새 비밀번호',
    description: '8자 이상 72자 이하로, 지금 쓰는 비밀번호와 다르게 정해 주세요.',
  },
  { name: 'confirm', label: '새 비밀번호 확인' },
];

/**
 * 비밀번호 바꾸기 — 관리자 폼의 기본 모양(TanStack Form + 같은 zod 스키마를 화면 · 서버가 함께 쓴다, ADR 0017).
 * 비밀번호 폼이라 쓰던 내용을 보관하지 않는다(설계 6.10). 칸은 보기 · 숨기기와 Caps Lock 안내가 붙은 PasswordInput.
 */
export const PasswordForm = ({ forced, email }: { forced: boolean; email?: string }) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { password: '', confirm: '' } as PasswordValues,
    validators: { onSubmit: passwordInputSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await changePassword(value);
      if (!result.ok) {
        setError(result.error.message);
        applyServerErrors(result, serverFieldError(form)); // 어느 칸이 틀렸는지(«지금 비밀번호와 다른…» 등)
        return;
      }
      router.replace('/admin');
      router.refresh();
    },
  });

  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {/* 비밀번호 관리자가 새 비밀번호를 어느 계정에 저장할지 알게 하는 숨은 칸(Chrome 권장 — 보내지 않는다) */}
      {email && <input type="email" autoComplete="username" value={email} readOnly hidden />}
      <FieldGroup>
        {forced && (
          <Alert>
            <CircleAlertIcon aria-hidden />
            <AlertDescription>
              처음 로그인했거나 비밀번호가 초기화됐습니다. 새 비밀번호를 정해 주세요.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {FIELDS.map(({ name, label, description }) => (
          <form.Field key={name} name={name}>
            {field => {
              const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid || undefined}>
                  <FieldLabel htmlFor={`password-${name}`}>{label}</FieldLabel>
                  <PasswordInput
                    id={`password-${name}`}
                    name={name}
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => field.handleChange(e.target.value)}
                    aria-invalid={invalid || undefined}
                  />
                  {description && <FieldDescription>{description}</FieldDescription>}
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              );
            }}
          </form.Field>
        ))}
        <form.Subscribe selector={s => s.isSubmitting}>
          {submitting => (
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              비밀번호 바꾸기
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};
