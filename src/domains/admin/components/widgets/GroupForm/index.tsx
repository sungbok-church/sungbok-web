'use client';

import { createGroup, saveGroup } from '@/domains/admin/api/groupActions';
import { groupCreateSchema } from '@/domains/admin/api/groupInput';
import { notifyResult } from '@/domains/admin/api/notify';
import {
  checkedKeys,
  keysToPermissions,
  type MatrixRow,
} from '@/domains/admin/api/permissionMatrix';
import { useFormDraft, useSaveShortcut, useUnsavedGuard } from '@/domains/admin/api/useFormGuards';
import {
  CharCount,
  DraftNotice,
  FormActions,
  RequiredMark,
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { useForm, useStore } from '@tanstack/react-form';
import { ShieldCheckIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Values = { name: string; description: string; isActive: boolean };

interface Props {
  userId: string;
  initial: Values;
  /** 수정일 때 */
  editing?: { id: string; updatedAt: string; isSystem: boolean };
  /** 권한 표 — 권한을 줄 수 있을 때(그룹 수정 권한)만. 시스템 그룹은 주지 않는다 */
  matrix?: MatrixRow[];
}

const LIST = '/admin/groups';
const NAME_MAX = 50;
const DESCRIPTION_MAX = 200;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every(k => b.has(k));

/**
 * 그룹 등록 · 수정(설계 6.10 «화면 흐름 표준 › 등록 · 수정») — 기본 정보와 «메뉴 × 기능» 권한을 한 번에 저장한다.
 * 이름 · 설명은 쓰던 내용을 임시 보관한다. 저장하면 상세로 간다.
 */
export const GroupForm = ({ userId, initial, editing, matrix }: Props) => {
  const router = useRouter();
  const initialKeys = useMemo(() => new Set(checkedKeys(matrix ?? [])), [matrix]);
  const [keys, setKeys] = useState<Set<string>>(initialKeys);
  // 화면을 열었을 때의 권한 표 — 열 때 한 번만 기억한다(페이지 데이터가 새로 와도 바뀌지 않아야 남의 변경을 «충돌» 로 알아챈다)
  const [seenKeys] = useState(initialKeys);
  const permsDirty = matrix !== undefined && !sameSet(keys, initialKeys);

  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: zodFormValidator(groupCreateSchema) },
    onSubmit: async ({ value, formApi }) => {
      // 그룹 정보와 권한 표를 한 번에 저장한다(한 트랜잭션) — 하나라도 막히면 아무것도 바뀌지 않는다
      let groupId = editing?.id;
      if (!editing) {
        const created = await createGroup({
          name: value.name,
          description: value.description,
          permissions: keysToPermissions(keys),
        });
        if (!created.ok || !created.data) return notifyResult(created);
        groupId = created.data.id;
      } else {
        const saved = await saveGroup({
          ...value,
          id: editing.id,
          updatedAt: editing.updatedAt,
          // 권한 표가 있으면(«전체 관리» 가 아니면) 지금 표와 화면을 열었을 때의 표를 함께 — 그 사이 바뀌었으면 저장하지 않는다
          ...(matrix && {
            permissions: keysToPermissions(keys),
            seenPermissions: keysToPermissions(seenKeys),
          }),
        });
        if (!saved.ok) return notifyResult(saved);
      }
      notifyResult({ ok: true, message: editing ? '저장했습니다.' : '그룹을 만들었습니다.' });
      draft.clear();
      formApi.reset(value);
      router.push(`${LIST}/${groupId}`);
      router.refresh();
    },
  });

  const values = useStore(form.store, s => s.values);
  const dirty = useStore(form.store, s => s.isDirty);
  const draft = useFormDraft({
    userId,
    formKey: editing ? `groups:${editing.id}` : 'groups:new',
    values,
    dirty,
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
                      const v = saved as Partial<Values>;
                      (Object.keys(initial) as (keyof Values)[]).forEach(k => {
                        if (v[k] !== undefined) form.setFieldValue(k, v[k] as never);
                      });
                    })
                  }
                />
              )}
              <form.Field name="name">
                {field => {
                  const invalid = !field.state.meta.isValid;
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <div className="flex items-center gap-1">
                        <FieldLabel htmlFor="group-name">
                          그룹 이름 <RequiredMark />
                        </FieldLabel>
                        <CharCount value={field.state.value} max={NAME_MAX} />
                      </div>
                      <Input
                        id="group-name"
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
              <form.Field name="description">
                {field => {
                  const invalid = !field.state.meta.isValid;
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <div className="flex items-center gap-1">
                        <FieldLabel htmlFor="group-description">설명</FieldLabel>
                        <CharCount value={field.state.value} max={DESCRIPTION_MAX} />
                      </div>
                      <Textarea
                        id="group-description"
                        value={field.state.value}
                        maxLength={DESCRIPTION_MAX}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                      <FieldDescription>
                        어떤 일을 하는 그룹인지 적어 두면 사용자에게 그룹을 고를 때 도움이 됩니다.
                      </FieldDescription>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
              {editing && !editing.isSystem && (
                <form.Field name="isActive">
                  {field => (
                    <Field orientation="horizontal">
                      <Switch
                        id="group-active"
                        checked={field.state.value}
                        onCheckedChange={checked => field.handleChange(checked)}
                      />
                      <FieldContent>
                        <FieldLabel htmlFor="group-active">사용 중</FieldLabel>
                        <FieldDescription>
                          끄면 이 그룹의 권한이 모든 구성원에게서 멈춥니다.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  )}
                </form.Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>권한</CardTitle>
            <CardDescription>
              메뉴마다 이 그룹이 쓸 수 있는 기능을 고릅니다. «–» 는 그 메뉴에 없는 기능, 흐린 칸은
              내가 갖지 않아 줄 수 없는 권한입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editing?.isSystem ? (
              <Alert>
                <ShieldCheckIcon aria-hidden />
                <AlertDescription>
                  이 그룹은 모든 메뉴의 모든 기능을 가집니다. 끄거나 지울 수 없습니다.
                </AlertDescription>
              </Alert>
            ) : matrix ? (
              <PermissionMatrix
                rows={matrix}
                checked={keys}
                onToggle={(key, on) =>
                  setKeys(prev => {
                    const next = new Set(prev);
                    if (on) next.add(key);
                    else next.delete(key);
                    return next;
                  })
                }
              />
            ) : (
              <p className="text-muted-foreground m-0 text-sm">
                권한은 그룹 수정 권한이 있는 사람이 정합니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <form.Subscribe selector={s => s.isSubmitting}>
        {submitting => (
          <FormActions
            submitting={submitting}
            canSubmit={!editing || dirty || permsDirty}
            cancelHref={editing ? `${LIST}/${editing.id}` : LIST}
            submitLabel={editing ? '저장' : '그룹 만들기'}
          />
        )}
      </form.Subscribe>
    </form>
  );
};
