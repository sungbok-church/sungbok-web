'use client';

import {
  ADMIN_PREVIEW_PATH,
  type PreviewPayload,
  PREVIEW_READY,
  PREVIEW_VALUES,
  PREVIEW_WIDTHS,
  readPreviewMessage,
} from '@/domains/admin/lib/preview';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { EyeIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

type Width = (typeof PREVIEW_WIDTHS)[number]['key'];

/**
 * 콘텐츠 [미리보기](설계 6.10 — 사용자 결정 2026-11-20) — 화면 전체를 덮는 창에 공개 화면 모양을 그린다. 위쪽 막대에서
 * PC · 태블릿 · 휴대폰 폭을 바꾸면 틀(iframe)의 폭이 바뀌어 실제 기기처럼 배치가 바뀐다.
 * 저장하지 않은 지금 값을 틀에 보낸다(postMessage, 같은 출처) — 서버에 아무것도 남기지 않는다. 칸을 고치면 다시 보낸다.
 */
export const PreviewDialog = ({
  payload,
  disabled,
}: {
  /** 메뉴와 저장 전 값 */
  payload: PreviewPayload;
  disabled?: boolean;
}) => {
  const { menu } = payload;
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<Width>('pc');
  const frame = useRef<HTMLIFrameElement>(null);

  const send = useEffectEvent(() =>
    frame.current?.contentWindow?.postMessage(
      { type: PREVIEW_VALUES, ...payload },
      window.location.origin
    )
  );

  // 틀이 준비됐다고 알리면 지금 값을 보낸다(틀을 새로 열 때마다)
  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (readPreviewMessage(event, window.location.origin)?.type === PREVIEW_READY) send();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open]);

  // 열린 채로 값이 바뀌면 다시 보낸다 — 부모가 그릴 때마다 새 객체를 넘기므로 내용(글자)으로 비교한다
  const content = JSON.stringify(payload);
  useEffect(() => {
    if (open) send();
  }, [open, content]);

  const px = PREVIEW_WIDTHS.find(w => w.key === width)?.width ?? 1280;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} />}>
        <EyeIcon data-icon="inline-start" />
        미리보기
      </DialogTrigger>
      <DialogContent className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none">
        <div className="flex items-center gap-2 border-b py-2 pr-12 pl-4">
          <DialogTitle>미리보기</DialogTitle>
          <div className="mx-auto flex gap-1" role="group" aria-label="화면 폭">
            {PREVIEW_WIDTHS.map(w => (
              <Button
                key={w.key}
                type="button"
                size="sm"
                variant={w.key === width ? 'secondary' : 'ghost'}
                aria-pressed={w.key === width}
                onClick={() => setWidth(w.key)}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>
        {/* 가운데 두기는 mx-auto — justify-center 면 틀이 칸보다 넓을 때(휴대폰에서 PC 폭) 왼쪽이 스크롤 밖으로 잘린다 */}
        <div className="bg-muted flex min-h-0 flex-1 overflow-auto">
          <iframe
            ref={frame}
            title="미리보기 화면"
            src={`${ADMIN_PREVIEW_PATH}${menu}`}
            className="bg-background mx-auto h-full shrink-0 border-x"
            style={{ width: px }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
