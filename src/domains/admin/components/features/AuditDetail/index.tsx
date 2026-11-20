'use client';

import type { NameLookup } from '@/domains/admin/api/auditFormat';
import { AuditEntry, type AuditItem } from '@/domains/admin/components/features/AuditEntry';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

/** 변경 이력 표의 «자세히» — 바뀐 칸 전부를 «이전 → 이후» 로 창에 보여 준다. */
export const AuditDetail = ({ item, names }: { item: AuditItem; names: NameLookup }) => (
  <Dialog>
    <DialogTrigger render={<Button variant="ghost" size="sm" />}>자세히</DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>변경 내용</DialogTitle>
        <DialogDescription>바뀐 칸마다 이전 값 → 이후 값</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto">
        <AuditEntry item={item} names={names} />
      </div>
    </DialogContent>
  </Dialog>
);
