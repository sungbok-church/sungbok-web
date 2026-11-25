import { describe, expect, it } from 'vitest';

import { siteMenuLabelProblem } from './siteMenuLimits';

const top = (defaultLabel: string, o: { label?: string | null; isActive?: boolean } = {}) => ({
  defaultLabel,
  label: o.label ?? null,
  isActive: o.isActive ?? true,
});
// 지금 홈페이지 대메뉴 기본 이름(합 24자)
const OTHERS = [top('예배'), top('다음세대'), top('교회소식'), top('자료실'), top('찾아오시는 길')];

describe('siteMenuLabelProblem — 홈페이지 메뉴 이름 한도(위쪽 메뉴가 로고와 한 줄)', () => {
  it('하위 메뉴는 20자까지', () => {
    expect(
      siteMenuLabelProblem({ ...top('연혁', { label: '가'.repeat(20) }), isTop: false }, [])
    ).toBeNull();
    expect(
      siteMenuLabelProblem({ ...top('연혁', { label: '가'.repeat(21) }), isTop: false }, [])
    ).toBe('하위 메뉴 이름은 20자까지입니다.');
  });

  it('대메뉴는 한 칸 8자까지', () => {
    expect(
      siteMenuLabelProblem(
        { ...top('교회소개', { label: '아홉글자대메뉴다요' }), isTop: true },
        OTHERS
      )
    ).toBe('대메뉴 이름은 8자까지입니다.');
  });

  it('켜진 대메뉴 이름을 모두 합쳐 28자까지 — 꺼진 대메뉴는 세지 않는다', () => {
    // 기본 합 24자 → 교회소개(4)를 8자로 바꾸면 28자: 된다
    expect(
      siteMenuLabelProblem(
        { ...top('교회소개', { label: '우리교회소개하기' }), isTop: true },
        OTHERS
      )
    ).toBeNull();
    // 다른 대메뉴도 늘어나 있으면 넘는다
    const longer = [...OTHERS.slice(0, 4), top('찾아오시는 길', { label: '오시는 길 안내' })];
    expect(
      siteMenuLabelProblem(
        { ...top('교회소개', { label: '우리교회소개하기' }), isTop: true },
        longer
      )
    ).toBe('켜진 대메뉴 이름을 모두 합쳐 28자까지입니다(지금 29자).');
    // 넘는 대메뉴가 꺼져 있으면 괜찮다
    const off = [
      ...OTHERS.slice(0, 4),
      top('찾아오시는 길', { label: '오시는 길 안내', isActive: false }),
    ];
    expect(
      siteMenuLabelProblem({ ...top('교회소개', { label: '우리교회소개하기' }), isTop: true }, off)
    ).toBeNull();
  });

  it('이미 넘은 상태(앞 판 · 동시에 고침)에서는 줄이는 저장은 된다 — 늘리는 저장만 막는다', () => {
    const many = [
      top('예배', { label: '예배와말씀나눔' }),
      top('다음세대', { label: '다음세대와가정' }),
      ...OTHERS.slice(2),
    ];
    // 지금 합 = 교회소개(8) + 7 + 7 + 4 + 3 + 7 = 36 → 교회소개를 4자로 줄여도 32 지만 줄였으니 된다
    expect(
      siteMenuLabelProblem(
        { ...top('교회소개', { label: '교회' }), isTop: true },
        many,
        top('교회소개', { label: '우리교회소개하기' })
      )
    ).toBeNull();
    // 같은 상태에서 늘리면 막는다
    expect(
      siteMenuLabelProblem(
        { ...top('교회소개', { label: '우리교회소개하기' }), isTop: true },
        many,
        top('교회소개', { label: '교회' })
      )
    ).toMatch(/28자까지/);
  });

  it('이름을 비우면 기본 이름으로 센다', () => {
    expect(siteMenuLabelProblem({ ...top('교회소개'), isTop: true }, OTHERS)).toBeNull();
  });
});
