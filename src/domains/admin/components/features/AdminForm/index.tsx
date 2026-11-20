'use client';

// 관리자 폼의 공통 조각 — 폼 본체는 각 화면이 TanStack Form 의 useForm 으로 쓰고, 이 조각들과
// useFormGuards(나가기 경고 · Ctrl/⌘+S · 임시 보관)를 붙인다(설계 6.10).
import type { ActionResult } from '@/domains/admin/api/actionResult';
import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
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

/** 글자 수 — «12 / 50». 넘으면 붉게. */
export const CharCount = ({ value, max }: { value: string; max: number }) => (
  <span
    aria-live="polite"
    className={
      value.length > max
        ? 'text-destructive ml-auto text-xs tabular-nums'
        : 'text-muted-foreground ml-auto text-xs tabular-nums'
    }
  >
    {value.length} / {max}
  </span>
);

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
// 칸 이름은 서버가 준 문자열이라 폼의 칸 이름 타입으로 좁힐 수 없다 — 없는 이름이면 TanStack Form 이 무시한다
export const serverFieldError =
  (form: { setFieldMeta: unknown }) => (name: string, messages: string[]) =>
    (form.setFieldMeta as FieldMetaSetter)(name, prev => ({
      ...prev,
      errorMap: { ...prev.errorMap, onSubmit: { message: messages[0] } },
    }));

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
