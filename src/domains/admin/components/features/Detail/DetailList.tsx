import type { ReactNode } from 'react';

export type DetailItem = { label: string; value: ReactNode };

/** 상세의 «항목 — 값» 목록 — 한 줄에 하나, 이름은 왼쪽 좁게(머리에 이미 있는 값은 넣지 않는다). */
export const DetailList = ({ items }: { items: DetailItem[] }) => (
  <dl className="m-0 grid grid-cols-[minmax(4.5rem,auto)_1fr] gap-x-6 gap-y-3 text-sm">
    {items.map(item => (
      <div key={item.label} className="col-span-2 grid grid-cols-subgrid items-baseline">
        <dt className="text-muted-foreground">{item.label}</dt>
        <dd className="m-0 min-w-0 break-words">{item.value}</dd>
      </div>
    ))}
  </dl>
);
