'use client';

import { useFileUploads } from '@/domains/admin/hooks/useFileUploads';
import { type FileKind, MEDIA_BUCKET } from '@/domains/admin/lib/fileUpload';
import type { ContentMenu, FileItem } from '@/domains/admin/lib/input/fileInput';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { reorder } from '@/shared/lib/reorder';
import { storagePublicUrl } from '@/shared/lib/storageUrl';
import { cn } from '@/shared/lib/utils';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileIcon,
  PlusIcon,
  RotateCwIcon,
  XIcon,
} from 'lucide-react';
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

export type FileUploader = {
  add: (files: File[]) => File[];
  replace: (files: File[]) => File[];
};

const ACCEPT: Record<FileKind, string> = {
  IMAGE: 'image/webp,image/jpeg,image/png',
  PDF: 'application/pdf',
  HWP: '.hwp',
};

/**
 * 파일 올리기 칸(설계 6.8) — 고르기 · 끌어 놓기 → 하나씩 올림(진행 · 실패하면 다시 올리기) · 순서(앞으로 · 뒤로) · 빼기.
 * 값(value)은 저장할 때 서버가 새 묶음에 그대로 적는 파일 목록이다. 올리는 중에는 onBusyChange(true) — 폼이 저장을 막는다.
 * 순서는 화살표 단추로 바꾼다 — 휴대폰에서도 손가락으로 끌 필요가 없다. 옮기거나 빼면 포커스를 이웃 단추로 옮기고,
 * 올리기 · 옮기기 · 빼기는 한 알림 자리에서 짧게 알린다(낭독기). 저장하는 동안(disabled)은 손대지 못한다.
 */
