'use client';

import { createResource, updateResource } from '@/domains/admin/api/actions/resourceActions';
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
import {
  FileListField,
  type FileUploader,
} from '@/domains/admin/components/features/FileListField';
import { renderPdfPages } from '@/domains/admin/components/features/PdfPages/renderPdfPages';
import { PreviewDialog } from '@/domains/admin/components/features/PreviewDialog';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import type { ActionResult } from '@/domains/admin/lib/actionResult';
import type { FileItem } from '@/domains/admin/lib/input/fileInput';
import { MAX_RESOURCE_PAGES, resourceFormSchema } from '@/domains/admin/lib/input/resourceInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import {
  RESOURCE_SECTION_KEYS,
  type ResourceSectionKey,
  SECTION_CONFIG,
} from '@/domains/admin/lib/resourceSection';
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { Card, CardContent } from '@/shared/components/ui/card';
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
import { useEffect, useRef, useState } from 'react';

type Status = 'DRAFT' | 'PUBLISHED';
type Option = { value: string; label: string };
type Values = {
  section: ResourceSectionKey;
  seriesId: string;
  episode: string;
  title: string;
  date: string;
  year: string;
  passage: string;
  file: FileItem[];
  pages: FileItem[];
  /** 설교 영상 — 유튜브 주소나 id, 줄로 나눈다 */
  videos: string;
};

interface Props {
  userId: string;
  initial: Values;
  /** 분류마다 묶음 선택지 */
  seriesBySection: Record<ResourceSectionKey, Option[]>;
  canAddSeries: boolean;
  editing?: { id: string; updatedAt: string; status: Status };
  /**
   * 사용자 · 묶음 목록을 아직 받지 못했다 — 폼은 미리 만든 틀에 들어가 누르는 즉시 보이고 바로 쓸 수 있다(ADR 0027).
   * 묶음 칸만 비어 있다가 채워지고, 임시 저장은 받은 뒤부터(사용자마다 칸이 다르다)
   */
  pending?: boolean;
}

const LIST = '/admin/resources';
const SECTION_ITEMS = RESOURCE_SECTION_KEYS.map(k => ({
  value: k,
  label: SECTION_CONFIG[k].label,
}));

/**
 * 설교 시트지 등록 · 수정(설계 6.10 — 한 장 폼). 분류 · 묶음(그 자리에서 새 묶음) · 회차 · 제목 · 날짜(모르면 연도) · 본문 ·
 * 원본(PDF · 한글 파일 하나) · 쪽 그림 · 설교 영상. 원본에 PDF 를 고르면 브라우저가 쪽마다 그림을 만들어 쪽 그림 칸에 올린다
 * (있던 쪽 그림은 바꾼다 — 원본이 바뀌었으니). 저장 규칙은 주보와 같다(공개는 단추로만, 올리는 · 만드는 중에는 저장을 막는다).
 */
