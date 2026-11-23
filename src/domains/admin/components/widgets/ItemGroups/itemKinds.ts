// 분류 관리 · 코드 관리 화면의 다른 점(문구 · 영문 값 칸). 나머지 모양은 두 화면이 같다(ItemGroupsScreen · ItemCreateForm).
export const ITEM_KINDS = {
  categories: {
    title: '분류 관리',
    noun: '분류',
    groupsTitle: '묶음',
    groupsLabel: '분류 묶음',
    /** 오른쪽 카드 설명 — 코드는 묶음마다 설명이 있어 그것을 쓴다 */
    description:
      '글을 쓸 때 고르는 분류입니다. 끈 분류는 새 글에서 고를 수 없고, 이미 쓴 글에는 그대로 남습니다.',
    /** 영문 값 칸 — 공개 주소의 거르기 값 */
    field: 'slug',
    fieldLabel: '영문 이름',
    fieldHint: '공개 주소에 쓰입니다. 영문 소문자 · 숫자 · - (나중에 바꿀 수 없습니다)',
    placeholder: '예: church-event',
  },
  codes: {
    title: '코드 관리',
    noun: '코드',
    groupsTitle: '코드 묶음',
    groupsLabel: '코드 묶음',
    description: null,
    /** 영문 값 칸 — 프로그램이 쓰는 값 */
    field: 'code',
    fieldLabel: '코드 값',
    fieldHint: '영문 대문자 · 숫자 · _ (나중에 바꿀 수 없습니다)',
    placeholder: '예: ELDER',
  },
} as const;

export type ItemKind = keyof typeof ITEM_KINDS;
