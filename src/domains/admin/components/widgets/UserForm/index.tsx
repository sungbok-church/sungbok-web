'use client';

import { notifyResult } from '@/domains/admin/lib/notify';
import {
  applySetChanges,
  changedFields,
  type SetChanges,
  setChanges,
} from '@/domains/admin/lib/draftChanges';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import { updateUser } from '@/domains/admin/api/actions/userActions';
import type { GroupOption } from '@/domains/admin/lib/groupScope';
import { userUpdateSchema } from '@/domains/admin/lib/input/userInput';
import {
  applyServerErrors,
  DraftNotice,
  FormActions,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Empty, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/ui/field';
import { useForm, useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { DepartmentField } from '@/domains/admin/components/features/DepartmentField';

export type UserFormValues = {
  name: string;
  email: string;
  groupIds: string[];
  department: string;
  isActive: boolean;
};

interface Props {
  /** 고를 그룹(groupChoices) — 잠긴 그룹(대상이 이미 속한 «전체 관리»)은 체크된 채 그대로 둔다 */
  groups: GroupOption[];
  /** «전체 관리» 가 아니다 — 내가 속한 그룹에만 넣고 뺀다고 알린다(설계 6.4 ②) */
  ownGroupsOnly?: boolean;
  initial: UserFormValues;
  /** 사용자 id 와 열었을 때의 updated_at(동시 수정 막기) */
  editing: { id: string; updatedAt: string };
  /** 로그인한 관리자 — 임시저장을 사람별로 둔다 */
  userId: string;
  /** 로그인한 사람의 부서 범위(my_department_limit) — 있으면 담당 부서를 그 부서로 고정해 보여 준다(설계 6.4 ③) */
  departmentLimit?: string | null;
}

type UserDraft = { fields?: Partial<Omit<UserFormValues, 'groupIds'>>; groups?: SetChanges };
const withoutGroups = (values: UserFormValues) => {
  const rest: Partial<UserFormValues> = { ...values };
  delete rest.groupIds;
  return rest as Omit<UserFormValues, 'groupIds'>;
};

const LIST = '/admin/users';
const NAME_MAX = 50;

/**
 * 사용자 수정 폼(설계 6.10 «화면 흐름 표준 › 등록 · 수정») — 넓은 화면은 두 카드(기본 정보 · 그룹)를 나란히,
 * 칸 아래 도움말은 실수를 막는 것만(부서 고정 · «전체 관리» 잠금 · 내 그룹만),
 * 아래 고정 막대에 [취소] · [저장]. 사용 여부 · 비밀번호 초기화는 상세 화면에서 한다.
 * 등록은 단계로 나눈 화면이 따로 있다(UserCreateForm).
 */
export const UserForm = ({
  groups,
  ownGroupsOnly = false,
  initial,
  editing,
  userId,
  departmentLimit,
}: Props) => {
  const navigate = useAdminNavigate();
  // 화면을 열었을 때의 그룹 목록 — 열 때 한 번만 기억한다. 페이지 데이터가 새로 와도(router.refresh 등) 바뀌지 않아야
  // 그 사이 다른 사람이 바꾼 그룹을 «충돌» 로 알아챈다(새 값으로 바뀌면 남의 변경을 덮어쓴다)
  const [seenGroupIds] = useState(initial.groupIds);

  const form = useForm({
    defaultValues: initial,
    validators: {
      onSubmit: zodFormValidator(
        userUpdateSchema.omit({ id: true, updatedAt: true, seenGroupIds: true })
      ),
    },
    onSubmit: async ({ value, formApi }) => {
      // 화면을 열었을 때의 그룹 목록도 보낸다 — 그 뒤 다른 사람이 그룹을 바꿨으면 저장하지 않는다
      const result = await updateUser({
        ...value,
        id: editing.id,
        updatedAt: editing.updatedAt,
        seenGroupIds,
      });
      notifyResult(result);
      applyServerErrors(result, serverFieldError(formApi));
      if (result.ok) {
        draft.clear();
        formApi.reset(value);
        // 상세는 요청 때 그리는 화면이라 이동하면 새로 읽는다 — router.refresh 를 또 부르지 않는다
        navigate(`${LIST}/${editing.id}`);
      }
    },
  });

  const dirty = useStore(form.store, s => s.isDirty);
  const values = useStore(form.store, s => s.values);
  // 임시저장 — «내가 바꾼 것» 만 담는다(바꾼 칸 + 그룹에서 넣은 것 · 뺀 것, draftChanges). «다른 사람이 먼저
  // 고쳤습니다» 로 새로고침한 뒤 불러오면 새 화면 위에 내 변경만 얹는다(그 사이 다른 사람이 바꾼 것은 그대로).
  const [seenValues] = useState(initial);
  const draft = useFormDraft<UserDraft>({
    userId,
    formKey: `users:${editing.id}`,
    values: {
      fields: changedFields(withoutGroups(seenValues), withoutGroups(values)),
      groups: setChanges(seenGroupIds, values.groupIds),
    },
    dirty,
    enabled: true,
  });
  useUnsavedGuard(dirty);
  useSaveShortcut(() => void form.handleSubmit());

  return (
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
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {draft.available && (
                <DraftNotice
                  onDiscard={draft.discard}
                  onRestore={() =>
                    draft.restore(saved => {
                      const fields = saved.fields ?? {};
                      (Object.keys(fields) as (keyof typeof fields)[]).forEach(k =>
                        form.setFieldValue(k, fields[k] as never)
                      );
                      // 지금 고를 수 있는 그룹만 — 잠긴 «전체 관리» · 이제 고를 수 없는 그룹의 옛 변경은 버린다(저장마다 막히지 않게)
                      if (saved.groups)
                        form.setFieldValue('groupIds', [
                          ...applySetChanges(
                            initial.groupIds,
                            saved.groups,
                            groups.filter(g => !g.locked).map(g => g.id)
                          ),
                        ]);
                    })
                  }
                />
              )}
              <form.Field name="name">
                {field => (
                  <TextField field={field} id="user-name" label="이름" required max={NAME_MAX} />
                )}
              </form.Field>
              <form.Field name="email">
                {field => (
                  <TextField field={field} id="user-email" label="이메일" type="email" disabled />
                )}
              </form.Field>
              <form.Field name="department">
                {field => (
                  <DepartmentField
                    id="user-department"
                    value={field.state.value}
                    limit={departmentLimit ?? null}
                    onChange={field.handleChange}
                    errors={field.state.meta.errors}
                  />
                )}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>그룹</CardTitle>
            {/* 왜 다른 그룹이 안 보이는지 — 고를 수 있는 범위가 좁을 때만 */}
            {ownGroupsOnly && (
              <CardDescription>내가 속한 그룹에만 넣고 뺄 수 있습니다.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form.Field name="groupIds">
              {field => (
                <Field>
                  {groups.length === 0 && (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>넣을 수 있는 그룹이 없습니다</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groups.map(g => (
                      <FieldLabel key={g.id} htmlFor={`group-${g.id}`}>
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`group-${g.id}`}
                            checked={field.state.value.includes(g.id)}
                            disabled={g.locked}
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
                            {/* 그룹 설명(값)은 있을 때만, 잠긴 «전체 관리» 는 왜 못 바꾸는지 */}
                            {(g.locked || g.description) && (
                              <FieldDescription>
                                {g.locked
                                  ? '«전체 관리» 소속은 화면에서 바꿀 수 없습니다.'
                                  : g.description}
                              </FieldDescription>
                            )}
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
            cancelHref={`${LIST}/${editing.id}`}
            submitLabel="저장"
          />
        )}
      </form.Subscribe>
    </form>
  );
};
