// 단계로 나눈 등록 화면(새 사용자 · 새 그룹)의 단계 상태. 한 번에 한 단계만 열리고, 지나온 단계는 접혀 «끝냄» 이 된다.
// 끝낸 단계는 다시 열어 고칠 수 있고, 아직 닿지 않은 단계는 열지 않는다(앞 단계의 검사를 건너뛰지 않게).

export type StepState = 'open' | 'done' | 'later';

/** open = 열린 단계, reached = 가장 멀리 간 단계, count = 단계 수 */
export type Steps = { open: number; reached: number; count: number };

export const startSteps = (count: number): Steps => ({ open: 0, reached: 0, count });

export const stepState = (s: Steps, i: number): StepState =>
  i === s.open ? 'open' : i <= s.reached ? 'done' : 'later';

export const isLastStep = (s: Steps) => s.open === s.count - 1;

/** 끝낸 단계를 다시 연다 — 닿지 않은 단계면 그대로 */
export const openStep = (s: Steps, i: number): Steps =>
  i >= 0 && i <= s.reached ? { ...s, open: i } : s;

/** 다음 단계로 — 앞 단계를 고치러 돌아왔다면 가장 멀리 갔던 단계로 바로 간다 */
export const nextStep = (s: Steps): Steps => {
  const to = Math.min(s.count - 1, Math.max(s.open + 1, s.reached));
  return { ...s, open: to, reached: Math.max(s.reached, to) };
};

/** 오류가 난 칸들 중 가장 앞 단계(fieldSteps = 칸 이름 → 단계) — 그 단계를 열어 오류를 보인다. 모르는 칸뿐이면 null */
export const stepWithError = (
  fieldSteps: Readonly<Record<string, number>>,
  fields: readonly string[]
): number | null => {
  const steps = fields.flatMap(f => (Object.hasOwn(fieldSteps, f) ? [fieldSteps[f]] : []));
  return steps.length ? Math.min(...steps) : null;
};

/** 오류가 있는 칸 이름(TanStack Form 의 fieldMeta) — 검사에 걸린 칸이 있는 단계를 열 때 */
export const invalidFields = (
  fieldMeta: Readonly<Record<string, { errors: readonly unknown[] } | undefined>>
): string[] =>
  Object.entries(fieldMeta).flatMap(([name, meta]) => (meta && meta.errors.length ? [name] : []));

/**
 * 서버가 준 칸 오류를 이 화면의 칸으로 모은다(fieldSteps = 칸 이름 → 단계). 배열 칸의 «groupIds.0» 은 그 칸(groupIds)으로,
 * 화면에 없는 칸(«_» 등)은 버린다 — 없는 칸에 붙이면 고칠 길이 없어 다음 제출이 막힌다(그 문장은 알림으로 이미 보인다).
 * step = 오류가 난 칸이 있는 가장 앞 단계(없으면 null)
 */
export const routeServerErrors = (
  fieldSteps: Readonly<Record<string, number>>,
  serverFields: Readonly<Record<string, readonly string[]>> | undefined
): { fields: Record<string, string[]>; step: number | null } => {
  const fields: Record<string, string[]> = {};
  Object.entries(serverFields ?? {}).forEach(([path, messages]) => {
    const name = path.split('.')[0];
    if (Object.hasOwn(fieldSteps, name)) (fields[name] ??= []).push(...messages);
  });
  return { fields, step: stepWithError(fieldSteps, Object.keys(fields)) };
};
