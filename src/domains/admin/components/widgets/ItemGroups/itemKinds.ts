// 분류 관리 · 코드 관리 화면의 다른 점(문구 · 영문 값 칸). 나머지 모양은 두 화면이 같다(ItemGroupsScreen · ItemCreateForm).
export const ITEM_KINDS = {
  categories: {
    title: '분류 관리',
    noun: '분류',
    groupsTitle: '묶음',
    groupsLabel: '분류 묶음',
    /** 영문 값 칸 — 공개 주소의 거르기 값 */
    field: 'slug',
    fieldLabel: '영문 이름',
    /** 칸 아래 한 줄 — 나중에 바꿀 수 없다는 것(실수를 막는다). 쓰는 글자는 틀리면 오류가 알린다 */
    fieldHint: '나중에 바꿀 수 없습니다.',
    placeholder: '예: church-event',
  },
  codes: {
    title: '코드 관리',
    noun: '코드',
    groupsTitle: '코드 묶음',
    groupsLabel: '코드 묶음',
    /** 영문 값 칸 — 프로그램이 쓰는 값 */
    field: 'code',
    fieldLabel: '코드 값',
    fieldHint: '나중에 바꿀 수 없습니다.',
    placeholder: '예: ELDER',
  },
} as const;

export type ItemKind = keyof typeof ITEM_KINDS;
