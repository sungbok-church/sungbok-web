'use client';

import { createCategory, createCode } from '@/domains/admin/api/actions/itemActions';
import { categoryCreateSchema, codeCreateSchema } from '@/domains/admin/lib/input/itemInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import {
  applyServerErrors,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm } from '@tanstack/react-form';
import { PlusIcon } from 'lucide-react';

import { ITEM_KINDS, type ItemKind } from './itemKinds';

// 종류마다 다른 것: 넣는 Server Action · 스키마(문구 · 영문 값 칸은 ITEM_KINDS)
const ACTIONS = {
  categories: { schema: categoryCreateSchema, create: createCategory },
  codes: { schema: codeCreateSchema, create: createCode },
} as const;

/** 분류 · 공통코드 더하기(이름 · 영문 값). 화면에는 이름만 보이고, 영문 값은 프로그램 · 공개 주소가 쓴다. */
export const ItemCreateForm = ({ kind, groupKey }: { kind: ItemKind; groupKey: string }) => {
  const k = { ...ITEM_KINDS[kind], ...ACTIONS[kind] };
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
      applyServerErrors(result, serverFieldError(formApi)); // 서버 검사에서 틀린 칸 — 그 칸에도 표시(UserForm 과 같게)
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
          <TextField
            field={field}
            id={`${kind}-new-label`}
            label="새 이름"
            required
            maxLength={50}
            className="sm:w-56"
          />
        )}
      </form.Field>
      <form.Field name={k.field}>
        {field => (
          <TextField
            field={field}
            id={`${kind}-new-value`}
            label={k.fieldLabel}
            required
            maxLength={50}
            autoCapitalize={kind === 'codes' ? 'characters' : 'none'}
            placeholder={k.placeholder}
            description={k.fieldHint}
            className="sm:w-64"
          />
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
