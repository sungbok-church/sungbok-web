import { formatAdminTime, formatShortTime } from '@/domains/admin/lib/adminTime';

/**
 * 상세 맨 아래 한 줄 — «수정 11-20 20:57 · 홍길동». 등록은 마우스를 올리면(title) 보이고, 모든 기록은 «변경 이력» 에 있다.
 * 이름은 이력을 볼 수 있을 때만 보인다.
 */
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
}) => {
  // 요청마다 지금 시각 기준(서버 컴포넌트) — 올해면 해를 뺀다
  const now = new Date().toISOString();
  return (
    <p
      className="text-muted-foreground m-0 text-xs"
      title={`등록 ${formatAdminTime(createdAt)}${createdBy ? ` · ${createdBy}` : ''}`}
    >
      수정 <time dateTime={updatedAt}>{formatShortTime(updatedAt, now)}</time>
      {updatedBy && ` · ${updatedBy}`}
    </p>
  );
};
