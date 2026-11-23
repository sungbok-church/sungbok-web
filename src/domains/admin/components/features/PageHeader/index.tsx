import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** 제목 옆 작은 표(상태 · «수정» 등) */
  badge?: ReactNode;
  /**
   * 상세에서만 — 대상의 값 한 줄(그룹 설명 · 이메일). 화면이 하는 일을 설명하는 문장은 달지 않는다
   * (.md/domains/admin.md «문구 규칙»).
   */
  description?: string;
  /** 오른쪽의 주요 버튼(새로 만들기 · 변경 이력 등) */
  actions?: ReactNode;
}

/** 화면 머리 — 제목(+ 작은 표) · 주요 버튼. 상세는 대상의 값 한 줄을 제목 아래에 둔다. */
export const PageHeader = ({ title, badge, description, actions }: Props) => (
  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {badge}
      </div>
      {description && (
        <p className="text-muted-foreground mt-1 mb-0 text-sm text-pretty break-words">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);
