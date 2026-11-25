'use client';

import { saveDepartment } from '@/domains/admin/api/actions/departmentActions';
import {
  applyServerErrors,
  DraftNotice,
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
import {
  departmentSaveSchema,
  MAX_DEPARTMENT_PHOTOS,
  MAX_DEPARTMENT_STAFF,
} from '@/domains/admin/lib/input/departmentInput';
import type { FileItem } from '@/domains/admin/lib/input/fileInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import type { DepartmentSlug } from '@/domains/next-generation/config/departmentSlug';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useForm, useStore } from '@tanstack/react-form';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type DepartmentStaffValues = {
  /** 화면에서 줄을 가르는 값(저장하지 않는다) */
  key: string;
  id: string | null;
  name: string;
  roleId: string;
  greeting: string;
  photo: FileItem[];
};

export type DepartmentValues = {
  ages: string;
  tagline: string;
  intro: string;
  extra: string;
  photos: FileItem[];
  staff: DepartmentStaffValues[];
};

interface Props {
  userId: string;
  slug: DepartmentSlug;
  updatedAt: string;
  initial: DepartmentValues;
  roles: { value: string; label: string }[];
  /** [취소] 로 갈 곳 — 담당 부서가 정해진 사람은 목록이 이 화면으로 되돌려 보내므로 첫 화면 */
  cancelHref: string;
}

const formSchema = departmentSaveSchema.omit({ slug: true, updatedAt: true });
const newKey = () => `new-${crypto.randomUUID()}`;

/**
 * 다음세대 부서 고치기(설계 6.13) — 소개 · 담당자 · 사진 세 구역을 한 화면에서. 글이 아니라 설정이라 저장하면 바로 공개된다.
 * 사진은 첫 장이 도입부, 나머지가 쇼케이스(순서 · 대체 텍스트 · 폭별 파일). 담당자는 0명도 된다(그 구역을 그리지 않는다).
 * 올리는 중 · 바뀐 것 없으면 저장하지 않는다. 쓰던 내용은 임시 보관한다.
 */
