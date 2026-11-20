import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** 이 화면에서 하는 일을 한 줄로 */
  description?: string;
  /** 오른쪽의 주요 버튼(새로 만들기 · 변경 이력 등) */
  actions?: ReactNode;
}

/** 화면 머리 — 제목 · 한 줄 설명 · 주요 버튼(스타터의 PageContainer + Heading 과 같은 모양). */
export const PageHeader = ({ title, description, actions }: Props) => (
  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
    <div className="min-w-0">
      <h1 className="m-0 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1 mb-0 text-sm text-pretty">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);
