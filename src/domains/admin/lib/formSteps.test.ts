import { describe, expect, it } from 'vitest';

import {
  invalidFields,
  isLastStep,
  nextStep,
  openStep,
  routeServerErrors,
  startSteps,
  stepState,
  stepWithError,
} from './formSteps';

describe('formSteps — 단계로 나눈 등록 화면', () => {
  it('처음에는 첫 단계만 열리고 나머지는 아직이다', () => {
    const s = startSteps(3);
    expect([0, 1, 2].map(i => stepState(s, i))).toEqual(['open', 'later', 'later']);
    expect(isLastStep(s)).toBe(false);
  });

  it('다음으로 가면 지난 단계는 끝낸 단계(접힘)가 된다', () => {
    const s = nextStep(startSteps(3));
    expect([0, 1, 2].map(i => stepState(s, i))).toEqual(['done', 'open', 'later']);
    const last = nextStep(s);
    expect([0, 1, 2].map(i => stepState(last, i))).toEqual(['done', 'done', 'open']);
    expect(isLastStep(last)).toBe(true);
  });

  it('마지막 단계에서 다음은 그대로다', () => {
    const last = nextStep(nextStep(startSteps(2)));
    expect(last).toEqual({ open: 1, reached: 1, count: 2 });
  });

  it('끝낸 단계는 다시 연다 — 아직 닿지 않은 단계는 열지 않는다', () => {
    const s = nextStep(startSteps(3));
    expect(openStep(s, 0)).toEqual({ open: 0, reached: 1, count: 3 });
    expect(openStep(s, 2)).toBe(s);
    expect(openStep(s, -1)).toBe(s);
  });

  it('앞 단계를 고친 뒤 다음은 가장 멀리 갔던 단계로 바로 간다', () => {
    const reopened = openStep(nextStep(nextStep(startSteps(3))), 0);
    expect(stepState(reopened, 2)).toBe('done');
    expect(nextStep(reopened).open).toBe(2);
  });

  it('오류가 난 칸들 중 가장 앞 단계 — 모르는 칸뿐이면 null', () => {
    const fields = { name: 0, email: 0, groupIds: 1, department: 1 };
    expect(stepWithError(fields, ['department', 'email'])).toBe(0);
    expect(stepWithError(fields, ['groupIds'])).toBe(1);
    expect(stepWithError(fields, ['other'])).toBeNull();
    expect(stepWithError(fields, [])).toBeNull();
  });

  it('오류가 있는 칸 이름 — 아직 없는 칸 · 오류 없는 칸은 뺀다', () => {
    expect(
      invalidFields({
        name: { errors: ['이름을 넣어 주세요.'] },
        email: { errors: [] },
        groupIds: undefined,
      })
    ).toEqual(['name']);
  });

  it('서버 칸 오류는 이 화면의 칸으로 모으고 다시 열 단계를 고른다', () => {
    const fields = { name: 0, email: 0, groupIds: 1, department: 1 };
    // 배열 칸의 «groupIds.0» 은 그 칸(groupIds)으로, 화면에 없는 칸(«_» 등)은 버린다
    expect(
      routeServerErrors(fields, {
        'groupIds.0': ['고를 수 없는 그룹입니다.'],
        'groupIds.1': ['또 다른 문장'],
        department: ['부서를 고를 수 없습니다.'],
        _: ['전체 오류'],
      })
    ).toEqual({
      fields: {
        groupIds: ['고를 수 없는 그룹입니다.', '또 다른 문장'],
        department: ['부서를 고를 수 없습니다.'],
      },
      step: 1,
    });
    expect(routeServerErrors(fields, { email: ['이미 있는 이메일입니다.'] }).step).toBe(0);
    expect(routeServerErrors(fields, undefined)).toEqual({ fields: {}, step: null });
    expect(routeServerErrors(fields, { other: ['x'] })).toEqual({ fields: {}, step: null });
    expect(routeServerErrors(fields, { toString: ['x'] })).toEqual({ fields: {}, step: null });
  });
});