export const DepartmentForm = ({ userId, slug, updatedAt, initial, roles, cancelHref }: Props) => {
  // 올리기 칸이 여럿(사진 · 담당자마다) — 하나라도 올리는 중이면 저장을 막는다
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const onBusy = useCallback(
    (key: string) => (b: boolean) =>
      setBusy(prev => (prev[key] === b ? prev : { ...prev, [key]: b })),
    []
  );

  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: zodFormValidator(formSchema, { nested: ['staff'] }) },
    onSubmit: async ({ value }) => {
      const result = await saveDepartment({ ...value, slug, updatedAt });
      if (!result.ok) applyServerErrors(result, serverFieldError(form));
      else {
        draft.clear();
        form.reset(value);
        // 화면이 새 값으로 다시 그려질 때까지(수정 시각이 바뀐다) 다시 보내지 않는다
        done.current = true;
        setSaved(true);
      }
      notifyResult(result);
    },
  });
  const done = useRef(false);
  const [saved, setSaved] = useState(false);

  const values = useStore(form.store, s => s.values);
  // 지금 화면에 있는 칸만 센다 — 올리는 중에 담당자를 빼거나 임시 보관을 불러와 칸이 사라져도 저장이 막힌 채 남지 않게
  const uploading = Object.entries(busy).some(
    ([k, b]) => b && (k === 'photos' || values.staff.some(s => s.key === k))
  );

  // 담당자를 옮기거나 뺀 뒤 — 포커스를 이웃 단추로 옮기고(누른 단추가 꺼지거나 사라져 화면 맨 위로 빠지지 않게) 결과를 알린다
  const staffButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusNext = useRef<string | null>(null);
  const [note, setNote] = useState({ text: '', seq: 0 });
  const staffRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) staffButtons.current.set(key, el);
    else staffButtons.current.delete(key);
  };
  useLayoutEffect(() => {
    const key = focusNext.current;
    if (!key) return;
    focusNext.current = null;
    (key === 'add'
      ? document.getElementById('dept-staff-add')
      : staffButtons.current.get(key)
    )?.focus();
  }, [values.staff]);
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  const draft = useFormDraft<DepartmentValues>({
    userId,
    formKey: `departments:${slug}`,
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

  const roleLabel = (id: string) => roles.find(r => r.value === id)?.label ?? '';

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        saveAsIs();
      }}
    >
      {draft.available && (
        <DraftNotice
          onDiscard={draft.discard}
          onRestore={() =>
            draft.restore(saved => {
              for (const k of ['ages', 'tagline', 'intro', 'extra'] as const)
                if (typeof saved[k] === 'string') form.setFieldValue(k, saved[k]);
              if (saved.photos) form.setFieldValue('photos', saved.photos);
              if (saved.staff) form.setFieldValue('staff', saved.staff);
            })
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>소개</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 sm:grid-cols-2">
              <form.Field name="ages">
                {field => (
                  <TextField field={field} id="dept-ages" label="대상 나이" required max={50} />
                )}
              </form.Field>
              <form.Field name="tagline">
                {field => (
                  <TextField
                    field={field}
                    id="dept-tagline"
                    label="사진 위 한 줄"
                    required
                    max={100}
                  />
                )}
              </form.Field>
            </div>
            <form.Field name="intro">
              {field => (
                <TextField
                  field={field}
                  id="dept-intro"
                  label="소개 글"
                  required
                  multiline
                  max={3000}
                />
              )}
            </form.Field>
            <form.Field name="extra">
              {field => <TextField field={field} id="dept-extra" label="맨 아래 한 줄" max={300} />}
            </form.Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>담당자</CardTitle>
        </CardHeader>
        <CardContent>
          <form.Field name="staff" mode="array">
            {list => (
              <FieldGroup>
                {list.state.value.map((s, i) => (
                  <FieldSet key={s.key} className="rounded-lg border p-4">
                    {/* 칸 이름(이름 · 직분 …)이 담당자마다 같다 — 낭독기가 몇 번째 담당자의 칸인지 알게 */}
                    <FieldLegend variant="label" className="sr-only">
                      {i + 1}번째 담당자
                    </FieldLegend>
                    <div className="flex items-center justify-between gap-2">
                      <span aria-hidden className="text-sm font-medium">
                        {i + 1}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${i + 1}번째 담당자 위로`}
                          disabled={i === 0 || submitting}
                          ref={staffRef(`${s.key}:up`)}
                          onClick={() => {
                            focusNext.current = `${s.key}:${i - 1 === 0 ? 'down' : 'up'}`;
                            setNote(n => ({
                              text: `${i + 1}번째 담당자를 ${i}번째로`,
                              seq: n.seq + 1,
                            }));
                            list.moveValue(i, i - 1);
                          }}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${i + 1}번째 담당자 아래로`}
                          disabled={i === list.state.value.length - 1 || submitting}
                          ref={staffRef(`${s.key}:down`)}
                          onClick={() => {
                            const last = list.state.value.length - 1;
                            focusNext.current = `${s.key}:${i + 1 === last ? 'up' : 'down'}`;
                            setNote(n => ({
                              text: `${i + 1}번째 담당자를 ${i + 2}번째로`,
                              seq: n.seq + 1,
                            }));
                            list.moveValue(i, i + 1);
                          }}
                        >
                          <ArrowDownIcon />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${i + 1}번째 담당자 빼기`}
                          disabled={submitting}
                          ref={staffRef(`${s.key}:remove`)}
                          onClick={() => {
                            const rest = list.state.value.filter((_, k) => k !== i);
                            const next = rest[Math.min(i, rest.length - 1)];
                            focusNext.current = next ? `${next.key}:remove` : 'add';
                            setNote(n => ({
                              text: `${i + 1}번째 담당자를 뺐습니다`,
                              seq: n.seq + 1,
                            }));
                            list.removeValue(i);
                          }}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <form.Field name={`staff[${i}].name`}>
                        {field => (
                          <TextField
                            field={field}
                            id={`dept-staff-${s.key}-name`}
                            label="이름"
                            required
                            max={50}
                          />
                        )}
                      </form.Field>
                      <form.Field name={`staff[${i}].roleId`}>
                        {field => {
                          const invalid = !field.state.meta.isValid || undefined;
                          const id = `dept-staff-${s.key}-role`;
                          return (
                            <Field data-invalid={invalid}>
                              <FieldLabel htmlFor={id}>
                                직분 <RequiredMark />
                              </FieldLabel>
                              <Select
                                items={roles}
                                value={field.state.value || null}
                                onValueChange={next => field.handleChange(String(next ?? ''))}
                              >
                                <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
                                  <SelectValue placeholder="직분" />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false} align="start">
                                  <SelectGroup>
                                    {roles.map(r => (
                                      <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          );
                        }}
                      </form.Field>
                    </div>
                    <form.Field name={`staff[${i}].greeting`}>
                      {field => (
                        <TextField
                          field={field}
                          id={`dept-staff-${s.key}-greeting`}
                          label="인사말"
                          multiline
                          max={1000}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`staff[${i}].photo`}>
                      {field => (
                        <Field data-invalid={!field.state.meta.isValid || undefined}>
                          <FieldLabel
                            id={`dept-staff-${s.key}-photo-label`}
                            htmlFor={`dept-staff-${s.key}-photo`}
                          >
                            사진
                          </FieldLabel>
                          <FileListField
                            id={`dept-staff-${s.key}-photo`}
                            labelId={`dept-staff-${s.key}-photo-label`}
                            menuKey="departments"
                            kinds={['IMAGE']}
                            max={1}
                            itemLabel="번째 사진"
                            variants
                            value={field.state.value}
                            onChange={next => field.handleChange(next)}
                            onBusyChange={onBusy(s.key)}
                            disabled={submitting}
                            invalid={!field.state.meta.isValid}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                  </FieldSet>
                ))}
                <FieldError errors={list.state.meta.errors} />
                <p aria-live="polite" className="sr-only">
                  <span key={note.seq}>{note.text}</span>
                </p>
                {list.state.value.length < MAX_DEPARTMENT_STAFF && (
                  <Button
                    id="dept-staff-add"
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={submitting}
                    onClick={() =>
                      list.pushValue({
                        key: newKey(),
                        id: null,
                        name: '',
                        roleId: '',
                        greeting: '',
                        photo: [],
                      })
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    담당자 더하기
                  </Button>
                )}
              </FieldGroup>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <form.Field name="photos">
            {field => (
              <Field data-invalid={!field.state.meta.isValid || undefined}>
                <FieldLabel id="dept-photos-label" htmlFor="dept-photos">
                  사진 <RequiredMark />
                </FieldLabel>
                <FileListField
                  id="dept-photos"
                  labelId="dept-photos-label"
                  menuKey="departments"
                  kinds={['IMAGE']}
                  max={MAX_DEPARTMENT_PHOTOS}
                  itemLabel="번째 사진"
                  variants
                  withAlt
                  value={field.state.value}
                  onChange={next => field.handleChange(next)}
                  onBusyChange={onBusy('photos')}
                  disabled={submitting}
                  invalid={!field.state.meta.isValid}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <FormActions
        submitting={submitting || saved}
        canSubmit={canSave}
        cancelHref={cancelHref}
        extra={
          <PreviewDialog
            payload={{
              menu: 'departments',
              values: {
                slug,
                ages: values.ages,
                tagline: values.tagline,
                intro: values.intro,
                extra: values.extra,
                photos: values.photos,
                staff: values.staff.map(s => ({
                  name: s.name,
                  roleLabel: roleLabel(s.roleId),
                  greeting: s.greeting,
                  photo: s.photo[0] ?? null,
                })),
              },
            }}
            disabled={uploading || values.photos.length === 0}
          />
        }
      />
    </form>
  );
};