export const ResourceForm = ({
  userId,
  initial,
  seriesBySection,
  canAddSeries,
  editing,
  pending = false,
}: Props) => {
  const navigate = useAdminNavigate();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingPages, setUploadingPages] = useState(false);
  // PDF 쪽 그림 만들기 — 만든 쪽 수 / 전체
  const [rendering, setRendering] = useState<{ done: number; total: number } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pagesUploader = useRef<FileUploader>(null);
  // 쪽 그림 만들기의 차례 — 다른 PDF 를 고르면 늘린다. 늦게 끝난 옛 작업의 결과 · 진행 표시는 버린다
  const renderGen = useRef(0);
  const busy = uploadingFile || uploadingPages || rendering !== null;
  const current: Status = editing?.status ?? 'DRAFT';

  const form = useForm({
    defaultValues: initial,
    onSubmitMeta: { status: current } as { status: Status },
    validators: { onSubmit: zodFormValidator(resourceFormSchema) },
    onSubmit: async ({ value, meta }) => notifyResult(await save(value, meta.status)),
  });

  // 저장해 다른 화면으로 가는 중 — 화면이 바뀌기 전에 다시 눌러 같은 글이 또 생기지 않게(isSubmitting 은 그 전에 풀린다)
  const done = useRef(false);
  const save = async (value: Values, status: Status): Promise<ActionResult<unknown>> => {
    const result = editing
      ? await updateResource({ ...value, status, id: editing.id, updatedAt: editing.updatedAt })
      : await createResource({ ...value, status });
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

  /** 만들던 쪽 그림을 버린다 — 원본을 빼거나 다른 파일로 바꾸면 옛 PDF 의 쪽 그림이 나중에 끼어들지 않게 */
  const stopPages = () => {
    ++renderGen.current;
    setRendering(null);
    setRenderError(null);
  };

  /** 원본에 PDF 를 고르면 쪽 그림을 만들어 쪽 그림 칸에 바꿔 올린다(원본이 바뀌었으니 있던 쪽 그림은 비운다) */
  const makePages = async (picked: File[]) => {
    stopPages();
    const pdf = picked.find(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!pdf) return;
    const g = renderGen.current;
    setRenderError(null);
    setRendering({ done: 0, total: 0 });
    try {
      const pages = await renderPdfPages(pdf, {
        maxPages: MAX_RESOURCE_PAGES,
        onProgress: (done, total) => {
          if (g === renderGen.current) setRendering({ done, total });
        },
      });
      if (g === renderGen.current) pagesUploader.current?.replace(pages);
    } catch {
      if (g === renderGen.current)
        setRenderError('PDF 의 쪽 그림을 만들지 못했습니다. 쪽 그림을 따로 올려 주세요.');
    } finally {
      if (g === renderGen.current) setRendering(null);
    }
  };

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  const onlySeries =
    !editing && seriesBySection.SUNDAY.length === 1 ? seriesBySection.SUNDAY[0].value : '';
  const draft = useFormDraft<Values>({
    userId,
    formKey: `resources:${editing?.id ?? 'new'}`,
    values,
    dirty,
    // 하나뿐인 묶음을 채운 뒤에 켠다 — 그 전에 켜면 채우는 값이 «고친 것» 이 되어 옛 보관을 덮어쓴다(useFormDraft 의 보류)
    enabled: !pending && (!onlySeries || values.section !== 'SUNDAY' || values.seriesId !== ''),
  });
  useUnsavedGuard(dirty || busy);
  const canSave = !busy && (current !== 'PUBLISHED' || dirty);
  const saveAsIs = () => {
    if (canSave && !form.state.isSubmitting && !done.current) void form.handleSubmit();
  };
  useSaveShortcut(saveAsIs);

  // 새 글: 묶음 목록이 도착했을 때 묶음이 하나뿐이면 골라 둔다 — 사람이 고친 것으로 치지 않는다(나갈 때 경고가 뜨지 않게)
  useEffect(() => {
    if (onlySeries && form.state.values.section === 'SUNDAY' && !form.state.values.seriesId)
      form.setFieldValue('seriesId', onlySeries, { dontUpdateMeta: true });
  }, [onlySeries, form]);

  const seriesOptions = seriesBySection[values.section] ?? [];
  const seriesLabel = seriesOptions.find(o => o.value === values.seriesId)?.label ?? '';
  const videoIds = [
    ...new Set(
      values.videos
        .split(/\s+/)
        .map(v => parseYoutubeVideoId(v))
        .filter((v): v is string => Boolean(v))
    ),
  ];

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
                  draft.restore(saved =>
                    (Object.keys(initial) as (keyof Values)[]).forEach(k => {
                      if (saved[k] !== undefined) form.setFieldValue(k, saved[k] as never);
                    })
                  )
                }
              />
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <form.Field name="section">
                {field => (
                  <Field>
                    <FieldLabel htmlFor="resource-section">
                      분류 <RequiredMark />
                    </FieldLabel>
                    <Select
                      items={SECTION_ITEMS}
                      value={field.state.value}
                      onValueChange={next => {
                        field.handleChange(String(next) as ResourceSectionKey);
                        // 분류가 바뀌면 묶음 목록이 다르다
                        form.setFieldValue('seriesId', '');
                      }}
                    >
                      <SelectTrigger id="resource-section" className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start">
                        <SelectGroup>
                          {SECTION_ITEMS.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
              <form.Field name="seriesId">
                {field => (
                  <CategoryField
                    id="resource-series"
                    fieldLabel="묶음"
                    groupKey={SECTION_CONFIG[values.section].group}
                    options={seriesOptions}
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    canAdd={canAddSeries}
                    errors={field.state.meta.errors}
                  />
                )}
              </form.Field>
            </div>
            <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
              <form.Field name="episode">
                {field => (
                  <TextField
                    field={field}
                    id="resource-episode"
                    label="회차"
                    inputMode="numeric"
                    maxLength={4}
                  />
                )}
              </form.Field>
              <form.Field name="title">
                {field => (
                  <TextField field={field} id="resource-title" label="제목" required max={200} />
                )}
              </form.Field>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <form.Field name="date">
                {field => <TextField field={field} id="resource-date" label="날짜" type="date" />}
              </form.Field>
              <form.Field name="year">
                {field => (
                  <TextField
                    field={field}
                    id="resource-year"
                    label="연도"
                    inputMode="numeric"
                    maxLength={4}
                    disabled={Boolean(values.date)}
                  />
                )}
              </form.Field>
              <form.Field name="passage">
                {field => <TextField field={field} id="resource-passage" label="본문" max={100} />}
              </form.Field>
            </div>
            <form.Field name="file">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel id="resource-file-label" htmlFor="resource-file">
                    원본
                  </FieldLabel>
                  <FileListField
                    id="resource-file"
                    labelId="resource-file-label"
                    menuKey="resources"
                    kinds={['PDF', 'HWP']}
                    max={1}
                    unit="개"
                    itemLabel="번째 원본"
                    value={field.state.value}
                    onChange={next => {
                      if (next.length === 0) stopPages();
                      field.handleChange(next);
                    }}
                    onBusyChange={setUploadingFile}
                    disabled={submitting}
                    onPicked={files => void makePages(files)}
                    invalid={!field.state.meta.isValid}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="pages">
              {field => (
                <Field data-invalid={!field.state.meta.isValid || undefined}>
                  <FieldLabel id="resource-pages-label" htmlFor="resource-pages">
                    쪽 그림
                  </FieldLabel>
                  {/* 낭독기 알림 자리는 늘 그려 두고(숨김 · 빈 채로라도) 시작만 알린다 — 쪽마다 바뀌는 수는 읽지 않는다 */}
                  <p aria-live="polite" className="sr-only">
                    {rendering ? '쪽 그림 만드는 중' : ''}
                  </p>
                  {rendering && (
                    <p
                      aria-hidden
                      className="text-muted-foreground m-0 flex items-center gap-2 text-sm"
                    >
                      <Spinner />쪽 그림 만드는 중
                      {rendering.total > 0 && ` ${rendering.done} / ${rendering.total}`}
                    </p>
                  )}
                  {renderError && <FieldError>{renderError}</FieldError>}
                  <FileListField
                    id="resource-pages"
                    labelId="resource-pages-label"
                    menuKey="resources"
                    kinds={['IMAGE']}
                    max={MAX_RESOURCE_PAGES}
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    onBusyChange={setUploadingPages}
                    disabled={submitting}
                    uploaderRef={pagesUploader}
                    invalid={!field.state.meta.isValid}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="videos">
              {field => (
                <TextField
                  field={field}
                  id="resource-videos"
                  label="설교 영상"
                  multiline
                  placeholder="유튜브 주소(한 줄에 하나)"
                />
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
            busy={busy}
            cancelHref={editing ? `${LIST}/${editing.id}` : LIST}
            preview={
              <PreviewDialog
                payload={{
                  menu: 'resources',
                  values: {
                    section: values.section,
                    seriesLabel,
                    episode: values.episode,
                    title: values.title,
                    date: values.date,
                    year: values.year,
                    passage: values.passage,
                    file: values.file,
                    pages: values.pages,
                    videoIds,
                  },
                }}
                disabled={busy}
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
