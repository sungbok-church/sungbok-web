'use client';

import { DEPARTMENTS } from '@/domains/admin/lib/input/userInput';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { ComponentProps } from 'react';

const ALL_DEPARTMENTS = '';
const ITEMS = [{ value: ALL_DEPARTMENTS, label: '모든 부서' }, ...DEPARTMENTS];

/** 부서 코드의 이름(빈 값 = 모든 부서) */
export const departmentLabel = (value: string) =>
  ITEMS.find(d => d.value === value)?.label ?? value;

/**
 * 담당 부서 고르기(사용자 등록 · 수정) — 빈 값이 «모든 부서». 로그인한 사람에게 부서 범위가 있으면(limit) 그 부서로 고정한다
 * (설계 6.4 ③ — createUser · DB 가 다시 막는다).
 */
export const DepartmentField = ({
  id,
  value,
  limit,
  onChange,
  errors,
}: {
  id: string;
  value: string;
  /** my_department_limit — 있으면 그 부서로 고정 */
  limit: string | null;
  onChange: (value: string) => void;
  errors?: ComponentProps<typeof FieldError>['errors'];
}) => {
  const invalid = (errors?.length ?? 0) > 0 || undefined;
  return (
    <Field data-invalid={invalid} data-disabled={Boolean(limit) || undefined}>
      <FieldLabel htmlFor={id}>담당 부서</FieldLabel>
      <Select
        items={ITEMS}
        value={limit ?? value}
        disabled={Boolean(limit)}
        onValueChange={next => onChange(String(next ?? ALL_DEPARTMENTS))}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {ITEMS.map(d => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {/* 고정된 까닭만 적는다(실수를 막는 말) — 부서가 하는 일은 «갖게 될 권한» 요약이 보여 준다 */}
      {limit && <FieldDescription>내 담당 부서로만 정할 수 있습니다.</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  );
};
