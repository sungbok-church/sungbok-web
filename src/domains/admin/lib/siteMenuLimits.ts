// 홈페이지 메뉴 이름 한도(설계 6.5 · ADR 0026) — 위쪽 메뉴(대메뉴)는 로고와 한 줄에 놓이고(넓은 화면 1024 에서 쓸 수 있는 폭이
// 화면의 절반), 하위는 펼침 열 · 페이지 제목이 된다. 한 칸 한도는 DB check · 입력칸도 막고, 합계는 서버(updateMenu)만 본다.

export const SITE_TOP_MAX = 8;
export const SITE_CHILD_MAX = 20;
/** 켜진 대메뉴 이름의 합 — 기본 이름 합이 24자 */
export const SITE_TOPS_TOTAL_MAX = 28;

type MenuName = { label: string | null; defaultLabel: string; isActive: boolean };

const shown = (m: MenuName) => m.label || m.defaultLabel;

/**
 * 고친 뒤의 이 메뉴(target)와 다른 대메뉴들로 본 문제 한 줄 — 없으면 null. before(고치기 전 이 메뉴)를 주면 합계가 이미 넘은
 * 상태(앞 판 · 동시에 고침)에서도 줄이는 저장은 된다 — 늘리는 저장만 막는다.
 */
export const siteMenuLabelProblem = (
  target: MenuName & { isTop: boolean },
  otherTops: readonly MenuName[],
  before?: MenuName
): string | null => {
  const name = shown(target);
  if (!target.isTop) {
    return name.length > SITE_CHILD_MAX ? `하위 메뉴 이름은 ${SITE_CHILD_MAX}자까지입니다.` : null;
  }
  if (name.length > SITE_TOP_MAX) return `대메뉴 이름은 ${SITE_TOP_MAX}자까지입니다.`;
  const sum = (first: MenuName) =>
    [first, ...otherTops].filter(m => m.isActive).reduce((n, m) => n + shown(m).length, 0);
  const total = sum(target);
  return total > SITE_TOPS_TOTAL_MAX && (!before || total > sum(before))
    ? `켜진 대메뉴 이름을 모두 합쳐 ${SITE_TOPS_TOTAL_MAX}자까지입니다(지금 ${total}자).`
    : null;
};
