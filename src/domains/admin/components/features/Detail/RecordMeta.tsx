import { formatAdminTime } from '@/domains/admin/api/adminTime';

/** 상세 머리 아래 한 줄 — 등록 · 수정한 사람과 시각(이름은 이력을 볼 수 있을 때만 보인다). */
export const RecordMeta = ({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
}: {
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}) => (
  <p className="text-muted-foreground m-0 text-xs">
    등록 {formatAdminTime(createdAt)}
    {createdBy && ` · ${createdBy}`}
    <span aria-hidden> | </span>
    수정 {formatAdminTime(updatedAt)}
    {updatedBy && ` · ${updatedBy}`}
  </p>
);
