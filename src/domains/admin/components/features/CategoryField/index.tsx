'use client';

import { createCategory } from '@/domains/admin/api/actions/itemActions';
import { RequiredMark } from '@/domains/admin/components/features/AdminForm';
import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

/**
 * 분류 고르기(콘텐츠 등록 · 수정) — 그 메뉴의 분류 묶음에서. 분류 관리의 등록 권한이 있으면 옆의 [새 분류] 로 그 자리에서
 * 더한다(설계 6.10 «분류 · 묶음 바로 추가»). 더하면 화면을 다시 읽고(router.refresh) 새 분류를 골라 둔다.
 */
export const CategoryField = ({
  id,
  groupKey,
  options,
  value,
  onChange,
  canAdd,
  errors,
}: {
  id: string;
  groupKey: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  canAdd: boolean;
  errors?: ComponentProps<typeof FieldError>['errors'];
}) => {
  const invalid = (errors?.length ?? 0) > 0 || undefined;
  const router = useRouter();
  const { pending, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  // 더한 분류의 이름 — 다시 읽은 선택지에 나타나면 골라 둔다
  const added = useRef<string | null>(null);

  useEffect(() => {
    if (!added.current) return;
    const found = options.find(o => o.label === added.current);
    if (found) {
      added.current = null;
      onChange(found.value);
    }
  }, [options, onChange]);

  const add = () =>
    run(
      () => createCategory({ groupKey, slug, label }),
      result => {
        if (!result.ok) return;
        added.current = label.trim();
        setOpen(false);
        setLabel('');
        setSlug('');
        router.refresh();
      }
    );

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>
        분류 <RequiredMark />
      </FieldLabel>
      <div className="flex gap-2">
        <Select
          items={options}
          value={value || null}
          onValueChange={next => onChange(String(next ?? ''))}
        >
          <SelectTrigger id={id} aria-invalid={invalid} className="w-full sm:w-56">
            <SelectValue placeholder="분류" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            <SelectGroup>
              {options.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {canAdd && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" />}>
              <PlusIcon data-icon="inline-start" />새 분류
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 분류</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${id}-new-label`}>이름</FieldLabel>
                  <Input
                    id={`${id}-new-label`}
                    value={label}
                    maxLength={50}
                    onChange={e => setLabel(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-new-slug`}>영문 이름</FieldLabel>
                  <Input
                    id={`${id}-new-slug`}
                    value={slug}
                    maxLength={50}
                    placeholder="church-news"
                    onChange={e => setSlug(e.target.value)}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  disabled={pending || !label.trim() || !slug.trim()}
                  onClick={add}
                >
                  {pending && <Spinner data-icon="inline-start" />}
                  더하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <FieldError errors={errors} />
    </Field>
  );
};
