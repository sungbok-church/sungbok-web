'use client';

import { saveHomeHero } from '@/domains/admin/api/actions/homeHeroActions';
import {
  applyServerErrors,
  FormActions,
  RequiredMark,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { FileListField } from '@/domains/admin/components/features/FileListField';
import { PreviewDialog } from '@/domains/admin/components/features/PreviewDialog';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import type { FileItem } from '@/domains/admin/lib/input/fileInput';
import { homeHeroSaveSchema } from '@/domains/admin/lib/input/homeHeroInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { useForm, useStore } from '@tanstack/react-form';
import { useRef, useState } from 'react';

type Kind = 'PHOTO' | 'YOUTUBE';
type Values = { kind: Kind; photo: FileItem[]; video: string };

const formSchema = homeHeroSaveSchema;

/**
 * 홈 히어로 설정(설계 6.12) — 종류(사진 · 유튜브) · 대표 사진(어느 종류에서나 꼭 — 대체 텍스트 · 폭별 파일) · 유튜브 주소.
 * 설정이라 저장하면 바로 공개된다. 미리보기는 홈 히어로 그대로(스크롤하면 사진 띠로 내려앉는 것까지).
 */
export const HomeHeroForm = ({
  userId,
  updatedAt,
  initial,
}: {
  userId: string;
  updatedAt: string;
  initial: Values;
}) => {
  const [uploading, setUploading] = useState(false);
  const done = useRef(false);
  const [saved, setSaved] = useState(false);
  const form = useForm({
    defaultValues: initial,
    validators: {
      onSubmit: ({ value }) => zodFormValidator(formSchema)({ value: { ...value, updatedAt } }),
    },
    onSubmit: async ({ value }) => {
      const result = await saveHomeHero({ ...value, updatedAt });
      if (!result.ok) applyServerErrors(result, serverFieldError(form));
      else {
        draft.clear();
        form.reset(value);
        // 화면이 새 수정 시각으로 다시 그려질 때까지 다시 보내지 않는다
        done.current = true;
        setSaved(true);
      }
      notifyResult(result);
    },
  });
  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  const draft = useFormDraft<Values>({
    userId,
    formKey: 'home-hero',
    values,
    dirty,
    enabled: true,
  });
  useUnsavedGuard(dirty || uploading);
  const canSave = !uploading && dirty;
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
            <form.Field name="kind">
              {field => (
                <FieldSet>
                  <FieldLegend variant="label">종류</FieldLegend>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={next => field.handleChange(next as Kind)}
                    className="flex flex-wrap gap-6"
                  >
                    <Field orientation="horizontal">
                      <RadioGroupItem value="PHOTO" id="hero-kind-photo" />
                      <FieldLabel htmlFor="hero-kind-photo" className="font-normal">
                        사진
                      </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <RadioGroupItem value="YOUTUBE" id="hero-kind-youtube" />
                      <FieldLabel htmlFor="hero-kind-youtube" className="font-normal">
                        유튜브 영상
                      </FieldLabel>
                    </Field>
                  </RadioGroup>
                </FieldSet>
              )}
            </form.Field>
            <form.Field name="photo">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel id="hero-photo-label" htmlFor="hero-photo">
                    대표 사진 <RequiredMark />
                  </FieldLabel>
                  <FileListField
                    id="hero-photo"
                    labelId="hero-photo-label"
                    menuKey="home-hero"
                    kinds={['IMAGE']}
                    max={1}
                    itemLabel="번째 사진"
                    variants
                    withAlt
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    onBusyChange={setUploading}
                    disabled={submitting}
                    invalid={!field.state.meta.isValid}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            {values.kind === 'YOUTUBE' && (
              <form.Field name="video">
                {field => (
                  <TextField field={field} id="hero-video" label="유튜브 주소" required max={200} />
                )}
              </form.Field>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <FormActions
        submitting={submitting || saved}
        canSubmit={canSave}
        cancelHref="/admin"
        extra={
          <PreviewDialog
            payload={{
              menu: 'home-hero',
              values: { kind: values.kind, photo: values.photo[0] ?? null, video: values.video },
            }}
            disabled={uploading || values.photo.length === 0}
          />
        }
      />
    </form>
  );
};
