'use client';

import { saveGroup } from '@/domains/admin/api/actions/groupActions';
import { groupCreateSchema } from '@/domains/admin/lib/input/groupInput';
import { notifyResult } from '@/domains/admin/lib/notify';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import {
  checkedKeys,
  keysToPermissions,
  type MatrixRow,
  toggleCells,
} from '@/domains/admin/lib/permissionMatrix';
import {
  applySetChanges,
  changedFields,
  type SetChanges,
  setChanges,
} from '@/domains/admin/lib/draftChanges';
import {
  useFormDraft,
  useSaveShortcut,
  useUnsavedGuard,
} from '@/domains/admin/hooks/useFormGuards';
import {
  applyServerErrors,
  DraftNotice,
  FormActions,
  serverFieldError,
  TextField,
  zodFormValidator,
} from '@/domains/admin/components/features/AdminForm';
import { PermissionMatrix } from '@/domains/admin/components/widgets/PermissionMatrix';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { FieldGroup } from '@/shared/components/ui/field';
import { useForm, useStore } from '@tanstack/react-form';
import { ShieldCheckIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

// 사용 여부(isActive)는 고치는 칸이 없다 — 끄고 켜기는 상세의 «더 보기» 에서만 한다(사용자와 같다).
// 저장(save_group)이 함께 받으므로 화면을 열었을 때의 값을 그대로 보낸다 — 그 사이 누가 껐으면 updatedAt 이 달라 «충돌» 로 막힌다.
type Values = { name: string; description: string; isActive: boolean };

interface Props {
  userId: string;
  initial: Values;
  editing: { id: string; updatedAt: string; isSystem: boolean };
  /** 권한 표 — 시스템 그룹(모든 권한)은 주지 않는다 */
  matrix?: MatrixRow[];
}

const LIST = '/admin/groups';
const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every(k => b.has(k));

/**
 * 그룹 수정(설계 6.10 «화면 흐름 표준 › 등록 · 수정») — 기본 정보와 «메뉴 × 기능» 권한을 한 번에 저장한다.
 * «전체 관리» 만 여는 화면이다(설계 6.4 — 페이지가 404 로 막고 DB 가 다시 막는다).
 * 이름 · 설명은 쓰던 내용을 임시 보관한다. 저장하면 상세로 간다. 등록은 단계로 나눈 화면이 따로 있다(GroupCreateForm).
 */
type GroupDraft = { fields?: Partial<Values>; perms?: SetChanges };

export const GroupForm = ({ userId, initial, editing, matrix }: Props) => {
  const navigate = useAdminNavigate();
  const initialKeys = useMemo(() => new Set(checkedKeys(matrix ?? [])), [matrix]);
  const [keys, setKeys] = useState<Set<string>>(initialKeys);
  // 화면을 열었을 때의 권한 표 — 열 때 한 번만 기억한다(페이지 데이터가 새로 와도 바뀌지 않아야 남의 변경을 «충돌» 로 알아챈다)
  const [seenKeys] = useState(initialKeys);
  const permsDirty = matrix !== undefined && !sameSet(keys, initialKeys);

  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: zodFormValidator(groupCreateSchema) },
    onSubmit: async ({ value }) => notifyResult(await save(value)),
  });

  // 그룹 정보와 권한 표를 한 번에 저장한다(한 트랜잭션) — 하나라도 막히면 아무것도 바뀌지 않는다.
  const save = async (value: Values) => {
    const saved = await saveGroup({
      ...value,
      id: editing.id,
      updatedAt: editing.updatedAt,
      // 권한 표가 있으면 지금 표와 화면을 열었을 때의 표를 함께 — 그 사이 바뀌었으면 저장하지 않는다.
      // 없으면(«전체 관리» 그룹) 보내지 않는다 — 권한은 그대로
      ...(matrix && {
        permissions: keysToPermissions(keys),
        seenPermissions: keysToPermissions(seenKeys),
      }),
    });
    if (!saved.ok) {
      applyServerErrors(saved, serverFieldError(form)); // 서버 검사에서 틀린 칸 — 그 칸에도 표시
      return saved;
    }
    draft.clear();
    form.reset(value);
    // 상세는 요청 때 그리는 화면이라 이동하면 새로 읽는다 — router.refresh 를 또 부르지 않는다.
    navigate(`${LIST}/${editing.id}`);
    return { ok: true as const, message: '저장했습니다.' };
  };

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  // 임시저장은 «내가 바꾼 것» 만 — 바꾼 칸과 권한 표에서 넣은 것 · 뺀 것(draftChanges). «다른 사람이 먼저 고쳤습니다» 로
  // 새로고침한 뒤 불러오면 새 화면 위에 내 변경만 얹는다(그 사이 다른 사람이 바꾼 칸 · 권한은 그대로 남는다).
  const [seenValues] = useState(initial);
  const draft = useFormDraft<GroupDraft>({
    userId,
    formKey: `groups:${editing.id}`,
    values: { fields: changedFields(seenValues, values), perms: setChanges(seenKeys, keys) },
    dirty: dirty || permsDirty,
    enabled: true,
  });
  useUnsavedGuard(dirty || permsDirty);
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
      <div className="grid items-start gap-6 xl:grid-cols-3">
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
                      // 예전 임시 보관에 남은 사용 여부는 버린다(이 화면에서 바꾸지 않는다)
                      (['name', 'description'] as const).forEach(k => {
                        if (fields[k] !== undefined) form.setFieldValue(k, fields[k]);
                      });
                      // 표가 있는 그룹만 — 지금 표에 내가 넣은 것 · 뺀 것만 얹는다
                      if (matrix && saved.perms) setKeys(applySetChanges(initialKeys, saved.perms));
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
                    description="어떤 일을 하는 그룹인지 적어 두면 사용자에게 그룹을 고를 때 도움이 됩니다."
                  />
                )}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>권한</CardTitle>
            <CardDescription>
              메뉴마다 이 그룹이 쓸 수 있는 기능을 고릅니다. 조회를 끄면 그 메뉴의 다른 기능도
              꺼집니다. «–» 는 그 메뉴에 없는 기능입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editing.isSystem ? (
              <Alert>
                <ShieldCheckIcon aria-hidden />
                <AlertDescription>
                  이 그룹은 모든 메뉴의 모든 기능을 가집니다. 끄거나 지울 수 없습니다.
                </AlertDescription>
              </Alert>
            ) : (
              matrix && (
                <PermissionMatrix
                  rows={matrix}
                  checked={keys}
                  onToggle={(toggled, on) =>
                    setKeys(prev => toggleCells(matrix, prev, toggled, on))
                  }
                />
              )
            )}
          </CardContent>
        </Card>
      </div>

      <form.Subscribe selector={s => s.isSubmitting}>
        {submitting => (
          <FormActions
            submitting={submitting}
            canSubmit={dirty || permsDirty}
            cancelHref={`${LIST}/${editing.id}`}
            submitLabel="저장"
          />
        )}
      </form.Subscribe>
    </form>
  );
};
