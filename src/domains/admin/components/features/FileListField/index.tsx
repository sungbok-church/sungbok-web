'use client';

import { useFileUploads } from '@/domains/admin/hooks/useFileUploads';
import { type FileKind, MEDIA_BUCKET } from '@/domains/admin/lib/fileUpload';
import type { ContentMenu, FileItem } from '@/domains/admin/lib/input/fileInput';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { Button } from '@/shared/components/ui/button';
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
import { useEffect, useRef, useState } from 'react';

const ACCEPT: Record<FileKind, string> = {
  IMAGE: 'image/webp,image/jpeg,image/png',
  PDF: 'application/pdf',
  HWP: '.hwp',
};

/**
 * 파일 올리기 칸(설계 6.8) — 고르기 · 끌어 놓기 → 하나씩 올림(진행 · 실패하면 다시 올리기) · 순서(앞으로 · 뒤로) · 빼기.
 * 값(value)은 저장할 때 서버가 새 묶음에 그대로 적는 파일 목록이다. 올리는 중에는 onBusyChange(true) — 폼이 저장을 막는다.
 * 순서는 화살표 단추로 바꾼다 — 휴대폰에서도 손가락으로 끌 필요가 없다.
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
  invalid,
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
  invalid?: boolean;
}) => {
  const { pending, busy, add, retry, dismiss } = useFileUploads({
    menuKey,
    kinds,
    value,
    onChange,
    max,
  });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const baseUrl = readSupabaseEnv()?.url ?? '';
  const full = max !== undefined && value.length >= max;
  // 실패한 파일을 낭독기에도 알린다 — 알림 자리는 늘 그려 두고 내용만 채운다(자리가 내용과 함께 생기면 읽지 않는다)
  const failures = pending.filter(p => p.error).map(p => `${p.name}: ${p.error}`);

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((f, i) => {
            const name = `${i + 1}${itemLabel}`;
            return (
              <li key={f.path} className="bg-muted relative overflow-hidden rounded-lg border">
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
                <span className="bg-background/90 absolute top-1 left-1 rounded px-1.5 text-xs tabular-nums">
                  {i + 1}
                </span>
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    disabled={i === 0}
                    aria-label={`${name} 앞으로`}
                    onClick={() => onChange(reorder(value, i, i - 1))}
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    disabled={i === value.length - 1}
                    aria-label={`${name} 뒤로`}
                    onClick={() => onChange(reorder(value, i, i + 1))}
                  >
                    <ArrowRightIcon />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-1 right-1"
                  aria-label={`${name} 빼기`}
                  onClick={() => onChange(value.filter(v => v.path !== f.path))}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      <p aria-live="polite" className="sr-only">
        {failures.join(' · ')}
      </p>

      {pending.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {pending.map(p => (
            <li key={p.key} className="flex items-center gap-2">
              {p.error ? null : <Spinner />}
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.error ? (
                <>
                  <span className="text-destructive text-xs">{p.error}</span>
                  {p.retryable && (
                    <Button type="button" size="xs" variant="outline" onClick={() => retry(p.key)}>
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
                <span className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(p.progress * 100)}%
                </span>
              )}
            </li>
          ))}
        </ul>
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
            setDragging(true);
          }}
          onDragLeave={e => {
            // 안쪽 단추 위로 지나갈 때는 떠난 것이 아니다(강조가 깜빡이지 않게)
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            add(Array.from(e.dataTransfer.files));
          }}
        >
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-labelledby={`${labelId} ${id}`}
            aria-invalid={invalid || undefined}
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
              add(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
};
