'use client';

import { createNewsVideo, updateNewsVideo } from '@/domains/admin/api/actions/newsVideoActions';
import {
  applyServerErrors,
  DraftNotice,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { CategoryField } from '@/domains/admin/components/features/CategoryField';
import { ContentFormActions } from '@/domains/admin/components/features/ContentFormActions';
import { PreviewDialog } from '@/domains/admin/components/features/PreviewDialog';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import type { ActionResult } from '@/domains/admin/lib/actionResult';
import { newsVideoFormSchema } from '@/domains/admin/lib/input/newsVideoInput';
import { NEWS_FEEDS, type NewsFeedKey, youtubeImages } from '@/domains/admin/lib/newsFeed';
import { notifyResult } from '@/domains/admin/lib/notify';
import { parseYoutubeVideoId } from '@/domains/resources/api/resourceInput';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FieldGroup } from '@/shared/components/ui/field';
import { useForm, useStore } from '@tanstack/react-form';
import { useRef } from 'react';

type Status = 'DRAFT' | 'PUBLISHED';
type Values = {
  title: string;
  categoryId: string;
  date: string;
  /** 유튜브 주소 또는 영상 id */
  video: string;
  description: string;
};

interface Props {
  feed: NewsFeedKey;
  userId: string;
  initial: Values;
  /** 그 메뉴의 분류 선택지 */
  categories: { value: string; label: string }[];
  /** 분류 관리의 등록 권한 — 있으면 분류 칸 옆에서 새 분류를 더한다 */
  canAddCategory: boolean;
  editing?: { id: string; updatedAt: string; status: Status };
}

/**
 * 주일광고 · 성복의 뜰 등록 · 수정(설계 6.10 — 한 장 폼). 제목 · 분류 · 날짜 · 유튜브 영상(주소를 붙여 넣으면 id 로) · 설명.
 * 영상을 넣으면 썸네일이 바로 보인다(맞는 영상인지 확인). 공개하려면 영상이 있어야 한다(서버가 그 칸의 오류로 알린다).
 * 공개는 단추로만(ContentFormActions), Ctrl/⌘+S 는 지금 상태 그대로 저장한다. 한 줄 칸이 여럿이라 칸에서 Enter 로는 제출되지 않는다
 * (HTML — 제출 단추가 없고 한 줄 칸이 둘 이상이면 브라우저가 제출하지 않는다). 쓰던 내용은 임시 보관한다.
 */
export const NewsVideoForm = ({
  feed,
  userId,
  initial,
  categories,
  canAddCategory,
  editing,
}: Props) => {
  const navigate = useAdminNavigate();
  const list = NEWS_FEEDS[feed].adminPath;
  const current: Status = editing?.status ?? 'DRAFT';

  const form = useForm({
    defaultValues: initial,
    onSubmitMeta: { status: current } as { status: Status },
    validators: { onSubmit: zodFormValidator(newsVideoFormSchema) },
    onSubmit: async ({ value, meta }) => notifyResult(await save(value, meta.status)),
  });

  // 저장해 다른 화면으로 가는 중 — 화면이 바뀌기 전에 다시 눌러 같은 글이 또 생기지 않게(isSubmitting 은 그 전에 풀린다)
  const done = useRef(false);
  const save = async (value: Values, status: Status): Promise<ActionResult<unknown>> => {
    const result = editing
      ? await updateNewsVideo({
          ...value,
          feed,
          status,
          id: editing.id,
          updatedAt: editing.updatedAt,
        })
      : await createNewsVideo({ ...value, feed, status });
    if (!result.ok) {
      applyServerErrors(result, serverFieldError(form));
      return result;
    }
    draft.clear();
    form.reset(value);
    done.current = true;
    const id = editing?.id ?? (result.data as { id: string } | undefined)?.id;
    navigate(id ? `${list}/${id}` : list);
    return result;
  };

  // 저장 중이면 다시 보내지 않는다(⌘S · Enter 를 빠르게 두 번 — 같은 글이 두 건 생기거나 충돌이 난다). 상태는 즉시 읽는다
  const submitAs = (status: Status) => {
    if (!form.state.isSubmitting && !done.current) void form.handleSubmit({ status });
  };

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const draft = useFormDraft<Values>({
    userId,
    formKey: `${feed}:${editing?.id ?? 'new'}`,
    values,
    dirty,
    enabled: true,
  });
  useUnsavedGuard(dirty);
  // 단추 밖의 저장(Enter · Ctrl/⌘+S)도 단추와 같은 조건 — 공개된 글은 바뀐 것이 있을 때만
  const canSave = current !== 'PUBLISHED' || dirty;
  const saveAsIs = () => {
    if (canSave && !form.state.isSubmitting && !done.current) void form.handleSubmit();
  };
  useSaveShortcut(saveAsIs);

  const videoId = parseYoutubeVideoId(values.video) ?? null;
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
                  draft.restore(saved =>
                    (Object.keys(initial) as (keyof Values)[]).forEach(k => {
                      if (typeof saved[k] === 'string') form.setFieldValue(k, saved[k]);
                    })
                  )
                }
              />
            )}
            <form.Field name="title">
              {field => <TextField field={field} id="news-title" label="제목" required max={200} />}
            </form.Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <form.Field name="categoryId">
                {field => (
                  <CategoryField
                    id="news-category"
                    groupKey={NEWS_FEEDS[feed].categoryGroup}
                    options={categories}
                    value={field.state.value}
                    onChange={next => field.handleChange(next)}
                    canAdd={canAddCategory}
                    errors={field.state.meta.errors}
                  />
                )}
              </form.Field>
              <form.Field name="date">
                {field => (
                  <TextField
                    field={field}
                    id="news-date"
                    label="날짜"
                    required
                    type="date"
                    className="max-w-48"
                  />
                )}
              </form.Field>
            </div>
            <form.Field name="video">
              {field => (
                <TextField
                  field={field}
                  id="news-video"
                  label="유튜브 영상"
                  inputMode="url"
                  placeholder="https://youtu.be/…"
                  maxLength={500}
                />
              )}
            </form.Field>
            {videoId && (
              // eslint-disable-next-line @next/next/no-img-element -- 유튜브가 주는 썸네일 그대로(next/image 변환기를 쓰지 않는다, ADR 0013)
              <img
                src={youtubeImages(videoId, false).thumbnail}
                alt=""
                width={480}
                height={360}
                className="bg-muted aspect-video w-full max-w-xs rounded-md border object-cover"
              />
            )}
            <form.Field name="description">
              {field => (
                <TextField field={field} id="news-description" label="설명" max={5000} multiline />
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
            busy={false}
            cancelHref={editing ? `${list}/${editing.id}` : list}
            preview={
              <PreviewDialog
                payload={{
                  menu: feed,
                  values: {
                    title: values.title,
                    categoryLabel,
                    date: values.date,
                    videoId,
                    description: values.description,
                  },
                }}
                disabled={!videoId}
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
