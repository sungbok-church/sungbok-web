'use client';

import { createBulletin, updateBulletin } from '@/domains/admin/api/actions/bulletinActions';
import {
  applyServerErrors,
  DraftNotice,
  RequiredMark,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { ContentFormActions } from '@/domains/admin/components/features/ContentFormActions';
import { FileListField } from '@/domains/admin/components/features/FileListField';
import { PreviewDialog } from '@/domains/admin/components/features/PreviewDialog';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import type { ActionResult } from '@/domains/admin/lib/actionResult';
import { bulletinCreateSchema, MAX_BULLETIN_PAGES } from '@/domains/admin/lib/input/bulletinInput';
import type { FileItem } from '@/domains/admin/lib/input/fileInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { useForm, useStore } from '@tanstack/react-form';
import { useEffect, useRef, useState } from 'react';

type Status = 'DRAFT' | 'PUBLISHED';
type Values = { date: string; pages: FileItem[] };

interface Props {
  userId: string;
  initial: Values;
  /** 고치는 주보(없으면 새 주보) */
  editing?: { id: string; updatedAt: string; status: Status };
  /** 사용자를 아직 받지 못했다 — 폼은 바로 쓰고, 임시 저장은 받은 뒤부터(ADR 0027) */
  pending?: boolean;
  /** 새 주보: 서버가 정한 날짜(주소의 ?date= · 없으면 이번 주일) — 오면 아직 손대지 않은 날짜 칸에 넣는다(고친 것으로 치지 않는다) */
  arrivedDate?: string;
}

const LIST = '/admin/bulletin';

/**
 * 주보 등록 · 수정(설계 6.10 — 한 장 폼). 주일 날짜(기본값은 이번 주일, 아무 날짜나 고를 수 있다) + 쪽 그림(올리기 · 순서 · 빼기).
 * 아래 막대: 새 주보 · 임시저장 글은 [임시저장] · [공개], 공개된 글은 [임시저장으로 돌리기](확인 창) · [저장].
 * Enter 로 제출되면 지금 상태 그대로(새 글은 임시저장) — 공개는 [공개] 단추로만 한다. 파일을 올리는 중에는 저장을 막는다.
 * 쓰던 내용은 임시 보관한다(사용자별 · 저장하면 지움 — 설계 6.10).
 */
export const BulletinForm = ({ userId, initial, editing, pending = false, arrivedDate }: Props) => {
  const navigate = useAdminNavigate();
  const [uploading, setUploading] = useState(false);
  const current: Status = editing?.status ?? 'DRAFT';

  // 이번 제출의 상태는 제출할 때 함께 넘긴다(onSubmitMeta) — 단추가 정하고, 그 밖의 제출(Enter · Ctrl/⌘+S)은 지금 상태 그대로.
  // 남겨 두는 값(ref)으로 들고 있으면 검사에 걸려 제출이 멈췄을 때 «공개» 가 남아 다음 Ctrl/⌘+S 가 공개해 버린다.
  const form = useForm({
    defaultValues: initial,
    onSubmitMeta: { status: current } as { status: Status },
    validators: {
      onSubmit: zodFormValidator(bulletinCreateSchema.omit({ status: true })),
    },
    onSubmit: async ({ value, meta }) => notifyResult(await save(value, meta.status)),
  });

  // 저장해 다른 화면으로 가는 중 — 화면이 바뀌기 전에 다시 눌러 같은 글이 또 생기지 않게(isSubmitting 은 그 전에 풀린다)
  const done = useRef(false);
  const save = async (value: Values, status: Status): Promise<ActionResult<unknown>> => {
    const result = editing
      ? await updateBulletin({ ...value, status, id: editing.id, updatedAt: editing.updatedAt })
      : await createBulletin({ ...value, status });
    if (!result.ok) {
      applyServerErrors(result, serverFieldError(form));
      return result;
    }
    draft.clear();
    form.reset(value);
    done.current = true;
    const id = editing?.id ?? (result.data as { id: string } | undefined)?.id;
    navigate(id ? `${LIST}/${id}` : LIST);
    return result;
  };

  // 저장 중이면 다시 보내지 않는다(⌘S · Enter 를 빠르게 두 번 — 같은 글이 두 건 생기거나 충돌이 난다). 상태는 즉시 읽는다
  const submitAs = (status: Status) => {
    if (!form.state.isSubmitting && !done.current) void form.handleSubmit({ status });
  };

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  const draft = useFormDraft<Values>({
    userId,
    formKey: `bulletin:${editing?.id ?? 'new'}`,
    values,
    dirty,
    // 서버가 정한 날짜를 채운 뒤에 켠다 — 그 전에 켜면 채우는 값이 «고친 것» 이 되어 옛 보관을 덮어쓴다(useFormDraft 의 보류)
    enabled: !pending && values.date !== '',
  });
  useEffect(() => {
    if (arrivedDate && !form.getFieldMeta('date')?.isDirty)
      form.setFieldValue('date', arrivedDate, { dontUpdateMeta: true });
  }, [arrivedDate, form]);
  useUnsavedGuard(dirty || uploading);
  // 단추 밖의 저장(칸에서 Enter · Ctrl/⌘+S)도 단추와 같은 조건 — 올리는 중이 아니고, 공개된 글은 바뀐 것이 있을 때만.
  // 폼에 제출 단추가 없어 날짜 칸의 Enter 는 브라우저가 바로 제출한다(막아 주던 꺼진 단추가 없다)
  const canSave = !uploading && (current !== 'PUBLISHED' || dirty);
  const saveAsIs = () => {
    if (canSave && !form.state.isSubmitting && !done.current) void form.handleSubmit();
  };
  useSaveShortcut(saveAsIs);

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        saveAsIs();
      }}
    >
      <Card>
        <CardContent>
          <FieldGroup>
            {draft.available && (
              <DraftNotice
                onDiscard={draft.discard}
                onRestore={() =>
                  draft.restore(saved => {
                    if (saved.date) form.setFieldValue('date', saved.date);
                    if (saved.pages) form.setFieldValue('pages', saved.pages);
                  })
                }
              />
            )}
            <form.Field name="date">
              {field => (
                <TextField
                  field={field}
                  id="bulletin-date"
                  label="주일 날짜"
                  required
                  type="date"
                  className="max-w-48"
                />
              )}
            </form.Field>
            <form.Field name="pages">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel id="bulletin-pages-label" htmlFor="bulletin-pages">
                    쪽 <RequiredMark />
                  </FieldLabel>
                  <FileListField
                    id="bulletin-pages"
                    labelId="bulletin-pages-label"
                    menuKey="bulletin"
                    kinds={['IMAGE']}
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    onBusyChange={setUploading}
                    max={MAX_BULLETIN_PAGES}
                    disabled={submitting}
                    invalid={!field.state.meta.isValid}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <form.Subscribe selector={s => s.isSubmitting}>
        {submitting => (
          <ContentFormActions
            current={current}
            submitting={submitting || done.current}
            canSave={canSave}
            busy={uploading}
            cancelHref={editing ? `${LIST}/${editing.id}` : LIST}
            preview={
              <PreviewDialog
                payload={{ menu: 'bulletin', values }}
                disabled={uploading || values.pages.length === 0}
              />
            }
            onSubmitAs={submitAs}
            // 확인 창이 결과를 토스트로 알린다 — 폼의 제출(토스트)을 거치지 않고 바로 저장한다(서버가 다시 검사한다)
            onUnpublish={() => save(form.state.values, 'DRAFT')}
          />
        )}
      </form.Subscribe>
    </form>
  );
};
