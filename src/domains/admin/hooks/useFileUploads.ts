'use client';

import { createUploadList, signUpload } from '@/domains/admin/api/actions/uploadActions';
import { prepareImage } from '@/domains/admin/components/features/FileListField/prepareImage';
import { putFile } from '@/domains/admin/components/features/FileListField/putFile';
import { type FileKind, uploadTypeOf } from '@/domains/admin/lib/fileUpload';
import type { ContentMenu, FileItem } from '@/domains/admin/lib/input/fileInput';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { toast } from '@/shared/components/ui/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

// 파일 올리기 통로의 화면 쪽(설계 6.8) — 고른 파일을 하나씩 차례로: 종류 확인 → (그림) 줄이기 → 올리는 자리(묶음, 처음 한 번)
// → 한 번 쓰는 주소 → Storage 로 직접 보내기(진행 표시) → 목록 끝에 붙이기. 실패한 파일은 줄에 까닭과 함께 남아
// [다시 올리기] · [빼기] 를 할 수 있다. 목록(value)은 저장할 때 서버가 새 묶음에 그대로 적는다(writeFileList).

export type UploadDeps = {
  createUploadList: typeof createUploadList;
  signUpload: typeof signUpload;
  prepareImage: typeof prepareImage;
  putFile: (
    req: Parameters<typeof putFile>[0],
    onProgress: (fraction: number) => void
  ) => Promise<void>;
  notice: (message: string) => void;
  apiKey: string;
};

const realDeps = (): UploadDeps => ({
  createUploadList,
  signUpload,
  prepareImage,
  putFile: (req, onProgress) => putFile(req, onProgress),
  notice: title => toast.add({ type: 'info', title }),
  apiKey: readSupabaseEnv()?.publishableKey ?? '',
});

export type PendingUpload = {
  key: string;
  name: string;
  /** 0~1 */
  progress: number;
  /** 실패한 까닭(있으면 멈춘 줄) */
  error: string | null;
  /** [다시 올리기] 가 되는가 — 종류 · 개수로 거른 파일은 아니다 */
  retryable: boolean;
};

const MESSAGES = {
  unsupported: '올릴 수 없는 파일입니다.',
  unreadable: '그림을 읽지 못했습니다. 다른 파일로 올려 주세요.',
  failed: '올리지 못했습니다. 다시 올려 주세요.',
  resized: '큰 그림을 줄여서 올렸습니다.',
  max: (n: number) => `${n}개까지 올릴 수 있습니다.`,
};

class UploadError extends Error {}

export const useFileUploads = ({
  menuKey,
  kinds,
  value,
  onChange,
  max,
  deps: givenDeps,
}: {
  menuKey: ContentMenu;
  /** 받는 종류 */
  kinds: readonly FileKind[];
  value: readonly FileItem[];
  onChange: (next: FileItem[]) => void;
  /** 모두 몇 개까지 */
  max?: number;
  deps?: UploadDeps;
}) => {
  const [deps] = useState(() => givenDeps ?? realDeps());
  const [pending, setPending] = useState<PendingUpload[]>([]);
  // 올리는 도중에도 마지막 목록에 붙이도록 — 바깥에서 바뀌면(순서 · 빼기) 따라간다
  const items = useRef<FileItem[]>([...value]);
  useEffect(() => {
    items.current = [...value];
  }, [value]);
  const files = useRef(new Map<string, File>());
  const active = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const listId = useRef<Promise<string> | null>(null);
  const seq = useRef(0);

  const patch = useCallback(
    (key: string, next: Partial<PendingUpload> | null) =>
      setPending(list =>
        next === null
          ? list.filter(p => p.key !== key)
          : list.map(p => (p.key === key ? { ...p, ...next } : p))
      ),
    []
  );

  const ensureList = useCallback(() => {
    listId.current ??= deps.createUploadList(menuKey).then(res => {
      if (res.ok && res.data) return res.data.listId;
      listId.current = null; // 다음 시도에 다시 만든다
      throw new UploadError(res.ok ? MESSAGES.failed : res.error.message);
    });
    return listId.current;
  }, [deps, menuKey]);

  /** 파일 한 개 — 줄였으면 true */
  const uploadOne = useCallback(
    async (key: string, file: File): Promise<boolean> => {
      const type = uploadTypeOf(file.type, file.name);
      if (!type) throw new UploadError(MESSAGES.unsupported);
      let blob: Blob = file;
      let mime = file.type;
      let size: { width: number | null; height: number | null } = { width: null, height: null };
      let resized = false;
      if (type.kind === 'IMAGE') {
        const prepared = await deps.prepareImage(file).catch(() => {
          throw new UploadError(MESSAGES.unreadable);
        });
        ({ blob, type: mime, resized } = prepared);
        size = { width: prepared.width, height: prepared.height };
      }
      const signed = await deps.signUpload({
        menuKey,
        listId: await ensureList(),
        type: mime,
        name: file.name,
        bytes: blob.size,
      });
      if (!signed.ok) throw new UploadError(signed.error.message);
      const target = signed.data;
      if (!target) throw new UploadError(MESSAGES.failed);
      await deps.putFile(
        { url: target.signedUrl, body: blob, contentType: target.contentType, apiKey: deps.apiKey },
        progress => patch(key, { progress })
      );
      items.current = [
        ...items.current,
        {
          path: target.path,
          kind: target.kind,
          ...size,
          bytes: blob.size,
          originalName: file.name,
          alt: null,
        },
      ];
      onChange(items.current);
      return resized;
    },
    [deps, ensureList, menuKey, onChange, patch]
  );

  /** 정한 파일들을 차례 뒤에 잇는다 — 다 끝나면 줄인 것이 있었는지 한 번 알린다 */
  const enqueue = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) return;
      chain.current = chain.current.then(async () => {
        let resized = false;
        for (const key of keys) {
          const file = files.current.get(key);
          if (!file) continue;
          try {
            resized = (await uploadOne(key, file)) || resized;
            files.current.delete(key);
            active.current -= 1;
            patch(key, null);
          } catch (e) {
            active.current -= 1;
            patch(key, { error: e instanceof UploadError ? e.message : MESSAGES.failed });
          }
        }
        if (resized) deps.notice(MESSAGES.resized);
      });
    },
    [deps, patch, uploadOne]
  );

  const add = useCallback(
    (picked: File[]) => {
      const rows: PendingUpload[] = [];
      const accepted: string[] = [];
      for (const file of picked) {
        seq.current += 1;
        const key = `u${seq.current}`;
        // 종류 · 개수는 고르는 자리에서 거른다(거른 파일은 개수에 넣지 않는다)
        const type = uploadTypeOf(file.type, file.name);
        const error =
          !type || !kinds.includes(type.kind)
            ? MESSAGES.unsupported
            : max !== undefined && items.current.length + active.current >= max
              ? MESSAGES.max(max)
              : null;
        rows.push({ key, name: file.name, progress: 0, error, retryable: !error });
        if (error) continue;
        files.current.set(key, file);
        active.current += 1;
        accepted.push(key);
      }
      setPending(list => [...list, ...rows]);
      enqueue(accepted);
    },
    [enqueue, kinds, max]
  );

  const retry = useCallback(
    (key: string) => {
      if (!files.current.has(key)) return;
      active.current += 1;
      patch(key, { error: null, progress: 0 });
      enqueue([key]);
    },
    [enqueue, patch]
  );

  const dismiss = useCallback(
    (key: string) => {
      files.current.delete(key);
      patch(key, null);
    },
    [patch]
  );

  return { pending, busy: pending.some(p => !p.error), add, retry, dismiss };
};
