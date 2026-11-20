'use client';

import { notifyResult } from '@/domains/admin/api/notify';
import { useSaveShortcut, useUnsavedGuard } from '@/domains/admin/api/useFormGuards';
import { createUser, updateUser } from '@/domains/admin/api/userActions';
import { DEPARTMENTS, userCreateSchema, userUpdateSchema } from '@/domains/admin/api/userInput';
import {
  applyServerErrors,
  CharCount,
  FormActions,
  RequiredMark,
  serverFieldError,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { TempPasswordDialog } from '@/domains/admin/components/features/TempPasswordDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useForm, useStore } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type GroupOption = { id: string; name: string; isSystem: boolean; description: string | null };

export type UserFormValues = {
  name: string;
  email: string;
  groupIds: string[];
  department: string;
  isActive: boolean;
};

interface Props {
  mode: 'create' | 'edit';
  groups: GroupOption[];
  initial: UserFormValues;
  /** 수정일 때 — 사용자 id 와 열었을 때의 updated_at(동시 수정 막기) */
  editing?: { id: string; updatedAt: string };
}

const LIST = '/admin/users';
const ALL_DEPARTMENTS = '';
const NAME_MAX = 50;
const EMPTY: UserFormValues = { name: '', email: '', groupIds: [], department: '', isActive: true };

/**
 * 사용자 등록 · 수정 폼(설계 6.10 «화면 흐름 표준 › 등록 · 수정») — 넓은 화면은 두 카드(기본 정보 · 그룹)를 나란히,
 * 아래 고정 막대에 [취소] · [저장]. 사용 여부 · 비밀번호 초기화는 상세 화면에서 한다.
 * 비밀번호가 오가는 화면이라 쓰던 내용을 보관하지 않는다. 등록하면 임시 비밀번호 창에서 [상세로] · [계속 등록].
 */
export const UserForm = ({ mode, groups, initial, editing }: Props) => {
  const router = useRouter();
  const [temp, setTemp] = useState<{ password: string; email: string; id: string } | null>(null);

  const form = useForm({
    defaultValues: initial,
    validators: {
      onSubmit: zodFormValidator(
        mode === 'create' ? userCreateSchema : userUpdateSchema.omit({ id: true, updatedAt: true })
      ),
    },
    onSubmit: async ({ value, formApi }) => {
      if (mode === 'create') {
        const result = await createUser(value);
        notifyResult(result);
        applyServerErrors(result, serverFieldError(formApi)); // 이메일 중복 등 — 그 칸에도 표시
        if (result.ok && result.data) {
          formApi.reset(value);
          setTemp({ password: result.data.tempPassword, email: value.email, id: result.data.id });
        }
        return;
      }
      if (!editing) return;
      const result = await updateUser({ ...value, id: editing.id, updatedAt: editing.updatedAt });
      notifyResult(result);
      applyServerErrors(result, serverFieldError(formApi));
      if (result.ok) {
        formApi.reset(value);
        router.push(`${LIST}/${editing.id}`);
        router.refresh();
      }
    },
  });

  const dirty = useStore(form.store, s => s.isDirty);
  useUnsavedGuard(dirty && temp === null);
  useSaveShortcut(() => void form.handleSubmit());

  return (
    <>
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={e => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>이메일이 로그인 아이디입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <form.Field name="name">
                  {field => {
                    const invalid = !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid || undefined}>
                        <div className="flex items-center gap-1">
                          <FieldLabel htmlFor="user-name">
                            이름 <RequiredMark />
                          </FieldLabel>
                          <CharCount value={field.state.value} max={NAME_MAX} />
                        </div>
                        <Input
                          id="user-name"
                          value={field.state.value}
                          maxLength={NAME_MAX}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          aria-invalid={invalid || undefined}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    );
                  }}
                </form.Field>
                <form.Field name="email">
                  {field => {
                    const invalid = !field.state.meta.isValid;
                    return (
                      <Field
                        data-invalid={invalid || undefined}
                        data-disabled={mode === 'edit' || undefined}
                      >
                        <FieldLabel htmlFor="user-email">
                          이메일 {mode === 'create' && <RequiredMark />}
                        </FieldLabel>
                        <Input
                          id="user-email"
                          type="email"
                          autoComplete="off"
                          value={field.state.value}
                          disabled={mode === 'edit'}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          aria-invalid={invalid || undefined}
                        />
                        {mode === 'edit' && (
                          <FieldDescription>이메일은 바꿀 수 없습니다.</FieldDescription>
                        )}
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    );
                  }}
                </form.Field>
                <form.Field name="department">
                  {field => (
                    <Field>
                      <FieldLabel htmlFor="user-department">다음세대 부서 범위</FieldLabel>
                      <Select
                        items={[{ value: ALL_DEPARTMENTS, label: '모든 부서' }, ...DEPARTMENTS]}
                        value={field.state.value}
                        onValueChange={value =>
                          field.handleChange(String(value ?? ALL_DEPARTMENTS))
                        }
                      >
                        <SelectTrigger id="user-department" className="w-full sm:w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false} align="start">
                          <SelectGroup>
                            <SelectItem value={ALL_DEPARTMENTS}>모든 부서</SelectItem>
                            {DEPARTMENTS.map(d => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        정하면 «다음세대 부서» 메뉴에서 그 부서만 고칩니다.
                      </FieldDescription>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>그룹</CardTitle>
              <CardDescription>
                속한 그룹의 권한을 합쳐 갖습니다. 내가 갖지 않은 권한이 있는 그룹에는 넣을 수
                없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form.Field name="groupIds">
                {field => (
                  <Field>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groups.map(g => (
                        <FieldLabel key={g.id} htmlFor={`group-${g.id}`}>
                          <Field orientation="horizontal">
                            <Checkbox
                              id={`group-${g.id}`}
                              checked={field.state.value.includes(g.id)}
                              onCheckedChange={next =>
                                field.handleChange(
                                  next
                                    ? [...field.state.value, g.id]
                                    : field.state.value.filter(id => id !== g.id)
                                )
                              }
                            />
                            <FieldContent>
                              <span className="font-medium">{g.name}</span>
                              <FieldDescription>
                                {g.isSystem
                                  ? '모든 메뉴 · 모든 기능'
                                  : (g.description ?? '설명 없음')}
                              </FieldDescription>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </div>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            </CardContent>
          </Card>
        </div>

        <form.Subscribe selector={s => s.isSubmitting}>
          {submitting => (
            <FormActions
              submitting={submitting}
              cancelHref={editing ? `${LIST}/${editing.id}` : LIST}
              submitLabel={mode === 'create' ? '계정 만들기' : '저장'}
            />
          )}
        </form.Subscribe>
      </form>

      <TempPasswordDialog
        password={temp?.password ?? null}
        email={temp?.email ?? ''}
        onClose={() => {
          const id = temp?.id;
          setTemp(null);
          if (id) router.push(`${LIST}/${id}`);
        }}
        onContinue={() => {
          setTemp(null);
          form.reset(EMPTY);
        }}
      />
    </>
  );
};
