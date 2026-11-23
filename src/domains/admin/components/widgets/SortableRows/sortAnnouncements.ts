// 끌어서 순서 바꾸기의 화면 낭독기 문장(dnd-kit 의 기본 문장은 영어다). 자리는 끌기 시작할 때의 순서(ids)로 센다 —
// 정렬 목록에서 «위에 있는 줄» 의 처음 자리가 곧 놓일 자리다.
import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';

export const SORT_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    '순서를 옮기려면 스페이스나 엔터를 누릅니다. 위아래 화살표로 옮기고, 스페이스나 엔터로 내려놓고, Esc 로 취소합니다.',
};

export const sortAnnouncements = (
  ids: readonly string[],
  nameOf: (id: string) => string
): Announcements => {
  const name = (id: UniqueIdentifier) => `«${nameOf(String(id))}» 항목`;
  const place = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) =>
      `${name(active.id)}을 집었습니다. 지금 ${place(active.id)}번째(${ids.length}개 중)입니다.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${name(active.id)}: ${place(over.id)}번째 자리입니다.`
        : `${name(active.id)}: 놓을 수 있는 자리 밖입니다.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${name(active.id)}을 ${place(over.id)}번째에 놓았습니다.`
        : `${name(active.id)}을 제자리에 두었습니다.`,
    onDragCancel: ({ active }) =>
      `옮기기를 취소했습니다. ${name(active.id)}은 ${place(active.id)}번째 그대로입니다.`,
  };
};
