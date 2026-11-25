'use client';

import { purgeNewcomer, updateNewcomer } from '@/domains/admin/api/actions/newcomerActions';
import {
  applyServerErrors,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { useSaveShortcut, useUnsavedGuard } from '@/domains/admin/hooks/useFormGuards';
import { newcomerUpdateSchema } from '@/domains/admin/lib/input/newcomerAdminInput';
import { NEWCOMER_STATUSES, type NewcomerStatus } from '@/domains/admin/lib/newcomer';
import { notifyResult } from '@/domains/admin/lib/notify';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm, useStore } from '@tanstack/react-form';
import { EllipsisIcon, HistoryIcon, Trash2Icon } from 'lucide-react';
import { useRef, useState } from 'react';

const LIST = '/admin/newcomers';
const formSchema = newcomerUpdateSchema.pick({ status: true, note: true });
const STATUS_ITEMS = NEWCOMER_STATUSES.map(s => ({ value: s.value, label: s.label }));

/** 접수 한 건의 처리 — 상태 · 메모(설계 6.11). 접수 내용은 고치지 않는다. 수정 권한이 없으면 그리지 않는다(상세만). */
export const NewcomerHandleForm = ({
  id,
  updatedAt,
  initial,
}: {
  id: string;
  updatedAt: string;
  initial: { status: NewcomerStatus; note: string };
}) => {
  const done = useRef(false);
  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: zodFormValidator(formSchema) },
    onSubmit: async ({ value }) => {
      const result = await updateNewcomer({ ...value, id, updatedAt });
      if (!result.ok) applyServerErrors(result, serverFieldError(form));
      else {
        form.reset(value);
        done.current = true; // 화면이 새 수정 시각으로 다시 그려질 때까지
      }
      notifyResult(result);
    },
  });
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  useUnsavedGuard(dirty);
  const save = () => {
    if (dirty && !form.state.isSubmitting && !done.current) void form.handleSubmit();
  };
  useSaveShortcut(save);

  return (
    <Card>
      <CardContent>
        <form
          noValidate
          onSubmit={e => {
            e.preventDefault();
            save();
          }}
        >
          <FieldGroup>
            <form.Field name="status">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel htmlFor="newcomer-status">상태</FieldLabel>
                  <Select
                    items={STATUS_ITEMS}
                    value={field.state.value}
                    onValueChange={next => field.handleChange(next as NewcomerStatus)}
                  >
                    <SelectTrigger id="newcomer-status" className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} align="start">
                      <SelectGroup>
                        {STATUS_ITEMS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="note">
              {field => (
                <TextField field={field} id="newcomer-note" label="메모" multiline max={2000} />
              )}
            </form.Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={!dirty || submitting}>
                {submitting && <Spinner data-icon="inline-start" />}
                저장
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

/** 상세 머리의 «더 보기» — 변경 이력 · 완전히 지우기(개인정보라 휴지통 없이). 창은 메뉴 밖에서 연다 */
export const NewcomerDetailActions = ({
  id,
  name,
  canPurge,
  canHistory,
}: {
  id: string;
  name: string;
  canPurge: boolean;
  canHistory: boolean;
}) => {
  const navigate = useAdminNavigate();
  const [dialog, setDialog] = useState<'history' | 'purge' | null>(null);
  const openChange = (kind: 'history' | 'purge') => (open: boolean) =>
    setDialog(open ? kind : null);
  if (!canPurge && !canHistory) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="더 보기" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          {canHistory && (
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setDialog('history')}>
                <HistoryIcon aria-hidden />
                변경 이력
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          {canPurge && canHistory && <DropdownMenuSeparator />}
          {canPurge && (
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => setDialog('purge')}>
                <Trash2Icon aria-hidden />
                완전히 지우기
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canHistory && (
        <HistorySheet
          table="newcomers"
          rowId={id}
          subject={name}
          open={dialog === 'history'}
          onOpenChange={openChange('history')}
        />
      )}
      {canPurge && (
        <ConfirmAction
          kind="purge"
          open={dialog === 'purge'}
          onOpenChange={openChange('purge')}
          onConfirm={async () => {
            const result = await purgeNewcomer({ id });
            if (result.ok) navigate(LIST);
            return result;
          }}
        />
      )}
    </>
  );
};
