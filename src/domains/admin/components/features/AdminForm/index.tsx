'use client';

// 관리자 폼의 공통 조각 — 폼 본체는 각 화면이 TanStack Form 의 useForm 으로 쓰고, 이 조각들과
// useFormGuards(나가기 경고 · Ctrl/⌘+S · 임시 보관)를 붙인다(설계 6.10).
import type { ActionResult } from '@/domains/admin/lib/actionResult';
import { routeServerErrors } from '@/domains/admin/lib/formSteps';
import type { ComponentProps, ReactNode } from 'react';
import type { ZodType } from 'zod';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { HistoryIcon } from 'lucide-react';
import Link from 'next/link';

/** 다시 열었을 때 쓰던 내용이 남아 있으면 «불러오기 / 버리기» 를 묻는다. */
export const DraftNotice = ({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) => (
  <Alert>
    <HistoryIcon aria-hidden />
    <AlertTitle>저장하지 않은 내용이 있습니다</AlertTitle>
    <AlertDescription>지난번에 쓰던 내용을 불러올 수 있습니다.</AlertDescription>
    <AlertAction>
      <Button size="sm" variant="outline" onClick={onDiscard}>
        버리기
      </Button>
      <Button size="sm" onClick={onRestore}>
        불러오기
      </Button>
    </AlertAction>
  </Alert>
);

/**
 * 폼 아래 고정 막대(설계 6.10 «화면 흐름 표준 › 등록 · 수정») — 화면 아래에 붙어 있어 긴 폼에서도 저장이 보인다.
 * [취소] · (콘텐츠) [임시저장] · [미리보기] · [저장]. extra 에 임시저장 · 미리보기 · «저장하고 계속 등록» 같은 버튼을 넣는다.
 */
export const FormActions = ({
  submitting,
  canSubmit = true,
  cancelHref,
  submitLabel = '저장',
  extra,
}: {
  submitting: boolean;
  canSubmit?: boolean;
  cancelHref: string;
  submitLabel?: string;
  extra?: ReactNode;
}) => (
  <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
    <span className="text-muted-foreground mr-auto hidden text-xs sm:inline">
      <span className="text-destructive">*</span> 필수 · Ctrl/⌘+S 로 저장
    </span>
    <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
      취소
    </Button>
    {extra}
    <Button type="submit" disabled={submitting || !canSubmit}>
      {submitting && <Spinner data-icon="inline-start" />}
      {submitLabel}
    </Button>
  </div>
);

/** 필수 칸 표시 — 이름 옆 * (스크린리더에는 «필수»). */
export const RequiredMark = () => (
  <>
    <span aria-hidden className="text-destructive">
      *
    </span>
    <span className="sr-only">(필수)</span>
  </>
);

/** 글자 수를 보이기 시작하는 비율 — 그 전에는 숨긴다(늘 떠 있으면 읽을 것만 는다) */
const CHAR_COUNT_FROM = 0.8;

/**
 * 글자 수 — «45 / 50». 한도의 80% 를 넘겨 쓸 때만 보이고, 넘으면 붉게.
 * 알림 자리(aria-live)는 늘 그려 두고 내용만 채운다 — 자리가 내용과 함께 생기면 스크린리더가 읽지 않는다.
 */
export const CharCount = ({ value, max }: { value: string; max: number }) => (
  <span
    aria-live="polite"
    className={
      value.length > max
        ? 'text-destructive ml-auto text-xs tabular-nums'
        : 'text-muted-foreground ml-auto text-xs tabular-nums'
    }
  >
    {value.length >= max * CHAR_COUNT_FROM && `${value.length} / ${max}`}
  </span>
);

/** TextField 가 쓰는 TanStack Form 칸(form.Field 의 field) — 글자 칸만 */
type TextFieldApi = {
  state: {
    value: string;
    meta: { isValid: boolean; errors: ComponentProps<typeof FieldError>['errors'] };
  };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

/**
 * 관리자 폼의 글자 칸 한 덩어리 — 이름(필수면 *) · 글자 수(max 를 주면, 한도 가까이에서만) · 입력칸 · 도움말 · 오류.
 * 도움말(description)은 실수를 막는 말일 때만 단다(.md/domains/admin.md «문구 규칙»).
 * 틀리면 칸을 붉게(aria-invalid · data-invalid) 하고 오류 문구를 아래에 단다. 그 밖의 속성(type · placeholder …)은 입력칸에 그대로.
 * 비밀번호 칸은 모양이 달라(보기 · 숨기기, 건드린 뒤에만 붉게) 이것을 쓰지 않는다(PasswordForm).
 */
export const TextField = ({
  field,
  id,
  label,
  required,
  max,
  description,
  multiline,
  className,
  disabled,
  ...inputProps
}: {
  field: TextFieldApi;
  id: string;
  label: ReactNode;
  required?: boolean;
  /** 주면 입력을 그 글자 수로 막고, 한도 가까이 쓰면 «45 / 50» 을 보인다(글자 수 없이 막기만 하려면 maxLength) */
  max?: number;
  description?: ReactNode;
  /** 여러 줄(Textarea) */
  multiline?: boolean;
  /** 칸 덩어리(Field)의 너비 등 */
  className?: string;
  disabled?: boolean;
} & Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'onBlur'>) => {
  const invalid = !field.state.meta.isValid || undefined;
  const control = {
    id,
    value: field.state.value,
    ...(max && { maxLength: max }),
    disabled,
    onBlur: field.handleBlur,
    'aria-invalid': invalid,
  };
  const labelNode = (
    <FieldLabel htmlFor={id}>
      {label}
      {required && (
        <>
          {' '}
          <RequiredMark />
        </>
      )}
    </FieldLabel>
  );
  return (
    <Field data-invalid={invalid} data-disabled={disabled || undefined} className={className}>
      {max ? (
        <div className="flex items-center gap-1">
          {labelNode}
          <CharCount value={field.state.value} max={max} />
        </div>
      ) : (
        labelNode
      )}
      {multiline ? (
        <Textarea {...control} onChange={e => field.handleChange(e.target.value)} />
      ) : (
        <Input {...inputProps} {...control} onChange={e => field.handleChange(e.target.value)} />
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
};

/** 서버가 돌려준 칸별 오류를 TanStack Form 의 칸에 붙인다. */
export const applyServerErrors = (
  result: ActionResult<unknown>,
  setFieldError: (name: string, messages: string[]) => void
) => {
  if (result.ok || !result.error.fields) return;
  for (const [name, messages] of Object.entries(result.error.fields)) setFieldError(name, messages);
};

/**
 * applyServerErrors 의 칸 붙이기 — 그 칸의 «제출 때 오류» 자리에 첫 문구를 넣는다(화면 검증과 같은 자리 · 모양).
 * 칸을 고치면 다음 제출 때 검증이 다시 채운다.
 */
type FieldMetaSetter = (
  name: string,
  updater: (prev: { errorMap: Record<string, unknown> }) => unknown
) => void;
type FormMetaApi = { getFieldMeta: unknown; setFieldMeta: unknown };

// 칸 이름은 서버가 준 문자열이라 폼의 칸 이름 타입으로 좁힐 수 없다. 그린 적 없는 칸(«groupIds.0» · «_» 등)은 건너뛴다 —
// 붙일 자리가 없고(TanStack Form 이 빈 칸 정보로 터진다), 붙여도 고칠 길이 없어 다음 제출이 막힌다. 문장은 알림으로 이미 보인다.
const setSubmitError = (
  form: FormMetaApi,
  name: string,
  error: { message: string } | undefined
) => {
  const meta = (
    form.getFieldMeta as (name: string) => { errorMap: { onSubmit?: unknown } } | undefined
  )(name);
  if (!meta || (!error && !meta.errorMap.onSubmit)) return;
  (form.setFieldMeta as FieldMetaSetter)(name, prev => ({
    ...prev,
    errorMap: { ...prev.errorMap, onSubmit: error },
  }));
};

export const serverFieldError = (form: FormMetaApi) => (name: string, messages: string[]) =>
  setSubmitError(form, name, { message: messages[0] });

// ── 단계로 나눈 등록 화면(새 사용자 · 새 그룹) — 단계 상태는 lib/formSteps ──
type StepFormApi = FormMetaApi & { state: { values: unknown } };

/** 한 단계의 칸만 폼과 같은 zod 스키마로 검사한다 — 틀린 칸에 오류를 달고, 고쳐진 칸의 오류는 지운다. 모두 맞으면 true */
export const checkFields = (form: StepFormApi, schema: ZodType, names: readonly string[]) => {
  const errors = zodFormValidator(schema)({ value: form.state.values })?.fields ?? {};
  names.forEach(name => setSubmitError(form, name, errors[name]));
  return names.every(name => !errors[name]);
};

/**
 * 다시 내기 전에 지난번 «제출 때 오류»(서버가 붙인 것 포함)를 지운다 — 폼 검증과 서버가 다시 본다.
 * 지우지 않으면 고치지 않은(또는 고칠 수 없는) 칸의 서버 오류 때문에 TanStack Form 이 제출을 조용히 막는다.
 */
export const clearSubmitErrors = (form: FormMetaApi, names: readonly string[]) =>
  names.forEach(name => setSubmitError(form, name, undefined));

/** 서버가 준 칸 오류를 이 화면의 칸에 붙이고(routeServerErrors), 다시 열 단계를 돌려준다(없으면 null) */
export const applyStepServerErrors = (
  result: ActionResult<unknown>,
  form: FormMetaApi,
  fieldSteps: Readonly<Record<string, number>>
): number | null => {
  if (result.ok) return null;
  const { fields, step } = routeServerErrors(fieldSteps, result.error.fields);
  Object.entries(fields).forEach(([name, messages]) => serverFieldError(form)(name, messages));
  return step;
};

/**
 * TanStack Form 의 폼 단위 검증기 — 화면과 Server Action 이 같은 zod 스키마를 쓴다(ADR 0017).
 * 틀린 칸마다 첫 문구를 그 칸의 오류로 붙인다.
 */
export const zodFormValidator =
  (schema: ZodType) =>
  ({ value }: { value: unknown }) => {
    const parsed = schema.safeParse(value);
    if (parsed.success) return undefined;
    const fields: Record<string, { message: string }> = {};
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0] ?? '');
      if (name && !fields[name]) fields[name] = { message: issue.message };
    }
    return { fields };
  };
