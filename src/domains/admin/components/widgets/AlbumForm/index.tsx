'use client';

import { createAlbum, updateAlbum } from '@/domains/admin/api/actions/albumActions';
import {
  applyServerErrors,
  DraftNotice,
  RequiredMark,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { CategoryField } from '@/domains/admin/components/features/CategoryField';
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
import { albumFormSchema, MAX_ALBUM_IMAGES } from '@/domains/admin/lib/input/albumInput';
import type { FileItem } from '@/domains/admin/lib/input/fileInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';

type Status = 'DRAFT' | 'PUBLISHED';
type Values = { title: string; categoryId: string; images: FileItem[] };

interface Props {
  userId: string;
  initial: Values;
  categories: { value: string; label: string }[];
  /** 분류 관리의 등록 권한 — 있으면 분류 칸 옆에서 새 분류를 더한다 */
  canAddCategory: boolean;
  editing?: { id: string; updatedAt: string; status: Status };
}

const LIST = '/admin/album';

/**
 * 교회앨범 등록 · 수정(설계 6.10 — 한 장 폼). 제목 · 분류 · 그림(올리기 · 순서 · 빼기 — 주보와 같은 통로).
 * 저장 규칙은 주보와 같다 — 공개는 단추로만, Enter(제출 단추가 없고 한 줄 칸이 하나면 브라우저가 제출) · Ctrl/⌘+S 는 지금 상태 그대로,
 * 올리는 중 · 바뀐 것 없는 공개 글은 저장하지 않는다. 쓰던 내용은 임시 보관한다.
 */
export const AlbumForm = ({ userId, initial, categories, canAddCategory, editing }: Props) => {
  const navigate = useAdminNavigate();
  const [uploading, setUploading] = useState(false);
  const current: Status = editing?.status ?? 'DRAFT';

  const form = useForm({
    defaultValues: initial,
    onSubmitMeta: { status: current } as { status: Status },
    validators: { onSubmit: zodFormValidator(albumFormSchema) },
    onSubmit: async ({ value, meta }) => notifyResult(await save(value, meta.status)),
  });

  const save = async (value: Values, status: Status): Promise<ActionResult<unknown>> => {
    const result = editing
      ? await updateAlbum({ ...value, status, id: editing.id, updatedAt: editing.updatedAt })
      : await createAlbum({ ...value, status });
    if (!result.ok) {
      applyServerErrors(result, serverFieldError(form));
      return result;
    }
    draft.clear();
    form.reset(value);
    const id = editing?.id ?? (result.data as { id: string } | undefined)?.id;
    navigate(id ? `${LIST}/${id}` : LIST);
    return result;
  };

  const submitAs = (status: Status) => void form.handleSubmit({ status });

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const draft = useFormDraft<Values>({
    userId,
    formKey: `album:${editing?.id ?? 'new'}`,
    values,
    dirty,
    enabled: true,
  });
  useUnsavedGuard(dirty || uploading);
  const canSave = !uploading && (current !== 'PUBLISHED' || dirty);
  const saveAsIs = () => {
    if (canSave) void form.handleSubmit();
  };
  useSaveShortcut(saveAsIs);

  const categoryLabel = categories.find(c => c.value === values.categoryId)?.label ?? '';

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
                    if (typeof saved.title === 'string') form.setFieldValue('title', saved.title);
                    if (typeof saved.categoryId === 'string')
                      form.setFieldValue('categoryId', saved.categoryId);
                    if (saved.images) form.setFieldValue('images', saved.images);
                  })
                }
              />
            )}
            <form.Field name="title">
              {field => (
                <TextField field={field} id="album-title" label="제목" required max={200} />
              )}
            </form.Field>
            <form.Field name="categoryId">
              {field => (
                <CategoryField
                  id="album-category"
                  groupKey="ALBUM_CATEGORY"
                  options={categories}
                  value={field.state.value}
                  onChange={next => field.handleChange(next)}
                  canAdd={canAddCategory}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field name="images">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel id="album-images-label" htmlFor="album-images">
                    그림 <RequiredMark />
                  </FieldLabel>
                  <FileListField
                    id="album-images"
                    labelId="album-images-label"
                    menuKey="album"
                    kinds={['IMAGE']}
                    itemLabel="번째 그림"
                    max={MAX_ALBUM_IMAGES}
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    onBusyChange={setUploading}
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
            submitting={submitting}
            canSave={canSave}
            busy={uploading}
            cancelHref={editing ? `${LIST}/${editing.id}` : LIST}
            preview={
              <PreviewDialog
                payload={{
                  menu: 'album',
                  values: { title: values.title, categoryLabel, images: values.images },
                }}
                disabled={uploading || values.images.length === 0}
              />
            }
            onSubmitAs={submitAs}
            onUnpublish={() => save(form.state.values, 'DRAFT')}
          />
        )}
      </form.Subscribe>
    </form>
  );
};
