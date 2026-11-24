'use client';

import { FormActions } from '@/domains/admin/components/features/AdminForm';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import type { ActionResult } from '@/domains/admin/lib/actionResult';
import { Button } from '@/shared/components/ui/button';
import { type ReactNode, useState } from 'react';

type Status = 'DRAFT' | 'PUBLISHED';

/**
 * 콘텐츠 등록 · 수정 화면의 아래 막대(설계 6.10 — 콘텐츠 5종 공용).
 * 새 글 · 임시저장 글: [취소] · [미리보기] · [임시저장] · [공개]. 공개된 글: [취소] · [미리보기] · [임시저장으로 돌리기](확인 창) · [저장].
 * [공개] · [저장] 은 제출 단추가 아니다 — 칸에서 Enter 를 칠 때 브라우저가 첫 제출 단추를 눌러 공개되지 않게(FormActions onSubmitClick).
 * 저장 가능 조건은 폼이 정한다(canSave — 올리는 중이 아니고, 공개된 글은 바뀐 것이 있을 때).
 */
export const ContentFormActions = ({
  current,
  submitting,
  canSave,
  busy,
  cancelHref,
  preview,
  onSubmitAs,
  onUnpublish,
}: {
  /** 지금 상태(새 글은 DRAFT) */
  current: Status;
  submitting: boolean;
  canSave: boolean;
  /** 파일을 올리는 중 — 미리보기 · 임시저장도 막는다 */
  busy: boolean;
  cancelHref: string;
  /** [미리보기] 단추(PreviewDialog) */
  preview?: ReactNode;
  onSubmitAs: (status: Status) => void;
  /** 공개된 글을 임시저장으로 돌리기 — 확인 창이 결과를 토스트로 알린다 */
  onUnpublish: () => Promise<ActionResult<unknown>>;
}) => {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const published = current === 'PUBLISHED';
  return (
    <>
      <FormActions
        submitting={submitting}
        canSubmit={canSave}
        cancelHref={cancelHref}
        submitLabel={published ? '저장' : '공개'}
        onSubmitClick={() => onSubmitAs('PUBLISHED')}
        extra={
          <>
            {preview}
            <Button
              type="button"
              variant="outline"
              disabled={submitting || busy}
              onClick={() => (published ? setConfirmUnpublish(true) : onSubmitAs('DRAFT'))}
            >
              {published ? '임시저장으로 돌리기' : '임시저장'}
            </Button>
          </>
        }
      />
      {published && (
        <ConfirmAction
          kind="unpublish"
          open={confirmUnpublish}
          onOpenChange={setConfirmUnpublish}
          onConfirm={onUnpublish}
        />
      )}
    </>
  );
};
