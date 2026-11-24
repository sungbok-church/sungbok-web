'use client';

import { createGroup } from '@/domains/admin/api/actions/groupActions';
import {
  applyStepServerErrors,
  checkFields,
  clearSubmitErrors,
  DraftNotice,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { Stepper } from '@/domains/admin/components/features/FormSteps';
import { PermissionMatrix } from '@/domains/admin/components/widgets/PermissionMatrix';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import {
  applySetChanges,
  changedFields,
  type SetChanges,
  setChanges,
} from '@/domains/admin/lib/draftChanges';
import { isLastStep, nextStep, openStep, startSteps } from '@/domains/admin/lib/formSteps';
import { groupCreateSchema } from '@/domains/admin/lib/input/groupInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import {
  keysToPermissions,
  type MatrixRow,
  toggleCells,
} from '@/domains/admin/lib/permissionMatrix';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardFooter } from '@/shared/components/ui/card';
import { FieldGroup } from '@/shared/components/ui/field';
import { Spinner } from '@/shared/components/ui/spinner';
import { useForm, useStore } from '@tanstack/react-form';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { useState } from 'react';

type Values = { name: string; description: string };
type GroupDraft = { fields?: Partial<Values>; perms?: SetChanges };

interface Props {
  userId: string;
  /** 체크 없는 권한 표(loadGroupMatrix) */
  matrix: MatrixRow[];
}

const LIST = '/admin/groups';
const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;
const STEPS = ['이름 · 설명', '메뉴 권한'] as const;
/** 칸 이름 → 단계(서버 오류가 나면 그 단계를 연다). permissions 는 폼 칸이 아니라 권한 표 — 단계만 연다 */
const STEP_OF: Record<string, number> = { name: 0, description: 0, permissions: 1 };
const BASIC_FIELDS = ['name', 'description'] as const;
const EMPTY: Values = { name: '', description: '' };
const NONE: ReadonlySet<string> = new Set();

/**
 * 새 그룹 — 두 단계(설계 6.10 «등록»): 1 이름 · 설명 → 2 메뉴 권한 표(PermissionMatrix — 줄 · 기능 칸 한꺼번에, 조회 함께 켜기).
 * «전체 관리» 만 여는 화면이다(페이지가 404 로 막고 DB 가 다시 막는다). 만들면 상세로 간다.
 * 쓰던 내용은 임시 보관한다(이름 · 설명 · 고른 권한).
 */
export const GroupCreateForm = ({ userId, matrix }: Props) => {
  const navigate = useAdminNavigate();
  const [steps, setSteps] = useState(() => startSteps(STEPS.length));
  const [keys, setKeys] = useState<ReadonlySet<string>>(NONE);

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: zodFormValidator(groupCreateSchema) },
    onSubmitInvalid: () => setSteps(s => openStep(s, 0)),
    onSubmit: async ({ value, formApi }) => {
      const created = await createGroup({ ...value, permissions: keysToPermissions(keys) });
      notifyResult(created);
      if (!created.ok || !created.data) {
        // 서버 검사에서 틀린 칸 — 그 칸에도 표시하고, 그 칸이 있는 단계를 연다
        const step = applyStepServerErrors(created, formApi, STEP_OF);
        if (step !== null) setSteps(s => openStep(s, step));
        return;
      }
      draft.clear();
      formApi.reset(value);
      setKeys(NONE);
      // 상세는 요청 때 그리는 화면이라 이동하면 새로 읽는다 — router.refresh 를 또 부르지 않는다.
      navigate(`${LIST}/${created.data.id}`);
    },
  });

  const values = useStore(form.store, s => s.values);
  const fieldsDirty = useStore(form.store, s => s.isDirty);
  const submitting = useStore(form.store, s => s.isSubmitting);
  const dirty = fieldsDirty || keys.size > 0;
  const draft = useFormDraft<GroupDraft>({
    userId,
    formKey: 'groups:new',
    values: { fields: changedFields(EMPTY, values), perms: setChanges(NONE, keys) },
    dirty,
    enabled: true,
  });
  useUnsavedGuard(dirty);

  // 주 버튼(다음 · 그룹 만들기) — Enter · Ctrl/⌘+S 도 이것. 다음은 이름 · 설명만 먼저 검사하고(틀린 칸에 오류, 고쳐진 칸은 지운다),
  // 낼 때는 지난번 서버 오류를 지우고 다시 본다
  const primary = () => {
    if (!isLastStep(steps)) {
      if (checkFields(form, groupCreateSchema, BASIC_FIELDS)) setSteps(nextStep);
      return;
    }
    clearSubmitErrors(form, BASIC_FIELDS);
    void form.handleSubmit();
  };
  useSaveShortcut(primary);

  const first = steps.open === 0;
  return (
    <form
      noValidate
      className="flex max-w-4xl flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        primary();
      }}
    >
      <Stepper steps={STEPS} current={steps.open} />
      <Card>
        {/* 단계 이름은 위 단계 표시가 알린다 — 카드에 제목 · 설명을 또 달지 않는다 */}
        <CardContent>
          {first ? (
            <FieldGroup>
              {draft.available && (
                <DraftNotice
                  onDiscard={draft.discard}
                  onRestore={() =>
                    draft.restore(saved => {
                      const fields = saved.fields ?? {};
                      (['name', 'description'] as const).forEach(k => {
                        if (fields[k] !== undefined) form.setFieldValue(k, fields[k]);
                      });
                      // 지금 표에 있는 칸만 — 없어진 메뉴 · 기능은 버린다
                      if (saved.perms)
                        setKeys(
                          toggleCells(matrix, NONE, [...applySetChanges(NONE, saved.perms)], true)
                        );
                    })
                  }
                />
              )}
              <form.Field name="name">
                {field => (
                  <TextField
                    field={field}
                    id="group-name"
                    label="그룹 이름"
                    required
                    max={NAME_MAX}
                    placeholder="예: 찬양팀 담당"
                  />
                )}
              </form.Field>
              <form.Field name="description">
                {field => (
                  <TextField
                    field={field}
                    id="group-description"
                    label="설명"
                    max={DESCRIPTION_MAX}
                    multiline
                  />
                )}
              </form.Field>
            </FieldGroup>
          ) : (
            <PermissionMatrix
              rows={matrix}
              checked={keys}
              onToggle={(toggled, on) => setKeys(prev => toggleCells(matrix, prev, toggled, on))}
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          {first ? (
            <Button variant="ghost" nativeButton={false} render={<Link href={LIST} />}>
              취소
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setSteps(s => openStep(s, 0))}>
              <ArrowLeftIcon data-icon="inline-start" />
              이전
            </Button>
          )}
          {first ? (
            <Button type="button" onClick={primary}>
              다음
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              그룹 만들기
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
};
