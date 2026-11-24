'use client';

import { createUser } from '@/domains/admin/api/actions/userActions';
import {
  applyStepServerErrors,
  checkFields,
  clearSubmitErrors,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import {
  DepartmentField,
  departmentLabel,
} from '@/domains/admin/components/features/DepartmentField';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { StepCard } from '@/domains/admin/components/features/FormSteps';
import { TempPasswordDialog } from '@/domains/admin/components/features/TempPasswordDialog';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { useSaveShortcut, useUnsavedGuard } from '@/domains/admin/hooks/useFormGuards';
import type { Permission } from '@/domains/admin/lib/adminNav';
import {
  invalidFields,
  isLastStep,
  nextStep,
  openStep,
  startSteps,
  stepState,
  stepWithError,
} from '@/domains/admin/lib/formSteps';
import type { GroupOption } from '@/domains/admin/lib/groupScope';
import { userCreateSchema } from '@/domains/admin/lib/input/userInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import type { MatrixMenu } from '@/domains/admin/lib/permissionMatrix';
import {
  departmentNotes,
  menuDigest,
  mergeGrants,
  summaryLines,
} from '@/domains/admin/lib/permissionSummary';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Empty, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/shared/components/ui/field';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm, useStore } from '@tanstack/react-form';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { useMemo, useState } from 'react';
import { GrantSummary } from './GrantSummary';

type Values = { name: string; email: string; groupIds: string[]; department: string };

interface Props {
  /** 고를 그룹(groupChoices — «전체 관리» 가 아니면 내 그룹만, «전체 관리» 그룹은 없다) */
  groups: GroupOption[];
  /** «전체 관리» 가 아니다 — 내가 속한 그룹에만 넣는다고 알린다(설계 6.4 ②) */
  ownGroupsOnly: boolean;
  /** 로그인한 사람의 부서 범위(my_department_limit) — 있으면 담당 부서를 그 부서로 고정한다(설계 6.4 ③) */
  departmentLimit: string | null;
  /** 관리자 메뉴(권한 요약의 메뉴 이름 · 순서) */
  menus: MatrixMenu[];
  /** 그룹마다 주는 권한 — 읽을 수 없으면(«그룹 · 권한» 조회 권한이 없음) null: 카드에 그룹 설명을 보이고 권한 요약은 뺀다 */
  grants: Record<string, Permission[]> | null;
}

const LIST = '/admin/users';
const NAME_MAX = 50;
const STEPS = 3;
/** 칸 이름 → 단계(오류가 나면 그 단계를 연다) */
const STEP_OF: Record<string, number> = { name: 0, email: 0, groupIds: 1, department: 1 };
const FIELDS = Object.keys(STEP_OF);
const BASIC_FIELDS = ['name', 'email'] as const;

/**
 * 새 사용자 — 단계가 세로로 놓인 등록 화면(설계 6.10 · 11-1). 1 기본 정보 → 2 역할 → 3 확인 → [계정 만들기].
 * 끝낸 단계는 한 줄 요약으로 접히고, 그 머리를 누르면 다시 열린다. 역할 단계에서 고른 그룹이 주는 권한을 바로 보여 준다.
 * 만들면 임시 비밀번호 창에서 [상세로] · [계속 등록]. 비밀번호가 오가는 화면이라 쓰던 내용을 보관하지 않는다.
 */
export const UserCreateForm = ({
  groups,
  ownGroupsOnly,
  departmentLimit,
  menus,
  grants,
}: Props) => {
  const navigate = useAdminNavigate();
  const empty: Values = { name: '', email: '', groupIds: [], department: departmentLimit ?? '' };
  const [steps, setSteps] = useState(() => startSteps(STEPS));
  const [temp, setTemp] = useState<{ password: string; email: string; id: string } | null>(null);

  // 오류가 난 칸이 있는 가장 앞 단계를 연다(접힌 단계의 오류는 보이지 않는다)
  const showErrorStep = (fields: string[]) => {
    const step = stepWithError(STEP_OF, fields);
    if (step !== null) setSteps(s => openStep(s, step));
  };

  const form = useForm({
    defaultValues: empty,
    validators: { onSubmit: zodFormValidator(userCreateSchema) },
    onSubmitInvalid: ({ formApi }) => showErrorStep(invalidFields(formApi.state.fieldMeta)),
    onSubmit: async ({ value, formApi }) => {
      const result = await createUser({
        ...value,
        department: departmentLimit ?? value.department,
      });
      notifyResult(result);
      // 이메일 중복 등 — 그 칸에도 표시하고, 그 칸이 있는 단계를 연다
      const step = applyStepServerErrors(result, formApi, STEP_OF);
      if (step !== null) setSteps(s => openStep(s, step));
      if (!result.ok) return;
      // 폼은 비우지 않는다 — 창 뒤에 만든 내용이 그대로 보이고, 창이 떠 있는 동안은 나가기 경고를 끈다
      if (result.data)
        setTemp({ password: result.data.tempPassword, email: value.email, id: result.data.id });
    },
  });

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);

  // 그룹마다 카드에 보일 한 줄 — 권한을 읽을 수 없으면 그룹 설명
  const digests = useMemo(
    () =>
      new Map(
        groups.map(g => [
          g.id,
          grants
            ? menuDigest(mergeGrants(menus, [grants[g.id] ?? []])) || '권한 없음'
            : (g.description ?? ''),
        ])
      ),
    [groups, grants, menus]
  );
  // 고른 그룹이 주는 권한을 합친 것(권한을 읽을 수 없으면 빈 목록)
  const granted = useMemo(
    () =>
      grants
        ? mergeGrants(
            menus,
            values.groupIds.map(id => grants[id] ?? [])
          )
        : [],
    [grants, menus, values.groupIds]
  );

  const picked = groups.filter(g => values.groupIds.includes(g.id));
  // 담당 부서는 늘 묻는다 — 권한 범위(«다음세대 부서» · «사용자») 말고도, 그 부서 담당자가 이 사람을 관리하는지가 이것으로 정해진다
  const department = departmentLimit ?? values.department;
  const lines = summaryLines(granted, departmentNotes(department && departmentLabel(department)));

  // 다른 단계로 갈 때 — 기본 정보를 떠나면 먼저 검사한다(틀린 칸에 오류, 고쳐진 칸은 지운다)
  const leaveTo = (move: typeof nextStep) => {
    if (steps.open === 0 && !checkFields(form, userCreateSchema, BASIC_FIELDS)) return;
    setSteps(move);
  };
  // 열린 단계의 주 버튼(다음 · 계정 만들기) — Enter · Ctrl/⌘+S 도 이것. 낼 때는 지난번 서버 오류를 지우고 다시 본다
  const primary = () => {
    if (!isLastStep(steps)) {
      leaveTo(nextStep);
      return;
    }
    clearSubmitErrors(form, FIELDS);
    void form.handleSubmit();
  };

  useUnsavedGuard(dirty && temp === null);
  useSaveShortcut(primary);

  const cancel = (
    <Button variant="ghost" nativeButton={false} render={<Link href={LIST} />}>
      취소
    </Button>
  );
  const next = (
    <Button type="button" onClick={primary}>
      다음
    </Button>
  );
  const stepProps = (i: number) => ({
    state: stepState(steps, i),
    onOpen: () => leaveTo(s => openStep(s, i)),
  });

  return (
    <>
      <form
        noValidate
        className="flex max-w-2xl flex-col gap-3"
        onSubmit={e => {
          e.preventDefault();
          primary();
        }}
      >
        <StepCard
          n={1}
          title="기본 정보"
          {...stepProps(0)}
          summary={`${values.name} · ${values.email}`}
          actions={
            <>
              {cancel}
              {next}
            </>
          }
        >
          <FieldGroup>
            <form.Field name="name">
              {field => (
                <TextField field={field} id="user-name" label="이름" required max={NAME_MAX} />
              )}
            </form.Field>
            <form.Field name="email">
              {field => (
                <TextField
                  field={field}
                  id="user-email"
                  label="이메일"
                  required
                  type="email"
                  autoComplete="off"
                />
              )}
            </form.Field>
          </FieldGroup>
        </StepCard>

        <StepCard
          n={2}
          title="역할"
          {...stepProps(1)}
          // 왜 다른 그룹이 안 보이는지 — 고를 수 있는 범위가 좁을 때만
          description={ownGroupsOnly ? '내가 속한 그룹에만 넣을 수 있습니다.' : undefined}
          summary={[
            picked.map(g => g.name).join(' · ') || '그룹 없음',
            department && departmentLabel(department),
          ]
            .filter(Boolean)
            .join(' · ')}
          actions={
            <>
              {cancel}
              {next}
            </>
          }
        >
          <FieldGroup>
            <form.Field name="groupIds">
              {field => (
                <FieldSet>
                  <FieldLegend variant="label" className="sr-only">
                    그룹
                  </FieldLegend>
                  {groups.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>넣을 수 있는 그룹이 없습니다</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <FieldGroup data-slot="checkbox-group">
                      {groups.map(g => (
                        <FieldLabel key={g.id} htmlFor={`group-${g.id}`}>
                          <Field orientation="horizontal">
                            <Checkbox
                              id={`group-${g.id}`}
                              checked={field.state.value.includes(g.id)}
                              onCheckedChange={on =>
                                field.handleChange(
                                  on
                                    ? [...field.state.value, g.id]
                                    : field.state.value.filter(id => id !== g.id)
                                )
                              }
                            />
                            <FieldContent>
                              <FieldTitle>{g.name}</FieldTitle>
                              {digests.get(g.id) && (
                                <FieldDescription>{digests.get(g.id)}</FieldDescription>
                              )}
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      ))}
                    </FieldGroup>
                  )}
                  <FieldError errors={field.state.meta.errors} />
                </FieldSet>
              )}
            </form.Field>
            <form.Field name="department">
              {field => (
                <DepartmentField
                  id="user-department"
                  value={field.state.value}
                  limit={departmentLimit}
                  onChange={field.handleChange}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            {grants && (
              <Field>
                <FieldTitle>이 사람이 갖게 될 권한</FieldTitle>
                <GrantSummary lines={lines} picked={picked.length > 0} />
              </Field>
            )}
          </FieldGroup>
        </StepCard>

        <StepCard
          n={3}
          title="확인"
          final
          {...stepProps(2)}
          actions={
            <>
              {cancel}
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner data-icon="inline-start" />}
                계정 만들기
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <DetailList
              items={[
                { label: '이름', value: values.name },
                { label: '이메일', value: values.email },
                { label: '그룹', value: picked.map(g => g.name).join(' · ') || '없음' },
                { label: '담당 부서', value: departmentLabel(department) },
              ]}
            />
            {grants && (
              <div className="flex flex-col gap-2">
                <p className="m-0 text-sm font-medium">이 사람이 갖게 될 권한</p>
                <GrantSummary lines={lines} picked={picked.length > 0} />
              </div>
            )}
          </div>
        </StepCard>
      </form>

      <TempPasswordDialog
        password={temp?.password ?? null}
        email={temp?.email ?? ''}
        onClose={() => {
          const id = temp?.id;
          setTemp(null);
          if (id) navigate(`${LIST}/${id}`);
        }}
        onContinue={() => {
          setTemp(null);
          form.reset(empty);
          setSteps(startSteps(STEPS));
        }}
      />
    </>
  );
};