export const FileListField = ({
  id,
  labelId,
  menuKey,
  kinds,
  value,
  onChange,
  onBusyChange,
  max,
  itemLabel = '쪽',
  unit = '장',
  onPicked,
  uploaderRef,
  invalid,
  disabled = false,
  variants = false,
  withAlt = false,
}: {
  /** 고르기 단추의 id — 칸 이름(FieldLabel htmlFor)이 이 단추를 가리킨다 */
  id: string;
  /** 칸 이름(FieldLabel)의 id — 단추의 접근성 이름을 «쪽 (필수) 파일 고르기» 로 */
  labelId: string;
  menuKey: ContentMenu;
  kinds: readonly FileKind[];
  value: readonly FileItem[];
  onChange: (next: FileItem[]) => void;
  onBusyChange?: (busy: boolean) => void;
  max?: number;
  /** 한 파일을 부르는 이름(«쪽» · «사진») — 단추의 접근성 이름에 쓴다 */
  itemLabel?: string;
  /** 개수 단위(«장») — 한도 알림 · 다 찼을 때 한 줄에 쓴다 */
  unit?: string;
  /** 사람이 고른 파일 중 받아들인 것(종류 · 개수로 거르지 않은 것) — 원본 PDF 에서 쪽 그림을 만드는 화면이 듣는다 */
  onPicked?: (files: File[]) => void;
  /** 바깥에서 파일을 넣는 손잡이 — add(끝에 붙이기) · replace(있던 것을 비우고 바꿔 올리기) */
  uploaderRef?: Ref<FileUploader>;
  invalid?: boolean;
  /** 저장하는 동안 — 고르기 · 끌어 놓기 · 순서 · 빼기를 막는다(저장 뒤 화면이 바뀌며 말없이 사라지지 않게) */
  disabled?: boolean;
  /** 그림마다 폭별 파일도 만들어 올린다(홈 히어로 · 부서 사진) */
  variants?: boolean;
  /** 그림마다 대체 텍스트 칸(공개 화면의 alt) */
  withAlt?: boolean;
}) => {
  const { pending, busy, add, replace, retry, dismiss } = useFileUploads({
    menuKey,
    kinds,
    value,
    onChange,
    max,
    unit,
    variants,
  });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const baseUrl = readSupabaseEnv()?.url ?? '';
  useImperativeHandle(uploaderRef, () => ({ add, replace }), [add, replace]);
  const pick = (files: File[]) => {
    if (disabled || files.length === 0) return;
    const accepted = add(files);
    if (accepted.length > 0) onPicked?.(accepted);
  };
  const full = max !== undefined && value.length >= max;
  // 실패한 파일을 낭독기에도 알린다 — 알림 자리는 늘 그려 두고 내용만 채운다(자리가 내용과 함께 생기면 읽지 않는다)
  const failures = pending.filter(p => p.error).map(p => `${p.name}: ${p.error}`);

  // 낭독기 알림 한 줄 — 올리는 동안 «올리는 중», 끝나면(하나라도 붙었을 때만) «올렸습니다», 옮기기 · 빼기는 그 결과
  // (진행 % 는 읽지 않는다). 알릴 때마다 번호를 올려 글 마디를 새로 만든다 — 같은 문구(«1쪽 뺐습니다» 두 번)도 다시 읽게.
  const [note, setNote] = useState({ text: '', seq: 0 });
  const announce = (text: string) => setNote(n => ({ text, seq: n.seq + 1 }));
  const [busyFrom, setBusyFrom] = useState<number | null>(busy ? value.length : null);
  if (busy && busyFrom === null) {
    setBusyFrom(value.length);
    setNote(n => ({ text: '', seq: n.seq + 1 }));
  } else if (!busy && busyFrom !== null) {
    setBusyFrom(null);
    setNote(n => ({ text: value.length > busyFrom ? '올렸습니다' : '', seq: n.seq + 1 }));
  }

  // 옮기거나 뺀 뒤 포커스 — 누른 단추가 꺼지거나 없어져 포커스가 화면 맨 위로 빠지지 않게
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const focusNext = useRef<string | null>(null);
  const buttonRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el);
    else buttons.current.delete(key);
  };
  // 그리기 직후(칠하기 전)에 — 옮겨진 칸에서 포커스가 잠깐 빠진 사이 낭독기가 엉뚱한 곳을 읽지 않게
  useLayoutEffect(() => {
    const key = focusNext.current;
    if (!key) return;
    focusNext.current = null;
    (key === 'pick' ? document.getElementById(id) : buttons.current.get(key))?.focus();
  }, [value, id]);

  const move = (i: number, j: number) => {
    const f = value[i];
    const which = j < i ? (j === 0 ? 'next' : 'prev') : j === value.length - 1 ? 'prev' : 'next';
    focusNext.current = `${f.path}:${which}`;
    announce(`${i + 1}${itemLabel} → ${j + 1}${itemLabel}`);
    onChange(reorder(value, i, j));
  };
  const remove = (i: number) => {
    const next = value.filter((_, k) => k !== i);
    focusNext.current =
      next.length === 0 ? 'pick' : `${next[Math.min(i, next.length - 1)].path}:remove`;
    announce(`${i + 1}${itemLabel} 뺐습니다`);
    onChange(next);
  };

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((f, i) => {
            const name = `${i + 1}${itemLabel}`;
            return (
              <li key={f.path} className="bg-muted rounded-lg border">
                {/* 잘라 내기(둥근 모서리)는 그림 쪽에만 — 아래 대체 텍스트 칸의 포커스 링이 잘리지 않게 */}
                <div
                  className={cn(
                    'relative overflow-hidden',
                    withAlt && f.kind === 'IMAGE' ? 'rounded-t-lg' : 'rounded-lg'
                  )}
                >
                  {f.kind === 'IMAGE' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage 에 올린 그대로를 보인다(next/image 변환기를 쓰지 않는다, ADR 0013)
                    <img
                      src={storagePublicUrl(baseUrl, MEDIA_BUCKET, f.path)}
                      alt={name}
                      width={f.width ?? undefined}
                      height={f.height ?? undefined}
                      className="aspect-[4/3] w-full object-contain"
                    />
                  ) : (
                    <div className="text-muted-foreground flex aspect-[4/3] flex-col items-center justify-center gap-1 p-2 text-xs">
                      <FileIcon aria-hidden />
                      <span className="line-clamp-2 text-center break-all">{f.originalName}</span>
                    </div>
                  )}
                  <Badge aria-hidden variant="secondary" className="absolute top-1 left-1">
                    {i + 1}
                  </Badge>
                  {value.length > 1 && (
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <Button
                        ref={buttonRef(`${f.path}:prev`)}
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        disabled={disabled || i === 0}
                        aria-label={`${name} 앞으로`}
                        onClick={() => move(i, i - 1)}
                      >
                        <ArrowLeftIcon />
                      </Button>
                      <Button
                        ref={buttonRef(`${f.path}:next`)}
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        disabled={disabled || i === value.length - 1}
                        aria-label={`${name} 뒤로`}
                        onClick={() => move(i, i + 1)}
                      >
                        <ArrowRightIcon />
                      </Button>
                    </div>
                  )}
                  <Button
                    ref={buttonRef(`${f.path}:remove`)}
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute top-1 right-1"
                    disabled={disabled}
                    aria-label={`${name} 빼기`}
                    onClick={() => remove(i)}
                  >
                    <XIcon />
                  </Button>
                </div>
                {withAlt && f.kind === 'IMAGE' && (
                  <div className="p-1">
                    <Input
                      value={f.alt ?? ''}
                      maxLength={300}
                      placeholder="대체 텍스트"
                      aria-label={`${name} 대체 텍스트`}
                      disabled={disabled}
                      onChange={e =>
                        onChange(value.map((v, k) => (k === i ? { ...v, alt: e.target.value } : v)))
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p aria-live="polite" className="sr-only">
        <span key={busy ? 'busy' : note.seq}>{busy ? '올리는 중' : note.text}</span>
      </p>
      <p aria-live="polite" className="sr-only">
        {failures.join(' · ')}
      </p>

      {pending.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {pending.map(p => (
            <li key={p.key} className="flex items-center gap-2">
              {p.error ? null : <Spinner aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.error ? (
                <>
                  <span className="text-destructive text-xs">{p.error}</span>
                  {p.retryable && (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => retry(p.key)}
                    >
                      <RotateCwIcon data-icon="inline-start" />
                      다시 올리기
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`${p.name} 빼기`}
                    onClick={() => dismiss(p.key)}
                  >
                    <XIcon />
                  </Button>
                </>
              ) : (
                <span aria-hidden className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(p.progress * 100)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 다 차면 올리기 칸 대신 한도를 한 줄로 — 칸이 말없이 사라지지 않게 */}
      {full && (
        <p className="text-muted-foreground m-0 text-sm">
          {max}
          {unit}까지
        </p>
      )}
      {!full && (
        <div
          className={cn(
            'flex items-center justify-center rounded-lg border border-dashed p-4',
            dragging && 'border-primary bg-muted',
            invalid && 'border-destructive'
          )}
          onDragOver={e => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={e => {
            // 안쪽 단추 위로 지나갈 때는 떠난 것이 아니다(강조가 깜빡이지 않게)
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            pick(Array.from(e.dataTransfer.files));
          }}
        >
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-labelledby={`${labelId} ${id}`}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <PlusIcon data-icon="inline-start" />
            파일 고르기
          </Button>
          {/* 실제 고르기 창을 여는 칸 — 화면 · 낭독기에는 위 단추만 보인다 */}
          <input
            ref={input}
            type="file"
            multiple
            accept={kinds.map(k => ACCEPT[k]).join(',')}
            aria-hidden
            className="sr-only"
            tabIndex={-1}
            onChange={e => {
              pick(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
};
