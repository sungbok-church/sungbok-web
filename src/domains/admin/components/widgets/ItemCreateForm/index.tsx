'use client';

import { createCategory } from '@/domains/admin/api/categoryActions';
import { categoryCreateSchema } from '@/domains/admin/api/categoryInput';
import { createCode } from '@/domains/admin/api/codeActions';
import { codeCreateSchema } from '@/domains/admin/api/codeInput';
import { notifyResult } from '@/domains/admin/api/notify';
import { RequiredMark, zodFormValidator } from '@/domains/admin/components/features/AdminForm';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm } from '@tanstack/react-form';
import { PlusIcon } from 'lucide-react';

const KINDS = {
  categories: {
    schema: categoryCreateSchema,
    create: createCategory,
    field: 'slug',
    fieldLabel: '영문 이름',
    hint: '공개 주소에 쓰입니다. 영문 소문자 · 숫자 · - (나중에 바꿀 수 없습니다)',
    placeholder: '예: church-event',
  },
  codes: {
    schema: codeCreateSchema,
    create: createCode,
    field: 'code',
    fieldLabel: '코드 값',
    hint: '영문 대문자 · 숫자 · _ (나중에 바꿀 수 없습니다)',
    placeholder: '예: ELDER',
  },
} as const;

/** 분류 · 공통코드 더하기(이름 · 영문 값). 화면에는 이름만 보이고, 영문 값은 프로그램 · 공개 주소가 쓴다. */
export const ItemCreateForm = ({
  kind,
  groupKey,
}: {
  kind: keyof typeof KINDS;
  groupKey: string;
}) => {
  const k = KINDS[kind];
  // 두 종류의 영문 칸(slug · code)을 다 두고 그 종류의 칸만 그린다 — 스키마는 모르는 칸을 버린다
  const empty = { groupKey, slug: '', code: '', label: '' };
  const form = useForm({
    defaultValues: empty,
    validators: { onSubmit: zodFormValidator(k.schema) },
    onSubmit: async ({ value, formApi }) => {
      const result = await k.create({
        groupKey,
        [k.field]: value[k.field],
        label: value.label,
      });
      notifyResult(result);
      // 표는 Server Action 이 다시 그려 보낸다(revalidatePath) — router.refresh 를 또 부르지 않는다
      if (result.ok) formApi.reset(empty);
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={e => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="label">
        {field => (
          <Field data-invalid={!field.state.meta.isValid || undefined} className="sm:w-56">
            <FieldLabel htmlFor={`${kind}-new-label`}>
              새 이름 <RequiredMark />
            </FieldLabel>
            <Input
              id={`${kind}-new-label`}
              value={field.state.value}
              maxLength={50}
              onChange={e => field.handleChange(e.target.value)}
              aria-invalid={!field.state.meta.isValid || undefined}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name={k.field}>
        {field => (
          <Field data-invalid={!field.state.meta.isValid || undefined} className="sm:w-64">
            <FieldLabel htmlFor={`${kind}-new-value`}>
              {k.fieldLabel} <RequiredMark />
            </FieldLabel>
            <Input
              id={`${kind}-new-value`}
              value={field.state.value}
              maxLength={50}
              autoCapitalize={kind === 'codes' ? 'characters' : 'none'}
              placeholder={k.placeholder}
              onChange={e => field.handleChange(e.target.value)}
              aria-invalid={!field.state.meta.isValid || undefined}
            />
            <FieldDescription>{k.hint}</FieldDescription>
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Subscribe selector={s => s.isSubmitting}>
        {submitting => (
          <Button type="submit" disabled={submitting} className="sm:mt-6">
            {submitting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            더하기
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};
