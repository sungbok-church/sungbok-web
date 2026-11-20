import type { ReactNode } from 'react';

export type DetailItem = {
  label: string;
  value: ReactNode;
  /** 두 칸을 다 쓰는 긴 값 */ wide?: boolean;
};

/** 상세의 «항목 — 값» 목록. 넓은 화면은 두 칸. */
export const DetailList = ({ items }: { items: DetailItem[] }) => (
  <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
    {items.map(item => (
      <div key={item.label} className={item.wide ? 'sm:col-span-2' : undefined}>
        <dt className="text-muted-foreground text-sm">{item.label}</dt>
        <dd className="m-0 mt-1 text-sm font-medium break-words">{item.value}</dd>
      </div>
    ))}
  </dl>
);
